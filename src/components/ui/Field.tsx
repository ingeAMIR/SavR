export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-ink-50 outline-none transition placeholder:text-ink-400 focus:border-mint-500 focus:ring-2 focus:ring-mint-500/20";
