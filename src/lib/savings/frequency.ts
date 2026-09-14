import type { ContributionFrequency } from "@/lib/supabase/types";

/**
 * Sólo para mostrar en la UI el monto equivalente por periodo elegido.
 * El motor de cálculo (engine.ts) es siempre diario; esto no participa en
 * atrasos, buffer ni racha.
 */
export const CONTRIBUTION_FREQUENCIES: {
  value: ContributionFrequency;
  label: string;
  days: number;
}[] = [
  { value: "daily", label: "Diario", days: 1 },
  { value: "weekly", label: "Cada semana", days: 7 },
  { value: "biweekly", label: "Cada 2 semanas", days: 14 },
  { value: "monthly", label: "Cada mes", days: 30 },
];

export function periodDaysFor(frequency: ContributionFrequency): number {
  return CONTRIBUTION_FREQUENCIES.find((f) => f.value === frequency)?.days ?? 1;
}

export function frequencyLabel(frequency: ContributionFrequency): string {
  return CONTRIBUTION_FREQUENCIES.find((f) => f.value === frequency)?.label ?? "Diario";
}

/** Cuota diaria expresada en el periodo elegido, sólo para mostrar. */
export function periodicQuota(dailyQuota: number, frequency: ContributionFrequency): number {
  return Math.round(dailyQuota * periodDaysFor(frequency));
}
