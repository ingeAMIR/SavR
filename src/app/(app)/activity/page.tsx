import Link from "next/link";

import { getGoalBundles, getProfile } from "@/lib/data/queries";
import { computeSummary, toGoalState, toGoalVM } from "@/lib/data/viewmodel";
import { todayISO } from "@/lib/savings/dates";
import { formatMoney } from "@/lib/savings/money";
import { StreakCalendar } from "@/components/home/StreakCalendar";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const profile = await getProfile();
  if (!profile) return null;

  const today = todayISO(profile.timezone);
  const bundles = await getGoalBundles(["active", "paused", "completed"]);
  const entries = bundles.map((b) => ({
    goal: toGoalVM(b, profile.id, today),
    state: toGoalState(b, today),
  }));
  const summary = computeSummary(entries, profile.id);

  const goalNames = new Map(entries.map((e) => [e.goal.id, e.goal.name]));
  const movements = bundles
    .flatMap((b) => b.contributions.map((c) => ({ ...c, goalName: goalNames.get(b.goal.id) })))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 60);

  // días cubiertos de la meta con el historial más largo, para el calendario
  const days = new Map<string, boolean>();
  for (const e of entries) {
    for (const cell of e.state.members[profile.id]?.ledger ?? []) {
      days.set(cell.date, (days.get(cell.date) ?? true) && cell.covered);
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <header>
        <h1 className="text-xl font-semibold">Actividad</h1>
        <p className="text-sm text-ink-400">
          Racha de {summary.streak} {summary.streak === 1 ? "día" : "días"} ·{" "}
          {formatMoney(summary.todayPaid, profile.currency)} abonados hoy
        </p>
      </header>

      <StreakCalendar days={Object.fromEntries(days)} today={today} />

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-medium">Movimientos recientes</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-ink-400">Todavía no hay movimientos.</p>
        ) : (
          <ol className="space-y-3">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
                <Link href={`/goals/${m.goal_id}`} className="min-w-0">
                  <span className="block truncate font-medium">{m.goalName}</span>
                  <span className="text-xs text-ink-400">
                    {new Date(m.created_at).toLocaleString("es-MX", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {m.note ? ` · ${m.note}` : ""}
                  </span>
                </Link>
                <span className="shrink-0 font-semibold tabular-nums text-mint-400">
                  +{formatMoney(m.amount, profile.currency)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
