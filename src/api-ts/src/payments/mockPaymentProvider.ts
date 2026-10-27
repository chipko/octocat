import { randomUUID } from 'crypto';
import type { ChargeRequest, ChargeResult, PaymentProvider } from './paymentProvider';

/**
 * Deterministic provider for local development and tests, using the industry-standard
 * test card numbers: any valid card succeeds except the decline cards below.
 */
export const MOCK_DECLINE_CARDS: Record<string, string> = {
  '4000000000000002': 'Your card was declined.',
  '4000000000009995': 'Your card has insufficient funds.',
  '4000000000000069': 'Your card has expired.',
};

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const reason = MOCK_DECLINE_CARDS[request.card.cardNumber];
    if (reason) {
      return { status: 'declined', reason };
    }
    return {
      status: 'succeeded',
      reference: `mock_${randomUUID()}`,
      last4: request.card.cardNumber.slice(-4),
    };
  }

  async refund(_reference: string): Promise<void> {
    // Nothing was really charged
  }
}
