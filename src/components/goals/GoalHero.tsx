/* eslint-disable @next/next/no-img-element */

import { Progress } from "@/components/ui/Progress";
import { formatMoney } from "@/lib/savings/money";
import { MILESTONES } from "@/lib/savings/engine";
import type { GoalVM } from "@/lib/data/viewmodel";

export function GoalHero({ goal, currency }: { goal: GoalVM; currency: string }) {
  return (
    <section className="card overflow-hidden">
      <div className="relative h-44 bg-ink-700">
        {goal.imageUrl ? (
          <img src={goal.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-5xl">🎯</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900 to-transparent p-4">
          <h1 className="text-xl font-semibold">{goal.name}</h1>
          <p className="text-sm text-ink-200/80">
            {formatMoney(goal.saved, currency)} de {formatMoney(goal.targetAmount, currency)}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <Progress value={goal.progress} milestones />

        <ul className="flex items-center justify-between">
          {MILESTONES.map((m) => {
            const reached = goal.milestonesReached.includes(m);
            return (
              <li key={m} className="flex flex-col items-center gap-1">
                <span
                  className={`grid size-8 place-items-center rounded-full text-xs font-semibold transition ${
                    reached
                      ? `animate-pop bg-mint-500 text-ink-950 ${m === 100 ? "shadow-lg shadow-mint-500/40" : ""}`
                      : "border border-ink-600 text-ink-400"
                  }`}
                >
                  {reached ? (m === 100 ? "🏆" : "✓") : `${m}`}
                </span>
                <span className="text-[10px] text-ink-400">{m}%</span>
              </li>
            );
          })}
        </ul>

        <p className={`text-sm ${goal.myDaysDelta >= 0 ? "text-mint-400" : "text-amber-warm"}`}>
          {goal.pace}
        </p>
      </div>
    </section>
  );
}
