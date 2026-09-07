/**
 * Motor de cálculo de SavR.
 *
 * Funciones puras, sin dependencias de red ni de React: son la única fuente de
 * verdad sobre cuotas, atrasos, buffer, rachas y proyecciones. Todo lo que
 * pinta la UI sale de aquí.
 *
 * Modelo mental
 * -------------
 * Cada miembro de una meta tiene su propio "sub-objetivo" (target * share) y su
 * propio libro diario. La meta global es la suma de los libros.
 *
 *  cuota nominal  = techo(objetivo_personal / días_del_plan)   [fija]
 *  esperado a hoy = cuota * días_transcurridos_inclusive
 *  balance        = ahorrado - esperado
 *      balance < 0  -> ATRASO
 *      balance > 0  -> EXCEDENTE, que se interpreta según el modo:
 *        · buffer      -> días pagados por adelantado (la fecha meta no se mueve)
 *        · accelerate  -> la fecha meta se adelanta (la cuota diaria no se mueve)
 */

import { ceilTo } from "./money";
import {
  type ISODate,
  addDays,
  clampISO,
  daysBetween,
  eachDay,
  inclusiveDays,
} from "./dates";

export type SurplusMode = "buffer" | "accelerate";

export interface GoalPlan {
  targetAmount: number; // centavos, total de la meta
  startDate: ISODate;
  dueDate: ISODate;
  surplusMode: SurplusMode;
  roundingStep?: number; // centavos; 0 = sin redondeo
}

export interface ContributionLike {
  userId: string;
  amount: number; // centavos
  occurredOn: ISODate;
}

export interface MemberLike {
  userId: string;
  shareBps: number; // 10000 = 100%
}

export interface DayCell {
  date: ISODate;
  contributed: number;
  requirement: number; // lo que tocaba ese día
  coveredByBuffer: number; // parte cubierta con excedente previo
  covered: boolean;
  bufferAfter: number;
}

export interface MemberState {
  userId: string;
  shareBps: number;
  /** Porción del objetivo que le corresponde (centavos). */
  targetShare: number;
  saved: number;
  remaining: number;
  progress: number; // 0..1
  /** Cuota diaria nominal ya redondeada. */
  dailyQuota: number;
  /** Cuota diaria si se recalculara hoy con lo que falta (informativa). */
  catchUpQuota: number;
  expectedToDate: number;
  balance: number; // saved - expectedToDate
  arrears: number; // atraso acumulado (>= 0)
  buffer: number; // excedente disponible (>= 0)
  bufferDays: number; // días pagados por adelantado
  daysDelta: number; // + días ganados / - días de atraso
  savedToday: number;
  /** Lo que el botón de ingreso diario debe cobrarle hoy. */
  todayCharge: number;
  todayCovered: boolean;
  streak: number; // días consecutivos cumplidos
  bestStreak: number;
  ledger: DayCell[];
}

export interface GoalState {
  plan: GoalPlan;
  today: ISODate;
  totalDays: number;
  elapsedDays: number; // incluyendo hoy, acotado al plan
  daysRemaining: number; // desde hoy hasta la fecha meta, inclusive
  saved: number;
  remaining: number;
  progress: number; // 0..1
  isComplete: boolean;
  /** Cuota diaria de la meta completa (suma de las cuotas de los miembros). */
  dailyQuota: number;
  /** Fecha estimada de término al ritmo actual. */
  projectedEndDate: ISODate;
  /** Días de adelanto (+) o retraso (-) respecto a la fecha meta. */
  projectedDaysDelta: number;
  milestonesReached: Milestone[];
  nextMilestone: Milestone | null;
  members: Record<string, MemberState>;
}

export type Milestone = 25 | 50 | 75 | 100;
export const MILESTONES: Milestone[] = [25, 50, 75, 100];

/** Reparte `total` entre participaciones en bps sin perder centavos. */
export function splitByShares(total: number, members: MemberLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (members.length === 0) return out;
  const totalBps = members.reduce((s, m) => s + m.shareBps, 0) || 10000;
  let assigned = 0;
  members.forEach((m, i) => {
    if (i === members.length - 1) {
      out[m.userId] = total - assigned; // el último absorbe el redondeo
    } else {
      const v = Math.floor((total * m.shareBps) / totalBps);
      out[m.userId] = v;
      assigned += v;
    }
  });
  return out;
}

/** Cuota diaria nominal para un objetivo y un plazo, con redondeo opcional. */
export function dailyQuotaFor(target: number, plan: GoalPlan): number {
  const days = inclusiveDays(plan.startDate, plan.dueDate);
  const raw = Math.ceil(target / days);
  return ceilTo(raw, plan.roundingStep ?? 0);
}

/**
 * Recorre día por día el plan para producir el libro diario de un miembro.
 * Es lo que permite que el buffer proteja la racha: un día sin abono pero
 * cubierto por excedente previo cuenta como cumplido.
 */
function buildLedger(
  quota: number,
  targetShare: number,
  byDay: Map<ISODate, number>,
  plan: GoalPlan,
  today: ISODate,
): DayCell[] {
  const lastDay = daysBetween(today, plan.dueDate) < 0 ? plan.dueDate : today;
  if (daysBetween(plan.startDate, lastDay) < 0) return [];

  const cells: DayCell[] = [];
  let buffer = 0;
  let cumulativeRequired = 0;
  let cumulativeSaved = 0;

  for (const date of eachDay(plan.startDate, lastDay)) {
    // la última cuota se ajusta para no exigir más que el objetivo
    const requirement = Math.max(0, Math.min(quota, targetShare - cumulativeRequired));
    cumulativeRequired += requirement;

    const contributed = byDay.get(date) ?? 0;
    cumulativeSaved += contributed;

    let coveredByBuffer = 0;
    let covered = requirement === 0 || contributed >= requirement;

    if (!covered && plan.surplusMode === "buffer") {
      const missing = requirement - contributed;
      coveredByBuffer = Math.min(buffer, missing);
      covered = coveredByBuffer >= missing;
    }
    // el objetivo ya alcanzado también cuenta como día cumplido
    if (!covered && cumulativeSaved >= targetShare) covered = true;

    buffer = Math.max(0, buffer + contributed - requirement);
    cells.push({ date, contributed, requirement, coveredByBuffer, covered, bufferAfter: buffer });
  }
  return cells;
}

function streaksFrom(ledger: DayCell[]): { current: number; best: number } {
  let best = 0;
  let run = 0;
  for (const c of ledger) {
    run = c.covered ? run + 1 : 0;
    if (run > best) best = run;
  }
  // la racha vigente no se rompe por el día de hoy si aún está en curso
  let current = 0;
  for (let i = ledger.length - 1; i >= 0; i--) {
    if (ledger[i].covered) current++;
    else if (i === ledger.length - 1) continue; // hoy todavía puede cumplirse
    else break;
  }
  return { current, best };
}

export interface ComputeInput {
  plan: GoalPlan;
  members: MemberLike[];
  contributions: ContributionLike[];
  today: ISODate;
}

export function computeGoalState({ plan, members, contributions, today }: ComputeInput): GoalState {
  const totalDays = inclusiveDays(plan.startDate, plan.dueDate);
  const cappedToday = clampISO(today, plan.startDate, plan.dueDate);
  const elapsedDays = inclusiveDays(plan.startDate, cappedToday);
  const daysRemaining = Math.max(0, daysBetween(today, plan.dueDate) + 1);

  const shares = splitByShares(plan.targetAmount, members);

  const byUser = new Map<string, Map<ISODate, number>>();
  const savedByUser = new Map<string, number>();
  for (const c of contributions) {
    if (!byUser.has(c.userId)) byUser.set(c.userId, new Map());
    const m = byUser.get(c.userId)!;
    m.set(c.occurredOn, (m.get(c.occurredOn) ?? 0) + c.amount);
    savedByUser.set(c.userId, (savedByUser.get(c.userId) ?? 0) + c.amount);
  }

  const memberStates: Record<string, MemberState> = {};
  let goalQuota = 0;

  for (const m of members) {
    const targetShare = shares[m.userId] ?? 0;
    const quota = dailyQuotaFor(targetShare, plan);
    goalQuota += quota;

    const days = byUser.get(m.userId) ?? new Map<ISODate, number>();
    const saved = savedByUser.get(m.userId) ?? 0;
    const remaining = Math.max(0, targetShare - saved);

    const expectedToDate = Math.min(targetShare, quota * elapsedDays);
    const balance = saved - expectedToDate;

    const ledger = buildLedger(quota, targetShare, days, plan, today);
    const { current, best } = streaksFrom(ledger);

    const savedToday = days.get(today) ?? 0;
    const todayCell = ledger.length ? ledger[ledger.length - 1] : null;
    const bufferBefore = ledger.length > 1 ? ledger[ledger.length - 2].bufferAfter : 0;

    let todayCharge = 0;
    if (remaining > 0 && todayCell && daysBetween(today, plan.startDate) <= 0) {
      const need = todayCell.requirement - savedToday;
      const relief = plan.surplusMode === "buffer" ? bufferBefore : 0;
      todayCharge = Math.max(0, Math.min(need - relief, remaining));
    }

    memberStates[m.userId] = {
      userId: m.userId,
      shareBps: m.shareBps,
      targetShare,
      saved,
      remaining,
      progress: targetShare > 0 ? Math.min(1, saved / targetShare) : 1,
      dailyQuota: quota,
      catchUpQuota: remaining > 0 && daysRemaining > 0 ? Math.ceil(remaining / daysRemaining) : 0,
      expectedToDate,
      balance,
      arrears: Math.max(0, -balance),
      buffer: Math.max(0, balance),
      bufferDays: quota > 0 ? Math.floor(Math.max(0, balance) / quota) : 0,
      daysDelta: quota > 0 ? Math.trunc(balance / quota) : 0,
      savedToday,
      todayCharge,
      todayCovered: todayCharge === 0,
      streak: current,
      bestStreak: best,
      ledger,
    };
  }

  const saved = members.reduce((s, m) => s + memberStates[m.userId].saved, 0);
  const remaining = Math.max(0, plan.targetAmount - saved);
  const progress = plan.targetAmount > 0 ? Math.min(1, saved / plan.targetAmount) : 0;

  const daysToFinish = goalQuota > 0 ? Math.ceil(remaining / goalQuota) : 0;
  const projectedEndDate = remaining === 0 ? today : addDays(today, Math.max(0, daysToFinish - 1));
  const projectedDaysDelta = daysBetween(projectedEndDate, plan.dueDate);

  const reached = MILESTONES.filter((m) => progress * 100 >= m);
  const next = MILESTONES.find((m) => progress * 100 < m) ?? null;

  return {
    plan,
    today,
    totalDays,
    elapsedDays,
    daysRemaining,
    saved,
    remaining,
    progress,
    isComplete: remaining === 0,
    dailyQuota: goalQuota,
    projectedEndDate,
    projectedDaysDelta,
    milestonesReached: reached,
    nextMilestone: next,
    members: memberStates,
  };
}

// --- Sugerencia de redondeo inteligente -------------------------------------

export interface RoundingSuggestion {
  quota: number; // cuota original
  suggested: number; // cuota redondeada
  daysSaved: number; // días que se adelanta la meta
  newEndDate: ISODate;
}

const STEPS = [500, 1000, 2000, 2500, 5000, 10000]; // $5, $10, $20, $25, $50, $100

/**
 * Propone subir la cuota diaria al múltiplo "bonito" inmediato superior.
 * Sólo sugiere si el aumento es razonable (< 35%) y gana al menos un día.
 */
export function suggestRounding(target: number, plan: GoalPlan): RoundingSuggestion | null {
  const quota = Math.ceil(target / inclusiveDays(plan.startDate, plan.dueDate));
  const step = STEPS.find((s) => s >= quota / 4) ?? STEPS[STEPS.length - 1];
  const suggested = ceilTo(quota, step);
  if (suggested <= quota) return null;
  if (suggested > quota * 1.35) return null;

  const newDays = Math.ceil(target / suggested);
  const daysSaved = inclusiveDays(plan.startDate, plan.dueDate) - newDays;
  if (daysSaved < 1) return null;

  return {
    quota,
    suggested,
    daysSaved,
    newEndDate: addDays(plan.startDate, newDays - 1),
  };
}

/** Frase de "costo en días" para la tarjeta. */
export function paceLabel(state: GoalState, member?: MemberState): string {
  if (state.isComplete) return "¡Meta completada!";
  const delta = member ? member.daysDelta : state.projectedDaysDelta;
  if (delta > 0) return `¡Vas ${delta} ${delta === 1 ? "día" : "días"} adelantado!`;
  if (delta < 0) {
    const d = Math.abs(delta);
    return `Vas ${d} ${d === 1 ? "día" : "días"} atrasado`;
  }
  const left = state.daysRemaining;
  return `A este ritmo terminas en ${left} ${left === 1 ? "día" : "días"}`;
}
