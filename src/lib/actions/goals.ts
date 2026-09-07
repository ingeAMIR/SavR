"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getGoalBundles, getProfile } from "@/lib/data/queries";
import { computeGoalState } from "@/lib/savings/engine";
import { todayISO } from "@/lib/savings/dates";
import type { ContributionKind, SurplusMode } from "@/lib/supabase/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// --- metas -------------------------------------------------------------------

export async function createGoal(input: {
  name: string;
  targetAmount: number;
  dueDate: string;
  imageUrl?: string | null;
  surplusMode?: SurplusMode;
  roundingStep?: number;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  if (!input.name?.trim()) return { ok: false, error: "Ponle nombre a tu meta." };
  if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0)
    return { ok: false, error: "El precio debe ser mayor a cero." };
  if (!input.dueDate) return { ok: false, error: "Elige una fecha límite." };

  const { data, error } = await supabase
    .from("goals")
    .insert({
      owner_id: user.id,
      name: input.name.trim(),
      target_amount: Math.round(input.targetAmount),
      due_date: input.dueDate,
      image_url: input.imageUrl ?? null,
      surplus_mode: input.surplusMode ?? "buffer",
      rounding_step: Math.max(0, Math.round(input.roundingStep ?? 0)),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, data: data.id };
}

export async function updateGoal(
  goalId: string,
  patch: Partial<{
    name: string;
    target_amount: number;
    due_date: string;
    image_url: string | null;
    surplus_mode: SurplusMode;
    rounding_step: number;
    status: "active" | "paused" | "completed" | "archived";
    purchased_at: string | null;
  }>,
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("goals").update(patch).eq("id", goalId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath(`/goals/${goalId}`);
  return { ok: true };
}

export async function deleteGoal(goalId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

// --- aportaciones ------------------------------------------------------------

export async function addContribution(input: {
  goalId: string;
  amount: number;
  kind?: ContributionKind;
  note?: string | null;
  occurredOn?: string;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const profile = await getProfile();

  if (!Number.isFinite(input.amount) || input.amount === 0)
    return { ok: false, error: "El monto no puede ser cero." };

  const { error } = await supabase.from("contributions").insert({
    goal_id: input.goalId,
    user_id: user.id,
    amount: Math.round(input.amount),
    kind: input.kind ?? "manual",
    note: input.note?.slice(0, 140) ?? null,
    occurred_on: input.occurredOn ?? todayISO(profile?.timezone),
  });
  if (error) return { ok: false, error: error.message };

  await maybeCompleteGoal(input.goalId);
  revalidatePath("/");
  revalidatePath(`/goals/${input.goalId}`);
  return { ok: true };
}

export async function deleteContribution(id: string, goalId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("contributions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath(`/goals/${goalId}`);
  return { ok: true };
}

/**
 * Botón maestro: liquida la cuota de hoy en todas las metas activas del usuario.
 * Cada meta cobra sólo la parte que le toca a este usuario según su share.
 */
export async function payAllDailyQuotas(): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const profile = await getProfile();
  const today = todayISO(profile?.timezone);

  const bundles = await getGoalBundles(["active"]);
  const rows = bundles
    .map((b) => {
      const state = computeGoalState({
        plan: {
          targetAmount: b.goal.target_amount,
          startDate: b.goal.start_date,
          dueDate: b.goal.due_date,
          surplusMode: b.goal.surplus_mode,
          roundingStep: b.goal.rounding_step,
        },
        members: b.members.map((m) => ({ userId: m.user_id, shareBps: m.share_bps })),
        contributions: b.contributions.map((c) => ({
          userId: c.user_id,
          amount: c.amount,
          occurredOn: c.occurred_on,
        })),
        today,
      });
      const mine = state.members[user.id];
      return mine && mine.todayCharge > 0
        ? {
            goal_id: b.goal.id,
            user_id: user.id,
            amount: mine.todayCharge,
            kind: "global" as const,
            occurred_on: today,
          }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return { ok: true, data: 0 };

  const { error } = await supabase.from("contributions").insert(rows);
  if (error) return { ok: false, error: error.message };

  for (const r of rows) await maybeCompleteGoal(r.goal_id);
  revalidatePath("/");
  return { ok: true, data: rows.length };
}

/** Marca la meta como completada cuando el total ahorrado alcanza el objetivo. */
async function maybeCompleteGoal(goalId: string) {
  const supabase = await createClient();
  const { data: goal } = await supabase
    .from("goals")
    .select("id, target_amount, status")
    .eq("id", goalId)
    .maybeSingle();
  if (!goal || goal.status === "completed") return;

  const { data: sums } = await supabase.from("contributions").select("amount").eq("goal_id", goalId);
  const total = (sums ?? []).reduce((s, c) => s + (c.amount as number), 0);
  if (total >= goal.target_amount) {
    await supabase
      .from("goals")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", goalId);
  }
}
