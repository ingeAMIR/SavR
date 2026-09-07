export function Progress({
  value,
  className = "",
  milestones = false,
  tone = "mint",
}: {
  value: number; // 0..1
  className?: string;
  milestones?: boolean;
  tone?: "mint" | "amber";
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const bar = tone === "amber" ? "from-amber-warm to-amber-warm" : "from-mint-500 to-mint-300";

  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-ink-700 ${className}`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${bar} transition-[width] duration-500`}
        style={{ width: `${pct}%` }}
      />
      {milestones &&
        [25, 50, 75].map((m) => (
          <span
            key={m}
            className="absolute top-0 h-full w-px bg-ink-950/60"
            style={{ left: `${m}%` }}
          />
        ))}
    </div>
  );
}
