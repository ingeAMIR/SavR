"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Sheet } from "@/components/ui/Sheet";
import { Field, inputClass } from "@/components/ui/Field";
import { addContribution } from "@/lib/actions/goals";
import { formatMoney, parseMoney } from "@/lib/savings/money";
import type { GoalVM } from "@/lib/data/viewmodel";

export function AddContribution({ goal, currency }: { goal: GoalVM; currency: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const disabled = goal.status !== "active" || goal.isComplete;

  function quickPay(cents: number, kind: "daily" | "manual" = "daily") {
    startTransition(async () => {
      const res = await addContribution({ goalId: goal.id, amount: cents, kind });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      router.refresh();
    });
  }

  function submitCustom() {
    const cents = parseMoney(amount);
    if (!cents || cents <= 0) return setError("Escribe un monto válido.");
    startTransition(async () => {
      const res = await addContribution({
        goalId: goal.id,
        amount: cents,
        kind: "manual",
        note: note.trim() || null,
      });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      setAmount("");
      setNote("");
      setOpen(false);
      router.refresh();
    });
  }

  if (disabled) {
    return (
      <p className="card p-4 text-center text-sm text-ink-400">
        {goal.isComplete ? "Meta completada 🎉" : "Meta en pausa"}
      </p>
    );
  }

  return (
    <section className="space-y-2">
      <button
        onClick={() => quickPay(goal.myTodayCharge)}
        disabled={pending || goal.myTodayCharge === 0}
        className={`w-full rounded-2xl px-5 py-4 font-semibold transition active:scale-[0.98] ${
          goal.myTodayCharge === 0
            ? "border border-mint-500/30 bg-mint-500/10 text-mint-300"
            : "bg-mint-500 text-ink-950"
        }`}
      >
        {goal.myTodayCharge === 0
          ? "✓ Tu cuota de hoy está cubierta"
          : pending
            ? "Registrando…"
            : `Abonar cuota de hoy · ${formatMoney(goal.myTodayCharge, currency)}`}
      </button>

      <div className="grid grid-cols-2 gap-2">
        {goal.myArrears > 0 && (
          <button
            onClick={() => quickPay(goal.myArrears, "manual")}
            disabled={pending}
            className="rounded-xl border border-amber-warm/40 px-4 py-3 text-sm text-amber-warm transition active:scale-95"
          >
            Ponerme al día · {formatMoney(goal.myArrears, currency)}
          </button>
        )}
        <button
          onClick={() => setOpen(true)}
          className={`rounded-xl border border-ink-600 px-4 py-3 text-sm text-ink-200 transition active:scale-95 ${
            goal.myArrears > 0 ? "" : "col-span-2"
          }`}
        >
          Otro monto
        </button>
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      <Sheet open={open} onClose={() => setOpen(false)} title="Abonar a esta meta">
        <div className="space-y-4">
          <Field
            label="Monto"
            hint={
              goal.surplusMode === "buffer"
                ? "El excedente cubrirá tus próximos días."
                : "El excedente adelantará tu fecha meta."
            }
          >
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
          <Field label="Nota (opcional)">
            <input
              className={inputClass}
              placeholder="Vendí unos tenis"
              value={note}
              maxLength={140}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-coral">{error}</p>}
          <button
            onClick={submitCustom}
            disabled={pending}
            className="w-full rounded-2xl bg-mint-500 px-5 py-4 font-semibold text-ink-950 transition active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Abonar"}
          </button>
        </div>
      </Sheet>
    </section>
  );
}
