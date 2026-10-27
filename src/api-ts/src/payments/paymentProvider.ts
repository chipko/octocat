/**
 * Payment provider abstraction. Card details pass through to the provider and are never
 * persisted or logged by the API; only the provider reference and last four digits are kept.
 */

import { DatabaseError } from '../utils/errors';
import { MockPaymentProvider } from './mockPaymentProvider';

export interface CardDetails {
  cardholderName: string;
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
}

export interface ChargeRequest {
  amountCents: number;
  currency: string;
  description: string;
  card: CardDetails;
}

export type ChargeResult =
  | { status: 'succeeded'; reference: string; last4: string }
  | { status: 'declined'; reason: string };

export interface PaymentProvider {
  readonly name: string;
  charge(request: ChargeRequest): Promise<ChargeResult>;
  /** Reverse a successful charge, used when the order can't be recorded after payment */
  refund(reference: string): Promise<void>;
}

export interface PaymentConfig {
  provider: string;
  currency: string;
  apiKey?: string;
  production?: boolean;
  allowMockInProduction?: boolean;
}

export class PaymentConfigurationError extends DatabaseError {
  constructor(message: string) {
    super(`Payments are not configured: ${message}`, 'PAYMENT_NOT_CONFIGURED', 503);
    this.name = 'PaymentConfigurationError';
  }
}

/**
 * Read payment configuration from the environment so keys never live in source
 */
export function getPaymentConfig(env: NodeJS.ProcessEnv = process.env): PaymentConfig {
  return {
    provider: (env.PAYMENT_PROVIDER || 'mock').toLowerCase(),
    currency: (env.PAYMENT_CURRENCY || 'USD').toUpperCase(),
    apiKey: env.PAYMENT_API_KEY,
    production: env.NODE_ENV === 'production',
    allowMockInProduction: env.PAYMENT_ALLOW_MOCK === 'true',
  };
}

export function createPaymentProvider(config: PaymentConfig = getPaymentConfig()): PaymentProvider {
  switch (config.provider) {
    case 'mock':
      // The mock approves any valid test card, so production must opt in explicitly (e.g. for a demo)
      if (config.production && !config.allowMockInProduction) {
        throw new PaymentConfigurationError(
          'the mock provider is disabled in production; set PAYMENT_PROVIDER (or PAYMENT_ALLOW_MOCK=true for demos)',
        );
      }
      return new MockPaymentProvider();
    default:
      // Real providers plug in here and must receive their key via PAYMENT_API_KEY
      if (!config.apiKey) {
        throw new PaymentConfigurationError(
          `PAYMENT_API_KEY is required for payment provider '${config.provider}'`,
        );
      }
      throw new PaymentConfigurationError(`unsupported payment provider '${config.provider}'`);
  }
}
