"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./goals";
import type { InvitationPreview } from "@/lib/supabase/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Código legible, sin caracteres ambiguos (0/O, 1/I). */
function inviteCode(length = 7): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export async function createInvitation(input: {
  goalId: string;
  email?: string | null;
  shareBps: number;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const share = Math.min(10000, Math.max(0, Math.round(input.shareBps)));
  const code = inviteCode();

  const { error } = await supabase.from("invitations").insert({
    goal_id: input.goalId,
    code,
    invited_email: input.email?.trim().toLowerCase() || null,
    share_bps: share,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/goals/${input.goalId}`);
  return { ok: true, data: code };
}

export async function revokeInvitation(id: string, goalId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("invitations").update({ revoked: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/goals/${goalId}`);
  return { ok: true };
}

export async function peekInvitation(code: string): Promise<InvitationPreview | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("peek_invitation", { p_code: code });
  const row = Array.isArray(data) ? data[0] : data;
  return (row as InvitationPreview) ?? null;
}

export async function acceptInvitation(code: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("accept_invitation", { p_code: code });
  if (error) return { ok: false, error: translateInviteError(error.message) };
  revalidatePath("/");
  return { ok: true, data };
}

function translateInviteError(message: string): string {
  if (message.includes("invitation_not_found")) return "Ese código no existe.";
  if (message.includes("invitation_revoked")) return "La invitación fue cancelada.";
  if (message.includes("invitation_expired")) return "La invitación ya expiró.";
  if (message.includes("invitation_email_mismatch"))
    return "Esta invitación es para otro correo. Inicia sesión con la cuenta invitada.";
  if (message.includes("goal_closed")) return "Esta meta ya está cerrada.";
  return message;
}

/** Ajusta el reparto de cuotas. El owner absorbe el remanente. */
export async function updateShares(
  goalId: string,
  shares: Record<string, number>,
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const total = Object.values(shares).reduce((s, v) => s + v, 0);
  if (total !== 10000) return { ok: false, error: "Los porcentajes deben sumar 100%." };

  for (const [userId, bps] of Object.entries(shares)) {
    const { error } = await supabase
      .from("goal_members")
      .update({ share_bps: bps })
      .eq("goal_id", goalId)
      .eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/goals/${goalId}`);
  return { ok: true };
}

export async function leaveGoal(goalId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("goal_members")
    .delete()
    .eq("goal_id", goalId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function removeMember(goalId: string, userId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("goal_members")
    .delete()
    .eq("goal_id", goalId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/goals/${goalId}`);
  return { ok: true };
}

// --- reacciones del feed -----------------------------------------------------

export async function toggleReaction(
  contributionId: string,
  emoji: string,
  goalId: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("contribution_id", contributionId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("reactions").delete().eq("id", existing.id)
    : await supabase
        .from("reactions")
        .insert({ contribution_id: contributionId, user_id: user.id, emoji });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/goals/${goalId}`);
  return { ok: true };
}
