/**
 * Checkout: charge the cart total, then convert the cart into an order
 */

import { Order } from '../models/order';
import { OrderDetail } from '../models/orderDetail';
import { CardDetails, PaymentProvider } from '../payments/paymentProvider';
import { getBranchesRepository } from '../repositories/branchesRepo';
import { getCartsRepository } from '../repositories/cartsRepo';
import { ConflictError, NotFoundError, PaymentDeclinedError } from '../utils/errors';

export interface CheckoutRequest {
  branchId: number;
  /** The total the customer was shown; the charge is refused if the cart no longer matches it */
  expectedTotal: number;
  card: CardDetails;
}

export interface CheckoutResult {
  order: Order;
  orderDetails: OrderDetail[];
  total: number;
  currency: string;
  payment: {
    provider: string;
    reference: string;
    last4: string;
  };
}

const toCents = (amount: number): number => Math.round(amount * 100);

export async function checkoutCart(
  cartId: number,
  request: CheckoutRequest,
  provider: PaymentProvider,
  currency: string,
): Promise<CheckoutResult> {
  const cartsRepo = await getCartsRepository();

  // Blocks a second concurrent checkout and edits to the cart until this one finishes
  await cartsRepo.claimForCheckout(cartId);

  try {
    const cart = await cartsRepo.findById(cartId);
    if (!cart) {
      throw new NotFoundError('Cart', cartId);
    }
    if (cart.items.length === 0) {
      throw new ConflictError('cart is empty');
    }
    if (toCents(cart.total) !== toCents(request.expectedTotal)) {
      throw new ConflictError('cart total has changed, please review your cart and try again');
    }

    const branchesRepo = await getBranchesRepository();
    if (!(await branchesRepo.exists(request.branchId))) {
      throw new NotFoundError('Branch', request.branchId);
    }

    const charge = await provider.charge({
      amountCents: toCents(cart.total),
      currency,
      description: `Octocat Supply cart ${cart.cartId}`,
      card: request.card,
    });
    if (charge.status === 'declined') {
      throw new PaymentDeclinedError(charge.reason);
    }

    const description = `Paid ${currency} ${cart.total.toFixed(2)} by card ending ${charge.last4} (ref ${charge.reference})`;
    let placed: { order: Order; orderDetails: OrderDetail[] };
    try {
      placed = await cartsRepo.convertToOrder(cart, request.branchId, description);
    } catch (error) {
      // Never keep the customer's money without an order
      try {
        await provider.refund(charge.reference);
      } catch (refundError) {
        console.error(`Refund failed for payment ${charge.reference}; manual follow-up required`, refundError);
      }
      throw error;
    }

    return {
      ...placed,
      total: cart.total,
      currency,
      payment: { provider: provider.name, reference: charge.reference, last4: charge.last4 },
    };
  } catch (error) {
    // Nothing was written (or the charge was refunded): let the customer edit or retry
    await cartsRepo.releaseCheckout(cartId);
    throw error;
  }
}
