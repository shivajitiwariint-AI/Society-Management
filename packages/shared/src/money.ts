/**
 * Money is represented as integer minor units (paise for INR).
 * Never use floating point for money (SRS 13.1).
 */

export const CURRENCY_MINOR_UNITS: Readonly<Record<string, number>> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
};

export function minorUnitDigits(currencyCode: string): number {
  return CURRENCY_MINOR_UNITS[currencyCode.toUpperCase()] ?? 2;
}

/** Parse a decimal string such as "1234.50" into 123450 minor units. */
export function parseMoney(value: string, currencyCode = 'INR'): bigint {
  const digits = minorUnitDigits(currencyCode);
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid money value: ${value}`);
  const whole = BigInt(match[1] ?? '0');
  const fraction = (match[2] ?? '').padEnd(digits, '0').slice(0, digits);
  if ((match[2] ?? '').length > digits) throw new Error(`Too many decimal places: ${value}`);
  return whole * 10n ** BigInt(digits) + BigInt(fraction || '0');
}

export function formatMoney(minorUnits: bigint, currencyCode = 'INR'): string {
  const digits = minorUnitDigits(currencyCode);
  const factor = 10n ** BigInt(digits);
  const sign = minorUnits < 0n ? '-' : '';
  const absolute = minorUnits < 0n ? -minorUnits : minorUnits;
  const whole = absolute / factor;
  const fraction = absolute % factor;
  if (digits === 0) return `${sign}${whole.toString()}`;
  return `${sign}${whole.toString()}.${fraction.toString().padStart(digits, '0')}`;
}
