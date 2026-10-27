import { ValidationError } from '../utils/errors';
import { CardDetails } from './paymentProvider';

const EXPIRY_GRACE_MS = 12 * 60 * 60 * 1000;

/**
 * Luhn checksum used by all major card networks
 */
export function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Validate and normalise untrusted card input. Error messages never echo the card data.
 */
export function parseCardDetails(input: unknown, now: Date = new Date()): CardDetails {
  if (typeof input !== 'object' || input === null) {
    throw new ValidationError('payment details are required');
  }
  const { cardholderName, cardNumber, expMonth, expYear, cvc } = input as Record<string, unknown>;

  if (typeof cardholderName !== 'string' || cardholderName.trim().length === 0) {
    throw new ValidationError('cardholderName is required');
  }

  const digits = typeof cardNumber === 'string' ? cardNumber.replace(/[\s-]/g, '') : '';
  if (!/^\d{12,19}$/.test(digits) || !passesLuhn(digits)) {
    throw new ValidationError('cardNumber is invalid');
  }

  if (!Number.isInteger(expMonth) || (expMonth as number) < 1 || (expMonth as number) > 12) {
    throw new ValidationError('expMonth must be between 1 and 12');
  }
  if (!Number.isInteger(expYear) || (expYear as number) < 2000 || (expYear as number) > 2100) {
    throw new ValidationError('expYear must be a four-digit year');
  }
  // Cards are valid through the last day of their expiry month in the cardholder's time zone,
  // so allow up to UTC-12 past midnight UTC; the provider makes the final call
  const expiresAfter = Date.UTC(expYear as number, expMonth as number, 1) + EXPIRY_GRACE_MS;
  if (expiresAfter <= now.getTime()) {
    throw new ValidationError('card has expired');
  }

  if (typeof cvc !== 'string' || !/^\d{3,4}$/.test(cvc)) {
    throw new ValidationError('cvc must be 3 or 4 digits');
  }

  return {
    cardholderName: cardholderName.trim(),
    cardNumber: digits,
    expMonth: expMonth as number,
    expYear: expYear as number,
    cvc,
  };
}
