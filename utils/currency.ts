/**
 * Currency and number formatting utilities for AllGood.
 */

export type CurrencyCode = "USD" | "MXN" | "BRL" | "EUR" | "GBP" | "COP";

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  MXN: "$",
  BRL: "R$",
  EUR: "€",
  GBP: "£",
  COP: "$",
};

/**
 * Format a number as currency.
 * Uses Intl.NumberFormat when available, falls back to manual formatting.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "USD",
  locale = "en-US",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for environments without full Intl support
    const symbol = CURRENCY_SYMBOLS[currency] ?? "$";
    const abs = Math.abs(amount).toFixed(2);
    const formatted = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  }
}

/**
 * Format a signed amount for display (e.g., +$120.00 or -$250.00)
 */
export function formatSignedAmount(
  amount: number,
  currency: CurrencyCode = "USD",
  locale = "en-US",
): string {
  const formatted = formatCurrency(Math.abs(amount), currency, locale);
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Parse a currency string back to a number.
 */
export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

/**
 * Validate a transfer amount.
 */
export function validateAmount(
  amount: number,
  min = 1,
  max = 10000,
): { valid: boolean; errorKey?: string } {
  if (amount < min) return { valid: false, errorKey: "amountTooLow" };
  if (amount > max) return { valid: false, errorKey: "amountTooHigh" };
  return { valid: true };
}
