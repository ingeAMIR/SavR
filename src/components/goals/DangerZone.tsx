"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteGoal, updateGoal } from "@/lib/actions/goals";
import type { GoalVM } from "@/lib/data/viewmodel";

export function DangerZone({ goal }: { goal: GoalVM }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const paused = goal.status === "paused";

  return (
    <section className="card space-y-3 border-ink-700 p-4">
      <h2 className="text-sm font-medium text-ink-400">Zona delicada</h2>

      <button
        onClick={() =>
          startTransition(async () => {
            await updateGoal(goal.id, { status: paused ? "active" : "paused" });
            router.refresh();
          })
        }
        disabled={pending}
        className="w-full rounded-xl border border-ink-600 px-4 py-3 text-sm transition active:scale-[0.98]"
      >
        {paused ? "Reanudar meta" : "Pausar meta"}
      </button>

      <button
        onClick={() =>
          startTransition(async () => {
            await updateGoal(goal.id, { status: "archived" });
            router.push("/");
          })
        }
        disabled={pending}
        className="w-full rounded-xl border border-ink-600 px-4 py-3 text-sm transition active:scale-[0.98]"
      >
        Archivar (conserva el historial)
      </button>

      {confirming ? (
        <div className="space-y-2 rounded-xl border border-coral/40 bg-coral/5 p-3">
          <p className="text-sm text-coral">
            Se borrarán todos los abonos y colaboradores de esta meta. No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                startTransition(async () => {
                  await deleteGoal(goal.id);
                  router.push("/");
                })
              }
              disabled={pending}
              className="flex-1 rounded-xl bg-coral px-4 py-2.5 text-sm font-semibold text-ink-950"
            >
              Sí, eliminar
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-xl border border-ink-600 px-4 py-2.5 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="w-full rounded-xl border border-coral/40 px-4 py-3 text-sm text-coral transition active:scale-[0.98]"
        >
          Eliminar meta
        </button>
      )}
    </section>
  );
}
