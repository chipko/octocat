/**
 * Parse "MM/YY" or "MM/YYYY" into a month and four-digit year, or null if malformed
 */
export function parseExpiry(value: string): { expMonth: number; expYear: number } | null {
  const match = value.trim().match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) {
    return null;
  }
  const expMonth = Number(match[1]);
  const expYear = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
  return expMonth >= 1 && expMonth <= 12 ? { expMonth, expYear } : null;
}
