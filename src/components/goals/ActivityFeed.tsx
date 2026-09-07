"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { toggleReaction } from "@/lib/actions/collab";
import { deleteContribution } from "@/lib/actions/goals";
import { formatMoney } from "@/lib/savings/money";
import type { Contribution } from "@/lib/supabase/types";

const QUICK_EMOJIS = ["🔥", "👏", "💪", "🎉"];

const KIND_LABEL: Record<string, string> = {
  daily: "Cuota del día",
  global: "Abono global",
  micro: "Gasto hormiga evitado",
  manual: "Abono",
  adjustment: "Ajuste",
};

export function ActivityFeed({
  goalId,
  contributions,
  currency,
  meId,
}: {
  goalId: string;
  contributions: Contribution[];
  currency: string;
  meId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (contributions.length === 0) {
    return (
      <section className="card p-4">
        <h2 className="text-sm font-medium">Actividad</h2>
        <p className="mt-2 text-sm text-ink-400">
          Aún no hay abonos. El primero siempre es el que cuesta.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-medium">Actividad</h2>
      <ol className="space-y-4">
        {contributions.map((c) => {
          const grouped = groupReactions(c.reactions ?? []);
          return (
            <li key={c.id} className="flex gap-3">
              <Avatar
                src={c.profile?.avatar_url}
                name={c.profile?.full_name}
                email={c.profile?.email}
                size={32}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">
                    {c.user_id === meId ? "Tú" : (c.profile?.full_name ?? c.profile?.email)}
                  </span>{" "}
                  <span className="text-ink-400">abonó</span>{" "}
                  <span className="font-semibold tabular-nums text-mint-400">
                    {formatMoney(c.amount, currency)}
                  </span>
                </p>
                <p className="text-xs text-ink-400">
                  {c.note ?? KIND_LABEL[c.kind] ?? "Abono"} ·{" "}
                  {new Date(c.created_at).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {Object.entries(grouped).map(([emoji, users]) => (
                    <button
                      key={emoji}
                      onClick={() =>
                        startTransition(async () => {
                          await toggleReaction(c.id, emoji, goalId);
                          router.refresh();
                        })
                      }
                      className={`rounded-full border px-2 py-0.5 text-xs transition active:scale-90 ${
                        users.includes(meId)
                          ? "border-mint-500/50 bg-mint-500/10"
                          : "border-ink-600"
                      }`}
                    >
                      {emoji} {users.length}
                    </button>
                  ))}
                  {QUICK_EMOJIS.filter((e) => !grouped[e]).map((emoji) => (
                    <button
                      key={emoji}
                      aria-label={`Reaccionar ${emoji}`}
                      onClick={() =>
                        startTransition(async () => {
                          await toggleReaction(c.id, emoji, goalId);
                          router.refresh();
                        })
                      }
                      className="rounded-full px-1.5 py-0.5 text-xs opacity-40 transition hover:opacity-100 active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                  {c.user_id === meId && (
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          await deleteContribution(c.id, goalId);
                          router.refresh();
                        })
                      }
                      className="ml-auto text-[11px] text-ink-400 underline"
                    >
                      Deshacer
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function groupReactions(reactions: { emoji: string; user_id: string }[]) {
  const out: Record<string, string[]> = {};
  for (const r of reactions) (out[r.emoji] ??= []).push(r.user_id);
  return out;
}
