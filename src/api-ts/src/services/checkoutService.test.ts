import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkoutCart, CheckoutRequest } from './checkoutService';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { ChargeRequest, ChargeResult, PaymentProvider } from '../payments/paymentProvider';
import { getCartsRepository } from '../repositories/cartsRepo';
import { ConflictError } from '../utils/errors';

const request: CheckoutRequest = {
  branchId: 1,
  expectedTotal: 194.98,
  card: {
    cardholderName: 'Mona Lisa Octocat',
    cardNumber: '4242424242424242',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
  },
};

const succeeded: ChargeResult = { status: 'succeeded', reference: 'ref_123', last4: '4242' };

function stubProvider(charge: (req: ChargeRequest) => Promise<ChargeResult>) {
  return {
    name: 'stub',
    charge: vi.fn(charge),
    refund: vi.fn(async () => {}),
  } satisfies PaymentProvider;
}

async function countRows(table: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return row?.count ?? 0;
}

describe('checkoutCart', () => {
  let cartId: number;

  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    const db = await getDatabase();
    await db.run('INSERT INTO headquarters (headquarters_id, name) VALUES (?, ?)', [1, 'HQ One']);
    await db.run('INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)', [1, 1, 'Meowtown']);
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Supplier One']);
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 1, 'SmartFeeder One', 129.99, 'CAT-FEED-001', 'piece', 'feeder.png', 0.25],
    );

    const repo = await getCartsRepository();
    cartId = (await repo.create()).cartId;
    await repo.addItem(cartId, 1, 2);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('charges the cart total in cents and creates the order', async () => {
    const provider = stubProvider(async () => succeeded);

    const result = await checkoutCart(cartId, request, provider, 'USD');

    expect(provider.charge).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 19498, currency: 'USD' }),
    );
    expect(result.order.status).toBe('processing');
    expect(result.payment).toEqual({ provider: 'stub', reference: 'ref_123', last4: '4242' });
  });

  it('charges only once when two checkouts of the same cart overlap', async () => {
    let completeCharge: (result: ChargeResult) => void = () => {};
    const provider = stubProvider(
      () => new Promise<ChargeResult>((resolve) => (completeCharge = resolve)),
    );

    const first = checkoutCart(cartId, request, provider, 'USD');
    await vi.waitFor(() => expect(provider.charge).toHaveBeenCalledTimes(1));

    await expect(checkoutCart(cartId, request, provider, 'USD')).rejects.toThrow(ConflictError);

    completeCharge(succeeded);
    await expect(first).resolves.toMatchObject({ order: { branchId: 1 } });
    expect(provider.charge).toHaveBeenCalledTimes(1);
    expect(await countRows('orders')).toBe(1);
  });

  it('refunds the charge and keeps the cart when the order cannot be recorded', async () => {
    const provider = stubProvider(async () => {
      // The product disappears while the payment is in flight, so the order detail insert fails
      const db = await getDatabase();
      await db.run('DELETE FROM products WHERE product_id = 1');
      return succeeded;
    });

    await expect(checkoutCart(cartId, request, provider, 'USD')).rejects.toThrow();

    expect(provider.refund).toHaveBeenCalledWith('ref_123');
    expect(await countRows('orders')).toBe(0);
    expect(await countRows('order_details')).toBe(0);
    // The claim is released so the cart can be edited again
    const repo = await getCartsRepository();
    await expect(repo.removeItem(cartId, 1)).rejects.toThrow('Cart item for product');
  });

  it('releases the cart when the provider fails', async () => {
    const provider = stubProvider(async () => {
      throw new Error('provider timeout');
    });

    await expect(checkoutCart(cartId, request, provider, 'USD')).rejects.toThrow('provider timeout');

    expect(provider.refund).not.toHaveBeenCalled();
    const repo = await getCartsRepository();
    await expect(repo.updateItemQuantity(cartId, 1, 3)).resolves.toMatchObject({ itemCount: 3 });
  });
});
