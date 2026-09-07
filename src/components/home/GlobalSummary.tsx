"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Progress } from "@/components/ui/Progress";
import { formatCompact, formatMoney } from "@/lib/savings/money";
import { payAllDailyQuotas } from "@/lib/actions/goals";
import type { SummaryVM } from "@/lib/data/viewmodel";
import { MicroSaveSheet } from "./MicroSaveSheet";
import { useProfile } from "@/components/shell/ProfileProvider";

export function GlobalSummary({
  summary,
  currency,
  goals,
}: {
  summary: SummaryVM;
  currency: string;
  goals: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [microOpen, setMicroOpen] = useState(false);
  const { today } = useProfile();

  // marca para el recordatorio nocturno: si ya está todo cubierto, no molestar
  useEffect(() => {
    try {
      if (summary.allCoveredToday) localStorage.setItem("savr:paid", today);
      else localStorage.removeItem("savr:paid");
    } catch {
      /* modo privado */
    }
  }, [summary.allCoveredToday, today]);

  function payAll() {
    startTransition(async () => {
      const res = await payAllDailyQuotas();
      setFlash(
        res.ok
          ? res.data === 0
            ? "Ya estabas al corriente 🎉"
            : `Cuota del día registrada en ${res.data} ${res.data === 1 ? "meta" : "metas"}`
          : (res.error ?? "Algo salió mal"),
      );
      router.refresh();
      setTimeout(() => setFlash(null), 3000);
    });
  }

  const done = summary.allCoveredToday;

  return (
    <section className="card space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-400">Progreso total</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatCompact(summary.saved, currency)}
            <span className="text-base font-normal text-ink-400">
              {" / "}
              {formatCompact(summary.target, currency)}
            </span>
          </p>
        </div>
        <StreakBadge days={summary.streak} />
      </div>

      <Progress value={summary.progress} milestones />

      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>
          {summary.goalCount} {summary.goalCount === 1 ? "meta activa" : "metas activas"}
        </span>
        {summary.atRisk > 0 ? (
          <span className="text-amber-warm">
            {summary.atRisk} con atraso
          </span>
        ) : (
          <span>{Math.round(summary.progress * 100)}% completado</span>
        )}
      </div>

      <button
        onClick={payAll}
        disabled={pending || done}
        className={`w-full rounded-2xl px-5 py-4 text-center font-semibold transition active:scale-[0.98] disabled:active:scale-100 ${
          done
            ? "border border-mint-500/30 bg-mint-500/10 text-mint-300"
            : "bg-mint-500 text-ink-950 shadow-lg shadow-mint-600/20"
        }`}
      >
        {done ? (
          <span className="flex items-center justify-center gap-2">✓ Cuota de hoy cubierta</span>
        ) : pending ? (
          "Registrando…"
        ) : (
          <>
            Abonar hoy · {formatMoney(summary.todayTotal, currency)}
          </>
        )}
      </button>

      <button
        onClick={() => setMicroOpen(true)}
        className="w-full rounded-xl border border-ink-600 px-4 py-3 text-sm text-ink-200 transition active:scale-[0.98]"
      >
        🐜 Registrar gasto hormiga evitado
      </button>

      {flash && (
        <p className="animate-rise text-center text-sm text-mint-300">{flash}</p>
      )}

      <MicroSaveSheet
        open={microOpen}
        onClose={() => setMicroOpen(false)}
        currency={currency}
        goals={goals}
      />
    </section>
  );
}

function StreakBadge({ days }: { days: number }) {
  const active = days > 0;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
        active ? "bg-amber-warm/15 text-amber-warm" : "bg-ink-700 text-ink-400"
      }`}
      title="Días consecutivos cumpliendo tu cuota diaria"
    >
      <span aria-hidden>{active ? "🔥" : "·"}</span>
      <span className="tabular-nums">{days}</span>
    </div>
  );
}
