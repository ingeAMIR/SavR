/**
 * Traduce lo que devuelve la base + el motor de cálculo a objetos planos y
 * serializables que los componentes de cliente pueden recibir desde un Server
 * Component. Aquí no hay lógica de negocio nueva: sólo forma.
 */

import { computeGoalState, paceLabel, type GoalState, type Milestone } from "@/lib/savings/engine";
import { periodicQuota } from "@/lib/savings/frequency";
import type { ContributionFrequency, GoalBundle, GoalStatus, SurplusMode } from "@/lib/supabase/types";

export interface MemberVM {
  userId: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  shareBps: number;
  role: "owner" | "collaborator";
  saved: number;
  targetShare: number;
  dailyQuota: number;
  todayCovered: boolean;
}

export interface GoalVM {
  id: string;
  name: string;
  imageUrl: string | null;
  status: GoalStatus;
  surplusMode: SurplusMode;
  contributionFrequency: ContributionFrequency;
  isShared: boolean;
  isOwner: boolean;
  ownerId: string;

  targetAmount: number;
  saved: number;
  remaining: number;
  progress: number;
  isComplete: boolean;
  purchased: boolean;

  startDate: string;
  dueDate: string;
  daysRemaining: number;
  projectedEndDate: string;
  projectedDaysDelta: number;
  pace: string;

  // lo que le toca a quien mira la pantalla
  myShareBps: number;
  myQuota: number;
  myPeriodicQuota: number;
  myTodayCharge: number;
  myTodayCovered: boolean;
  myArrears: number;
  myBuffer: number;
  myBufferDays: number;
  myDaysDelta: number;
  myStreak: number;
  daysContributed: number;
  daysMissed: number;

  milestonesReached: Milestone[];
  nextMilestone: Milestone | null;
  members: MemberVM[];
}

export function toGoalState(bundle: GoalBundle, today: string): GoalState {
  return computeGoalState({
    plan: {
      targetAmount: bundle.goal.target_amount,
      startDate: bundle.goal.start_date,
      dueDate: bundle.goal.due_date,
      surplusMode: bundle.goal.surplus_mode,
      roundingStep: bundle.goal.rounding_step,
    },
    members: bundle.members.map((m) => ({ userId: m.user_id, shareBps: m.share_bps })),
    contributions: bundle.contributions.map((c) => ({
      userId: c.user_id,
      amount: c.amount,
      occurredOn: c.occurred_on,
    })),
    today,
  });
}

export function toGoalVM(bundle: GoalBundle, userId: string, today: string): GoalVM {
  const state = toGoalState(bundle, today);
  const mine = state.members[userId];
  const ledger = mine?.ledger ?? [];

  return {
    id: bundle.goal.id,
    name: bundle.goal.name,
    imageUrl: bundle.goal.image_url,
    status: bundle.goal.status,
    surplusMode: bundle.goal.surplus_mode,
    contributionFrequency: bundle.goal.contribution_frequency,
    isShared: bundle.members.length > 1,
    isOwner: bundle.goal.owner_id === userId,
    ownerId: bundle.goal.owner_id,

    targetAmount: bundle.goal.target_amount,
    saved: state.saved,
    remaining: state.remaining,
    progress: state.progress,
    isComplete: state.isComplete,
    purchased: Boolean(bundle.goal.purchased_at),

    startDate: bundle.goal.start_date,
    dueDate: bundle.goal.due_date,
    daysRemaining: state.daysRemaining,
    projectedEndDate: state.projectedEndDate,
    projectedDaysDelta: state.projectedDaysDelta,
    pace: paceLabel(state, mine),

    myShareBps: bundle.members.find((m) => m.user_id === userId)?.share_bps ?? 10000,
    myQuota: mine?.dailyQuota ?? 0,
    myPeriodicQuota: periodicQuota(mine?.dailyQuota ?? 0, bundle.goal.contribution_frequency),
    myTodayCharge: mine?.todayCharge ?? 0,
    myTodayCovered: mine?.todayCovered ?? true,
    myArrears: mine?.arrears ?? 0,
    myBuffer: mine?.buffer ?? 0,
    myBufferDays: mine?.bufferDays ?? 0,
    myDaysDelta: mine?.daysDelta ?? 0,
    myStreak: mine?.streak ?? 0,
    daysContributed: ledger.filter((d) => d.contributed > 0).length,
    daysMissed: ledger.filter((d) => !d.covered).length,

    milestonesReached: state.milestonesReached,
    nextMilestone: state.nextMilestone,
    members: bundle.members
      .map((m) => {
        const ms = state.members[m.user_id];
        return {
          userId: m.user_id,
          name: m.profile?.full_name ?? null,
          email: m.profile?.email ?? null,
          avatar_url: m.profile?.avatar_url ?? null,
          shareBps: m.share_bps,
          role: m.role,
          saved: ms?.saved ?? 0,
          targetShare: ms?.targetShare ?? 0,
          dailyQuota: ms?.dailyQuota ?? 0,
          todayCovered: ms?.todayCovered ?? true,
        };
      })
      .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0)),
  };
}

export interface SummaryVM {
  goalCount: number;
  saved: number;
  target: number;
  progress: number;
  todayTotal: number; // lo que cobra el botón maestro
  todayPaid: number; // ya abonado hoy por el usuario
  allCoveredToday: boolean;
  streak: number; // racha global
  atRisk: number; // metas con atraso
}

/**
 * Racha global: días consecutivos en los que TODAS las metas activas del
 * usuario quedaron cubiertas. El buffer las protege porque el libro diario ya
 * marca esos días como cumplidos.
 */
export function computeSummary(
  entries: { goal: GoalVM; state: GoalState }[],
  userId: string,
): SummaryVM {
  const active = entries.filter((e) => e.goal.status === "active");
  const saved = active.reduce((s, e) => s + e.goal.saved, 0);
  const target = active.reduce((s, e) => s + e.goal.targetAmount, 0);

  const ledgers = active
    .map((e) => e.state.members[userId]?.ledger ?? [])
    .filter((l) => l.length > 0);

  let streak = 0;
  if (ledgers.length > 0) {
    const coveredByDate = new Map<string, boolean>();
    for (const ledger of ledgers) {
      for (const cell of ledger) {
        coveredByDate.set(cell.date, (coveredByDate.get(cell.date) ?? true) && cell.covered);
      }
    }
    const dates = [...coveredByDate.keys()].sort();
    for (let i = dates.length - 1; i >= 0; i--) {
      if (coveredByDate.get(dates[i])) streak++;
      else if (i === dates.length - 1) continue; // el día de hoy aún está abierto
      else break;
    }
  }

  return {
    goalCount: active.length,
    saved,
    target,
    progress: target > 0 ? Math.min(1, saved / target) : 0,
    todayTotal: active.reduce((s, e) => s + e.goal.myTodayCharge, 0),
    todayPaid: active.reduce((s, e) => s + (e.state.members[userId]?.savedToday ?? 0), 0),
    allCoveredToday: active.every((e) => e.goal.myTodayCovered),
    streak,
    atRisk: active.filter((e) => e.goal.myArrears > 0).length,
  };
}
