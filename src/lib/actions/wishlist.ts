"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./goals";
import type { SurplusMode } from "@/lib/supabase/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function addWishlistItem(input: {
  name: string;
  estimatedAmount?: number | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
}): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!input.name?.trim()) return { ok: false, error: "Ponle nombre al deseo." };

  const { error } = await supabase.from("wishlist_items").insert({
    user_id: user.id,
    name: input.name.trim(),
    estimated_amount: input.estimatedAmount ?? null,
    image_url: input.imageUrl ?? null,
    link_url: input.linkUrl ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/wishlist");
  return { ok: true };
}

export async function deleteWishlistItem(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/wishlist");
  return { ok: true };
}

/** Convierte un deseo en meta activa (usado al completar otra meta). */
export async function promoteWishlistItem(
  itemId: string,
  dueDate: string,
  surplusMode: SurplusMode = "buffer",
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("promote_wishlist_item", {
    p_item_id: itemId,
    p_due_date: dueDate,
    p_surplus_mode: surplusMode,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/wishlist");
  return { ok: true, data };
}
