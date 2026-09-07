export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "size-16" : size === "md" ? "size-10" : "size-8";
  const text = size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-base";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${box} grid place-items-center rounded-2xl bg-gradient-to-br from-mint-400 to-mint-600 shadow-lg shadow-mint-600/20`}
      >
        <svg viewBox="0 0 24 24" className="size-1/2 text-ink-950" aria-hidden>
          <path
            fill="currentColor"
            d="M12 2a1 1 0 0 1 1 1v1.06A8 8 0 0 1 20 12v5.5a2.5 2.5 0 0 1-2.5 2.5h-.75l-.4 1.2a1 1 0 0 1-.95.68h-1.6a1 1 0 0 1-.95-.68l-.2-.6h-3.3l-.2.6a1 1 0 0 1-.95.68h-1.6a1 1 0 0 1-.95-.68L4.25 20H4.5A2.5 2.5 0 0 1 2 17.5V14a2 2 0 0 1 2-2h.28A8 8 0 0 1 11 4.06V3a1 1 0 0 1 1-1Zm4 8a1.25 1.25 0 1 0 0 2.5A1.25 1.25 0 0 0 16 10Z"
          />
        </svg>
      </div>
      <span className={`${text} font-semibold tracking-tight`}>
        Sav<span className="text-mint-400">R</span>
      </span>
    </div>
  );
}
