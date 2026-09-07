"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Sheet } from "@/components/ui/Sheet";
import { Field, inputClass } from "@/components/ui/Field";
import { addContribution } from "@/lib/actions/goals";
import { formatMoney, parseMoney } from "@/lib/savings/money";

/** Micro-ahorros típicos, en centavos. Ajustables por el usuario. */
const PRESETS = [
  { label: "☕️ Café fuera", amount: 6_500 },
  { label: "🍟 Botana", amount: 3_500 },
  { label: "🚕 Viaje corto", amount: 8_000 },
  { label: "🥤 Refresco", amount: 2_500 },
  { label: "🍺 Chela", amount: 5_000 },
  { label: "🛒 Antojo", amount: 10_000 },
];

export function MicroSaveSheet({
  open,
  onClose,
  currency,
  goals,
}: {
  open: boolean;
  onClose: () => void;
  currency: string;
  goals: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const cents = parseMoney(amount);
    if (!cents || cents <= 0) return setError("Escribe un monto válido.");
    if (!goalId) return setError("Elige a qué meta va.");

    startTransition(async () => {
      const res = await addContribution({
        goalId,
        amount: cents,
        kind: "micro",
        note: label.trim() || "Gasto hormiga evitado",
      });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      setAmount("");
      setLabel("");
      onClose();
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Gasto hormiga evitado">
      <div className="space-y-4">
        <p className="text-sm text-ink-400">
          ¿Qué no compraste hoy? Manda ese dinero a una de tus alcancías.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setAmount((p.amount / 100).toString());
                setLabel(p.label);
                setError(null);
              }}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition active:scale-95 ${
                label === p.label
                  ? "border-mint-500 bg-mint-500/10 text-mint-300"
                  : "border-ink-600 text-ink-200"
              }`}
            >
              <span className="block">{p.label}</span>
              <span className="text-xs text-ink-400">{formatMoney(p.amount, currency)}</span>
            </button>
          ))}
        </div>

        <Field label="Monto">
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
          />
        </Field>

        <Field label="Concepto">
          <input
            className={inputClass}
            placeholder="Café de la tarde"
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Field>

        <Field label="Va a la meta">
          <select className={inputClass} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>

        {error && <p className="text-sm text-coral">{error}</p>}

        <button
          onClick={submit}
          disabled={pending || goals.length === 0}
          className="w-full rounded-2xl bg-mint-500 px-5 py-4 font-semibold text-ink-950 transition active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar micro-ahorro"}
        </button>
      </div>
    </Sheet>
  );
}
