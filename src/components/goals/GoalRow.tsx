"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { addContribution } from "@/lib/actions/goals";
import { formatMoney } from "@/lib/savings/money";
import type { GoalVM } from "@/lib/data/viewmodel";

/** Vista compacta tipo widget: nombre, pendiente del día y casilla para liquidar. */
export function GoalRow({ goal, currency }: { goal: GoalVM; currency: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const done = goal.myTodayCharge === 0;

  function toggle() {
    if (done || goal.status !== "active") return;
    startTransition(async () => {
      const res = await addContribution({
        goalId: goal.id,
        amount: goal.myTodayCharge,
        kind: "daily",
      });
      if (res.ok) router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-ink-700">
        {goal.imageUrl ? (
          <img src={goal.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-base">🎯</div>
        )}
      </div>

      <Link href={`/goals/${goal.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{goal.name}</p>
        <p className="text-xs text-ink-400">
          {done ? (
            <span className="text-mint-400">Cuota de hoy cubierta</span>
          ) : (
            <>Pendiente hoy: {formatMoney(goal.myTodayCharge, currency)}</>
          )}
        </p>
      </Link>

      <button
        onClick={toggle}
        disabled={pending || done}
        aria-label={done ? "Cuota cubierta" : `Liquidar cuota de ${goal.name}`}
        className={`grid size-8 shrink-0 place-items-center rounded-lg border transition active:scale-90 ${
          done
            ? "border-mint-500 bg-mint-500 text-ink-950"
            : "border-ink-600 text-transparent hover:border-mint-500"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path
            d="m5 13 4 4L19 7"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </li>
  );
}
