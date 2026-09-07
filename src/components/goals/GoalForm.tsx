"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CoverPicker } from "./CoverPicker";
import { Field, inputClass } from "@/components/ui/Field";
import { createGoal, updateGoal } from "@/lib/actions/goals";
import { formatMoney, parseMoney } from "@/lib/savings/money";
import { addDays, inclusiveDays, todayISO } from "@/lib/savings/dates";
import { dailyQuotaFor, suggestRounding } from "@/lib/savings/engine";
import type { GoalVM } from "@/lib/data/viewmodel";
import type { SurplusMode } from "@/lib/supabase/types";

const PRESET_MONTHS = [1, 3, 6, 12];

export function GoalForm({
  userId,
  currency,
  goal,
}: {
  userId: string;
  currency: string;
  goal?: GoalVM;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = Boolean(goal);

  const [name, setName] = useState(goal?.name ?? "");
  const [price, setPrice] = useState(goal ? (goal.targetAmount / 100).toString() : "");
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? addDays(todayISO(), 30));
  const [imageUrl, setImageUrl] = useState<string | null>(goal?.imageUrl ?? null);
  const [mode, setMode] = useState<SurplusMode>(goal?.surplusMode ?? "buffer");
  const [roundingStep, setRoundingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const startDate = goal?.startDate ?? today;
  const target = parseMoney(price) ?? 0;

  const preview = useMemo(() => {
    if (target <= 0 || !dueDate) return null;
    const plan = { targetAmount: target, startDate, dueDate, surplusMode: mode, roundingStep };
    return {
      days: inclusiveDays(startDate, dueDate),
      quota: dailyQuotaFor(target, plan),
      suggestion: roundingStep === 0 ? suggestRounding(target, plan) : null,
    };
  }, [target, dueDate, startDate, mode, roundingStep]);

  function setMonths(months: number) {
    const d = new Date(`${today}T00:00:00`);
    d.setMonth(d.getMonth() + months);
    setDueDate(d.toISOString().slice(0, 10));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Ponle nombre a tu meta.");
    if (target <= 0) return setError("Escribe el precio del artículo.");
    if (dueDate < today && !editing) return setError("La fecha límite ya pasó.");

    startTransition(async () => {
      const res = editing
        ? await updateGoal(goal!.id, {
            name: name.trim(),
            target_amount: target,
            due_date: dueDate,
            image_url: imageUrl,
            surplus_mode: mode,
            rounding_step: roundingStep,
          })
        : await createGoal({
            name,
            targetAmount: target,
            dueDate,
            imageUrl,
            surplusMode: mode,
            roundingStep,
          });

      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      router.push(editing ? `/goals/${goal!.id}` : `/goals/${res.data as string}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-8">
      <CoverPicker value={imageUrl} onChange={setImageUrl} userId={userId} />

      <Field label="¿Qué quieres?">
        <input
          className={inputClass}
          placeholder="Playera del América"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Precio total">
        <input
          className={inputClass}
          inputMode="decimal"
          placeholder="1,299.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </Field>

      <Field label="Fecha límite">
        <input
          type="date"
          className={inputClass}
          value={dueDate}
          min={today}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        {PRESET_MONTHS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonths(m)}
            className="rounded-full border border-ink-600 px-3 py-1.5 text-xs text-ink-200 transition active:scale-95"
          >
            {m === 12 ? "1 año" : `${m} ${m === 1 ? "mes" : "meses"}`}
          </button>
        ))}
      </div>

      {preview && (
        <div className="card space-y-3 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-400">Cuota diaria</span>
            <span className="text-xl font-semibold tabular-nums">
              {formatMoney(preview.quota, currency)}
            </span>
          </div>
          <p className="text-xs text-ink-400">
            {preview.days} días · {formatMoney(target, currency)} en total
          </p>

          {preview.suggestion && (
            <button
              type="button"
              onClick={() => setRoundingStep(preview.suggestion!.suggested)}
              className="w-full rounded-xl border border-mint-500/40 bg-mint-500/10 px-4 py-3 text-left text-sm transition active:scale-[0.98]"
            >
              <span className="font-medium text-mint-300">
                Redondea a {formatMoney(preview.suggestion.suggested, currency)}/día
              </span>
              <span className="mt-0.5 block text-xs text-ink-200/70">
                Terminas {preview.suggestion.daysSaved}{" "}
                {preview.suggestion.daysSaved === 1 ? "día" : "días"} antes.
              </span>
            </button>
          )}

          {roundingStep > 0 && (
            <button
              type="button"
              onClick={() => setRoundingStep(0)}
              className="text-xs text-ink-400 underline"
            >
              Quitar redondeo
            </button>
          )}
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
          Si abonas de más
        </legend>
        <ModeOption
          checked={mode === "buffer"}
          onSelect={() => setMode("buffer")}
          title="Adelantar días"
          description="El excedente cubre los días siguientes. La fecha meta no cambia y tu racha queda protegida."
        />
        <ModeOption
          checked={mode === "accelerate"}
          onSelect={() => setMode("accelerate")}
          title="Acortar el plazo"
          description="El excedente adelanta la fecha final. Tu cuota diaria se mantiene igual."
        />
      </fieldset>

      {error && <p className="text-sm text-coral">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-mint-500 px-5 py-4 font-semibold text-ink-950 transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear meta"}
      </button>
    </form>
  );
}

function ModeOption({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={`w-full rounded-xl border px-4 py-3 text-left transition active:scale-[0.98] ${
        checked ? "border-mint-500 bg-mint-500/10" : "border-ink-600"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <span
          className={`grid size-4 place-items-center rounded-full border ${
            checked ? "border-mint-400 bg-mint-400" : "border-ink-500"
          }`}
        >
          {checked && <span className="size-1.5 rounded-full bg-ink-950" />}
        </span>
        {title}
      </span>
      <span className="mt-1 block pl-6 text-xs leading-relaxed text-ink-400">{description}</span>
    </button>
  );
}
