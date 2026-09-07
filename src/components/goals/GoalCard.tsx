"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AvatarStack } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { addContribution } from "@/lib/actions/goals";
import { formatCompact, formatMoney } from "@/lib/savings/money";
import type { GoalVM } from "@/lib/data/viewmodel";

export function GoalCard({ goal, currency }: { goal: GoalVM; currency: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [celebrate, setCelebrate] = useState(false);

  function payToday() {
    if (goal.myTodayCharge <= 0) return;
    startTransition(async () => {
      const res = await addContribution({
        goalId: goal.id,
        amount: goal.myTodayCharge,
        kind: "daily",
      });
      if (res.ok) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 900);
        router.refresh();
      }
    });
  }

  return (
    <article className="card overflow-hidden">
      <Link href={`/goals/${goal.id}`} className="flex gap-3 p-3 transition active:scale-[0.99]">
        <Cover goal={goal} />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{goal.name}</h3>
              <p className="text-xs text-ink-400">
                {formatCompact(goal.saved, currency)} de {formatCompact(goal.targetAmount, currency)}
              </p>
            </div>
            {goal.isShared && (
              <AvatarStack
                people={goal.members.map((m) => ({
                  avatar_url: m.avatar_url,
                  full_name: m.name,
                  email: m.email,
                }))}
                size={22}
              />
            )}
          </div>

          <Progress value={goal.progress} milestones />

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-400">
            <span className={goal.myDaysDelta >= 0 ? "text-mint-400" : "text-amber-warm"}>
              {goal.pace}
            </span>
            <span aria-hidden>·</span>
            <span>
              {goal.daysContributed} días abonados
              {goal.daysMissed > 0 && (
                <span className="text-amber-warm"> · {goal.daysMissed} atrasados</span>
              )}
            </span>
          </div>

          {goal.myArrears > 0 && (
            <p className="text-[11px] text-amber-warm">
              Atraso acumulado: {formatMoney(goal.myArrears, currency)}
            </p>
          )}
          {goal.myBufferDays > 0 && (
            <p className="text-[11px] text-mint-400">
              Buffer: {goal.myBufferDays} {goal.myBufferDays === 1 ? "día pagado" : "días pagados"}{" "}
              por adelantado
            </p>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between gap-3 border-t border-ink-700 px-3 py-2.5">
        <div className="text-xs">
          <span className="text-ink-400">Tu cuota diaria </span>
          <span className="font-semibold tabular-nums">{formatMoney(goal.myQuota, currency)}</span>
          {goal.isShared && (
            <span className="text-ink-400"> · {Math.round(goal.myShareBps / 100)}%</span>
          )}
        </div>

        {goal.isComplete ? (
          <Link
            href={`/goals/${goal.id}`}
            className="rounded-lg bg-mint-500/15 px-3 py-1.5 text-xs font-medium text-mint-300"
          >
            🎉 Completada
          </Link>
        ) : (
          <button
            onClick={payToday}
            disabled={pending || goal.myTodayCharge === 0 || goal.status !== "active"}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 disabled:active:scale-100 ${
              celebrate ? "animate-pop" : ""
            } ${goal.myTodayCharge === 0 ? "bg-mint-500/15 text-mint-300" : "bg-mint-500 text-ink-950"}`}
          >
            {goal.myTodayCharge === 0
              ? "✓ Hoy listo"
              : pending
                ? "…"
                : `Abonar ${formatMoney(goal.myTodayCharge, currency)}`}
          </button>
        )}
      </div>
    </article>
  );
}

function Cover({ goal }: { goal: GoalVM }) {
  return (
    <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-ink-700">
      {goal.imageUrl ? (
        <img src={goal.imageUrl} alt="" className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-2xl">🎯</div>
      )}
      {goal.status === "paused" && (
        <span className="absolute inset-x-0 bottom-0 bg-ink-950/80 py-0.5 text-center text-[10px]">
          Pausada
        </span>
      )}
    </div>
  );
}
