/** Todo el dinero se maneja en centavos enteros. */

export function formatMoney(cents: number, currency = "MXN", locale = "es-MX"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Formato corto para tarjetas: $1,980 */
export function formatCompact(cents: number, currency = "MXN", locale = "es-MX"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  if (!cleaned || cleaned === "." || cleaned === "-") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function ceilTo(cents: number, step: number): number {
  if (step <= 0) return cents;
  return Math.ceil(cents / step) * step;
}
