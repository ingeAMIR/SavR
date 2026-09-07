"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Sheet } from "@/components/ui/Sheet";
import { Field, inputClass } from "@/components/ui/Field";
import { updateGoal } from "@/lib/actions/goals";
import { promoteWishlistItem } from "@/lib/actions/wishlist";
import { formatMoney } from "@/lib/savings/money";
import { addDays, todayISO } from "@/lib/savings/dates";
import type { GoalVM } from "@/lib/data/viewmodel";
import type { WishlistItem } from "@/lib/supabase/types";

/**
 * Aparece cuando una meta llega al 100%: celebra, permite marcarla como
 * comprada y propone ascender un deseo de la wishlist a meta activa.
 */
export function PromoteWishlistPrompt({
  goal,
  wishlist,
  currency,
}: {
  goal: GoalVM;
  wishlist: WishlistItem[];
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 60));
  const [error, setError] = useState<string | null>(null);

  const candidates = wishlist.filter((w) => w.estimated_amount);

  function markPurchased() {
    startTransition(async () => {
      await updateGoal(goal.id, { purchased_at: new Date().toISOString() });
      router.refresh();
    });
  }

  function promote(item: WishlistItem) {
    startTransition(async () => {
      const res = await promoteWishlistItem(item.id, dueDate);
      if (!res.ok) return setError(res.error ?? "No se pudo crear la meta.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <section className="animate-pop card border-mint-500/40 bg-gradient-to-br from-mint-500/15 to-transparent p-5">
      <p className="text-3xl" aria-hidden>
        🎉
      </p>
      <h2 className="mt-2 font-semibold">¡Completaste «{goal.name}»!</h2>
      <p className="mt-1 text-sm text-ink-200/80">
        Juntaste {formatMoney(goal.targetAmount, currency)}. Ve por ello y márcalo como comprado.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={markPurchased}
          disabled={pending}
          className="rounded-xl bg-mint-500 px-4 py-2.5 text-sm font-semibold text-ink-950 transition active:scale-95"
        >
          Marcar como comprado
        </button>
        {candidates.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl border border-ink-600 px-4 py-2.5 text-sm transition active:scale-95"
          >
            Elegir siguiente meta
          </button>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="¿Qué sigue?">
        <div className="space-y-4">
          <Field label="Fecha límite de la nueva meta">
            <input
              type="date"
              className={inputClass}
              value={dueDate}
              min={todayISO()}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>

          <ul className="space-y-2">
            {candidates.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => promote(item)}
                  disabled={pending}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-600 px-4 py-3 text-left transition active:scale-[0.98]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-ink-400">
                      {formatMoney(item.estimated_amount!, currency)}
                    </span>
                  </span>
                  <span className="text-mint-400" aria-hidden>
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {error && <p className="text-sm text-coral">{error}</p>}
        </div>
      </Sheet>
    </section>
  );
}
