import { addDays } from "@/lib/savings/dates";

/** Últimas 5 semanas: verde = día cubierto, ámbar = fallado. */
export function StreakCalendar({
  days,
  today,
}: {
  days: Record<string, boolean>;
  today: string;
}) {
  const cells = Array.from({ length: 35 }, (_, i) => addDays(today, i - 34));

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-medium">Tus últimos 35 días</h2>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date) => {
          const state = days[date];
          const cls =
            state === undefined
              ? "bg-ink-700/50"
              : state
                ? "bg-mint-500"
                : "bg-amber-warm/60";
          return (
            <span
              key={date}
              title={date}
              className={`aspect-square rounded-[5px] ${cls} ${date === today ? "ring-2 ring-ink-50/60" : ""}`}
            />
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-mint-500" /> cumplido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-amber-warm/60" /> pendiente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-ink-700/50" /> sin metas
        </span>
      </div>
    </section>
  );
}
