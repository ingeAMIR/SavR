import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Contribution,
  Goal,
  GoalBundle,
  GoalMember,
  Profile,
  WishlistItem,
} from "@/lib/supabase/types";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Perfil del usuario actual. Lo crea el trigger de auth, pero toleramos el hueco. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data as Profile;

  const fallback = {
    id: user.id,
    email: user.email ?? "",
    full_name:
      (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? null,
    avatar_url:
      (user.user_metadata?.avatar_url as string) ?? (user.user_metadata?.picture as string) ?? null,
  };
  const { data: created } = await supabase
    .from("profiles")
    .upsert(fallback, { onConflict: "id" })
    .select("*")
    .maybeSingle();
  return (created as Profile) ?? null;
}

/**
 * Todas las metas visibles para el usuario con sus miembros y aportaciones.
 * Se hace en 3 queries planas en vez de joins anidados: es más predecible bajo
 * RLS y evita el N+1 por meta.
 */
export async function getGoalBundles(
  statuses: Goal["status"][] = ["active", "paused"],
): Promise<GoalBundle[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .in("status", statuses)
    .order("created_at", { ascending: false });

  const list = (goals ?? []) as Goal[];
  if (list.length === 0) return [];
  const ids = list.map((g) => g.id);

  const [{ data: members }, { data: contributions }] = await Promise.all([
    supabase
      .from("goal_members")
      .select("*, profile:profiles(*)")
      .in("goal_id", ids),
    supabase
      .from("contributions")
      .select("*")
      .in("goal_id", ids)
      .order("occurred_on", { ascending: true }),
  ]);

  const membersByGoal = groupBy((members ?? []) as GoalMember[], (m) => m.goal_id);
  const contribsByGoal = groupBy((contributions ?? []) as Contribution[], (c) => c.goal_id);

  return list.map((goal) => ({
    goal,
    members: membersByGoal.get(goal.id) ?? [],
    contributions: contribsByGoal.get(goal.id) ?? [],
  }));
}

export async function getGoalBundle(goalId: string): Promise<GoalBundle | null> {
  const supabase = await createClient();

  const { data: goal } = await supabase.from("goals").select("*").eq("id", goalId).maybeSingle();
  if (!goal) return null;

  const [{ data: members }, { data: contributions }] = await Promise.all([
    supabase.from("goal_members").select("*, profile:profiles(*)").eq("goal_id", goalId),
    supabase
      .from("contributions")
      .select("*, profile:profiles(*), reactions(*)")
      .eq("goal_id", goalId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    goal: goal as Goal,
    members: (members ?? []) as GoalMember[],
    contributions: (contributions ?? []) as Contribution[],
  };
}

export async function getWishlist(): Promise<WishlistItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wishlist_items")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as WishlistItem[];
}

export async function getInvitations(goalId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invitations")
    .select("*")
    .eq("goal_id", goalId)
    .eq("revoked", false)
    .is("accepted_at", null)
    .order("expires_at", { ascending: false });
  return data ?? [];
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}
