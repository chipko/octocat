import { describe, it, expect } from 'vitest';
import { createPaymentProvider, getPaymentConfig, PaymentConfigurationError } from './paymentProvider';
import { MockPaymentProvider } from './mockPaymentProvider';

const card = {
  cardholderName: 'Mona Lisa Octocat',
  cardNumber: '4242424242424242',
  expMonth: 12,
  expYear: 2030,
  cvc: '123',
};

describe('getPaymentConfig', () => {
  it('defaults to the mock provider in USD', () => {
    expect(getPaymentConfig({})).toEqual({
      provider: 'mock',
      currency: 'USD',
      apiKey: undefined,
      production: false,
      allowMockInProduction: false,
    });
  });

  it('reads provider, currency and key from the environment', () => {
    expect(
      getPaymentConfig({ PAYMENT_PROVIDER: 'Stripe', PAYMENT_CURRENCY: 'eur', PAYMENT_API_KEY: 'sk_test_x' }),
    ).toMatchObject({ provider: 'stripe', currency: 'EUR', apiKey: 'sk_test_x' });
  });
});

describe('createPaymentProvider', () => {
  it('creates the mock provider', () => {
    expect(createPaymentProvider({ provider: 'mock', currency: 'USD' })).toBeInstanceOf(
      MockPaymentProvider,
    );
  });

  it('refuses the mock provider in production unless explicitly allowed', () => {
    expect(() =>
      createPaymentProvider(getPaymentConfig({ NODE_ENV: 'production' })),
    ).toThrow(PaymentConfigurationError);
    expect(
      createPaymentProvider(getPaymentConfig({ NODE_ENV: 'production', PAYMENT_ALLOW_MOCK: 'true' })),
    ).toBeInstanceOf(MockPaymentProvider);
  });

  it('requires an API key for real providers', () => {
    expect(() => createPaymentProvider({ provider: 'stripe', currency: 'USD' })).toThrow(
      'PAYMENT_API_KEY is required',
    );
  });

  it('rejects unknown providers', () => {
    expect(() =>
      createPaymentProvider({ provider: 'acme', currency: 'USD', apiKey: 'key' }),
    ).toThrow("unsupported payment provider 'acme'");
  });
});

describe('MockPaymentProvider', () => {
  const provider = new MockPaymentProvider();

  it('approves a standard test card', async () => {
    const result = await provider.charge({ amountCents: 1000, currency: 'USD', description: 'test', card });
    expect(result).toEqual({ status: 'succeeded', reference: expect.stringMatching(/^mock_/), last4: '4242' });
  });

  it('declines the decline test card', async () => {
    const result = await provider.charge({
      amountCents: 1000,
      currency: 'USD',
      description: 'test',
      card: { ...card, cardNumber: '4000000000000002' },
    });
    expect(result).toEqual({ status: 'declined', reason: 'Your card was declined.' });
  });
});
