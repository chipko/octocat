import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cartRouter from './cart';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

const payment = {
  cardholderName: 'Mona Lisa Octocat',
  cardNumber: '4242 4242 4242 4242',
  expMonth: 12,
  expYear: new Date().getFullYear() + 2,
  cvc: '123',
};

async function createCartWithItems(): Promise<number> {
  const { body } = await request(app).post('/carts');
  await request(app).post(`/carts/${body.cartId}/items`).send({ productId: 1, quantity: 2 });
  await request(app).post(`/carts/${body.cartId}/items`).send({ productId: 2, quantity: 1 });
  return body.cartId;
}

async function countRows(table: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);
  return row?.count ?? 0;
}

describe('Cart checkout API', () => {
  beforeEach(async () => {
    // Ensure a fresh in-memory database for each test
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    const db = await getDatabase();
    await db.run('INSERT INTO headquarters (headquarters_id, name) VALUES (?, ?)', [1, 'HQ One']);
    await db.run('INSERT INTO branches (branch_id, headquarters_id, name) VALUES (?, ?, ?)', [
      1,
      1,
      'Meowtown Branch',
    ]);
    await db.run('INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)', [1, 'Supplier One']);
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [1, 1, 'SmartFeeder One', 129.99, 'CAT-FEED-001', 'piece', 'feeder.png', 0.25],
    );
    await db.run(
      'INSERT INTO products (product_id, supplier_id, name, price, sku, unit, img_name, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [2, 1, 'CatFlix Portal', 89.99, 'CAT-ENT-003', 'piece', 'catflix.png', 0],
    );

    app = express();
    app.use(express.json());
    app.use('/carts', cartRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should convert a paid cart into an order', async () => {
    const cartId = await createCartWithItems();

    const response = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 284.97, payment });

    expect(response.status).toBe(201);
    expect(response.body.order).toMatchObject({
      orderId: expect.any(Number),
      branchId: 1,
      status: 'processing',
    });
    expect(response.body.order.description).toContain('card ending 4242');
    expect(response.body.orderDetails).toEqual([
      expect.objectContaining({ productId: 1, quantity: 2, unitPrice: 97.49 }),
      expect.objectContaining({ productId: 2, quantity: 1, unitPrice: 89.99 }),
    ]);
    expect(response.body.total).toBe(284.97);
    expect(response.body.payment).toEqual({
      provider: 'mock',
      reference: expect.stringMatching(/^mock_/),
      last4: '4242',
    });

    // The cart is consumed by the order
    const cartResponse = await request(app).get(`/carts/${cartId}`);
    expect(cartResponse.status).toBe(404);
  });

  it('should never store or return the full card number', async () => {
    const cartId = await createCartWithItems();
    const response = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 284.97, payment });

    expect(JSON.stringify(response.body)).not.toContain('4242424242424242');
    const db = await getDatabase();
    const order = await db.get<{ description: string }>('SELECT description FROM orders');
    expect(order?.description).not.toContain('4242424242424242');
  });

  it('should return 402 and leave the cart intact when payment is declined', async () => {
    const cartId = await createCartWithItems();

    const response = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 284.97, payment: { ...payment, cardNumber: '4000000000000002' } });

    expect(response.status).toBe(402);
    expect(response.body.error).toEqual({
      code: 'PAYMENT_DECLINED',
      message: 'Payment declined: Your card was declined.',
    });
    expect(await countRows('orders')).toBe(0);

    const cartResponse = await request(app).get(`/carts/${cartId}`);
    expect(cartResponse.body.itemCount).toBe(3);
  });

  it('should return 409 for an empty cart', async () => {
    const { body } = await request(app).post('/carts');
    const response = await request(app)
      .post(`/carts/${body.cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 284.97, payment });
    expect(response.status).toBe(409);
  });

  it('should not create a second order when the cart was already checked out', async () => {
    const cartId = await createCartWithItems();
    await request(app).post(`/carts/${cartId}/checkout`).send({ branchId: 1, expectedTotal: 284.97, payment });

    const response = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 284.97, payment });
    // The cart no longer exists once it has become an order
    expect(response.status).toBe(404);
    expect(await countRows('orders')).toBe(1);
  });

  it('should never reuse a checked-out cart ID for a new cart', async () => {
    const cartId = await createCartWithItems();
    await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 284.97, payment });

    const { body } = await request(app).post('/carts');
    expect(body.cartId).toBeGreaterThan(cartId);
    const edit = await request(app).post(`/carts/${cartId}/items`).send({ productId: 1, quantity: 1 });
    expect(edit.status).toBe(404);
  });

  it('should return 404 for an unknown branch without charging', async () => {
    const cartId = await createCartWithItems();
    const response = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 99, expectedTotal: 284.97, payment });
    expect(response.status).toBe(404);
    expect(await countRows('orders')).toBe(0);
  });

  it('should return 400 for invalid payment details', async () => {
    const cartId = await createCartWithItems();
    const response = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 284.97, payment: { ...payment, cardNumber: '1234' } });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when branchId is missing', async () => {
    const cartId = await createCartWithItems();
    const response = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ expectedTotal: 284.97, payment });
    expect(response.status).toBe(400);
  });

  it('should return 409 and not charge when the cart total changed since it was shown', async () => {
    const cartId = await createCartWithItems();
    const response = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 97.49, payment });
    expect(response.status).toBe(409);
    expect(await countRows('orders')).toBe(0);

    // The claim is released, so the customer can review and retry
    const retry = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 284.97, payment });
    expect(retry.status).toBe(201);
  });

  it('should return 400 when expectedTotal is missing', async () => {
    const cartId = await createCartWithItems();
    const response = await request(app).post(`/carts/${cartId}/checkout`).send({ branchId: 1, payment });
    expect(response.status).toBe(400);
  });

  it('should reject cart edits and a second checkout while a checkout is in progress', async () => {
    const cartId = await createCartWithItems();
    const db = await getDatabase();
    await db.run('UPDATE carts SET checkout_started_at = CURRENT_TIMESTAMP WHERE cart_id = ?', [cartId]);

    const edit = await request(app).put(`/carts/${cartId}/items/2`).send({ quantity: 5 });
    expect(edit.status).toBe(409);
    const checkout = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 284.97, payment });
    expect(checkout.status).toBe(409);
    expect(await countRows('orders')).toBe(0);
  });

  it('should treat a checkout claim older than five minutes as abandoned', async () => {
    const cartId = await createCartWithItems();
    const db = await getDatabase();
    await db.run(
      "UPDATE carts SET checkout_started_at = datetime('now', '-10 minutes') WHERE cart_id = ?",
      [cartId],
    );

    const response = await request(app)
      .post(`/carts/${cartId}/checkout`)
      .send({ branchId: 1, expectedTotal: 284.97, payment });
    expect(response.status).toBe(201);
  });
});
