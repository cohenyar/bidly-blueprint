/**
 * Israeli locale helpers. UI copy is Hebrew; internal code stays English.
 */
export const LOCALE = "he-IL";
export const TIMEZONE = "Asia/Jerusalem";
export const CURRENCY = "ILS";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(d);
}

export function formatDateTime(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  }).format(d);
}
