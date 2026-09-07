import { formatMoney } from "@/lib/savings/money";
import type { GoalVM } from "@/lib/data/viewmodel";

export function GoalStats({ goal, currency }: { goal: GoalVM; currency: string }) {
  const stats: { label: string; value: string; tone?: "good" | "warn" }[] = [
    { label: "Tu cuota diaria", value: formatMoney(goal.myQuota, currency) },
    { label: "Te falta", value: formatMoney(goal.remaining, currency) },
    { label: "Días restantes", value: `${goal.daysRemaining}` },
    { label: "Racha en esta meta", value: `${goal.myStreak} 🔥` },
    {
      label: "Fecha meta",
      value: new Date(`${goal.dueDate}T00:00:00`).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
      }),
    },
    {
      label: goal.surplusMode === "buffer" ? "Días adelantados" : "Término estimado",
      value:
        goal.surplusMode === "buffer"
          ? `${goal.myBufferDays}`
          : new Date(`${goal.projectedEndDate}T00:00:00`).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
            }),
      tone: "good",
    },
  ];

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="card p-3">
            <p className="text-[10px] uppercase leading-tight tracking-wide text-ink-400">
              {s.label}
            </p>
            <p
              className={`mt-1 text-sm font-semibold tabular-nums ${
                s.tone === "good" ? "text-mint-400" : ""
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {goal.myArrears > 0 && (
        <p className="card border-amber-warm/30 bg-amber-warm/10 p-3 text-sm text-amber-warm">
          Llevas {formatMoney(goal.myArrears, currency)} de atraso. No pasa nada: abona de más
          cuando puedas y se empareja solo.
        </p>
      )}
    </section>
  );
}
