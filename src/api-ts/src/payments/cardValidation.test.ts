import { describe, it, expect } from 'vitest';
import { parseCardDetails, passesLuhn } from './cardValidation';
import { ValidationError } from '../utils/errors';

const now = new Date(Date.UTC(2026, 9, 15)); // 15 Oct 2026

const validCard = {
  cardholderName: '  Mona Lisa Octocat ',
  cardNumber: '4242 4242 4242 4242',
  expMonth: 12,
  expYear: 2030,
  cvc: '123',
};

describe('passesLuhn', () => {
  it.each(['4242424242424242', '4000000000000002', '5555555555554444', '378282246310005'])(
    'accepts valid number %s',
    (digits) => {
      expect(passesLuhn(digits)).toBe(true);
    },
  );

  it('rejects a number with a bad checksum', () => {
    expect(passesLuhn('4242424242424241')).toBe(false);
  });
});

describe('parseCardDetails', () => {
  it('normalises a valid card', () => {
    expect(parseCardDetails(validCard, now)).toEqual({
      cardholderName: 'Mona Lisa Octocat',
      cardNumber: '4242424242424242',
      expMonth: 12,
      expYear: 2030,
      cvc: '123',
    });
  });

  it('accepts a card expiring at the end of the current month', () => {
    expect(() => parseCardDetails({ ...validCard, expMonth: 10, expYear: 2026 }, now)).not.toThrow();
  });

  it('still accepts the card late on its last day in US time zones (already next month in UTC)', () => {
    const lateOct31Pacific = new Date('2026-11-01T06:00:00Z'); // 23:00 PDT on 31 Oct
    expect(() =>
      parseCardDetails({ ...validCard, expMonth: 10, expYear: 2026 }, lateOct31Pacific),
    ).not.toThrow();
  });

  it('rejects the card once the expiry month has ended everywhere', () => {
    const nov1Afternoon = new Date('2026-11-01T13:00:00Z');
    expect(() => parseCardDetails({ ...validCard, expMonth: 10, expYear: 2026 }, nov1Afternoon)).toThrow(
      'card has expired',
    );
  });

  it('rejects a card that expired last month', () => {
    expect(() => parseCardDetails({ ...validCard, expMonth: 9, expYear: 2026 }, now)).toThrow(
      'card has expired',
    );
  });

  it.each([
    ['missing payment', undefined, 'payment details are required'],
    ['blank name', { ...validCard, cardholderName: '   ' }, 'cardholderName is required'],
    ['bad checksum', { ...validCard, cardNumber: '4242424242424241' }, 'cardNumber is invalid'],
    ['letters in number', { ...validCard, cardNumber: '4242abcd42424242' }, 'cardNumber is invalid'],
    ['too short', { ...validCard, cardNumber: '42424242' }, 'cardNumber is invalid'],
    ['month 13', { ...validCard, expMonth: 13 }, 'expMonth must be between 1 and 12'],
    ['string month', { ...validCard, expMonth: '12' }, 'expMonth must be between 1 and 12'],
    ['two-digit year', { ...validCard, expYear: 30 }, 'expYear must be a four-digit year'],
    ['short cvc', { ...validCard, cvc: '12' }, 'cvc must be 3 or 4 digits'],
    ['numeric cvc', { ...validCard, cvc: 123 }, 'cvc must be 3 or 4 digits'],
  ])('rejects %s', (_label, input, message) => {
    expect(() => parseCardDetails(input, now)).toThrow(ValidationError);
    expect(() => parseCardDetails(input, now)).toThrow(message);
  });

  it('never echoes the card number in error messages', () => {
    const cardNumber = '4242424242424241';
    expect(() => parseCardDetails({ ...validCard, cardNumber }, now)).not.toThrow(cardNumber);
  });
});
