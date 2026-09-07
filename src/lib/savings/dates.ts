/**
 * Utilidades de fecha "civiles": trabajamos siempre con strings `YYYY-MM-DD`
 * en la zona horaria del usuario. Nunca con Date en UTC, porque un abono hecho
 * a las 23:30 en México debe contar para ese día y no para el siguiente.
 */

export type ISODate = string; // YYYY-MM-DD

const MS_DAY = 86_400_000;

export function todayISO(timeZone?: string): ISODate {
  return toISO(new Date(), timeZone);
}

export function toISO(date: Date, timeZone?: string): ISODate {
  if (!timeZone) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Medianoche UTC del día civil; sólo para aritmética, nunca para mostrar. */
function utcOf(iso: ISODate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((utcOf(to) - utcOf(from)) / MS_DAY);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = new Date(utcOf(iso) + days * MS_DAY);
  return d.toISOString().slice(0, 10);
}

/** Número de días del rango, incluyendo ambos extremos. Mínimo 1. */
export function inclusiveDays(from: ISODate, to: ISODate): number {
  return Math.max(1, daysBetween(from, to) + 1);
}

export function clampISO(iso: ISODate, min: ISODate, max: ISODate): ISODate {
  if (daysBetween(iso, min) > 0) return min;
  if (daysBetween(max, iso) > 0) return max;
  return iso;
}

export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const n = daysBetween(from, to);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}
