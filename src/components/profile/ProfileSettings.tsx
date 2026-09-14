"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Field, inputClass } from "@/components/ui/Field";
import { updateProfile } from "@/lib/actions/profile";
import { NotificationToggle } from "./NotificationToggle";
import type { Profile } from "@/lib/supabase/types";

const CURRENCIES = ["MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN"];

export function ProfileSettings({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [currency, setCurrency] = useState(profile.currency);
  const [reminderTime, setReminderTime] = useState(profile.reminder_time.slice(0, 5));
  const [saved, setSaved] = useState(false);

  function save(patch: Parameters<typeof updateProfile>[0]) {
    startTransition(async () => {
      await updateProfile(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    });
  }

  return (
    <section className="card space-y-4 p-4">
      <h2 className="text-sm font-medium">Preferencias</h2>

      <Field label="Moneda">
        <select
          className={inputClass}
          value={currency}
          onChange={(e) => {
            setCurrency(e.target.value);
            save({ currency: e.target.value });
          }}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Recordatorio nocturno"
        hint="Sólo te avisa si a esa hora todavía no has abonado tu cuota del día."
      >
        <input
          type="time"
          className={`${inputClass} min-w-0`}
          value={reminderTime}
          onChange={(e) => {
            setReminderTime(e.target.value);
            save({ reminder_time: `${e.target.value}:00` });
          }}
        />
      </Field>

      <NotificationToggle
        enabled={profile.reminder_enabled}
        onChange={(v) => save({ reminder_enabled: v })}
      />

      <p className="text-xs text-ink-400">
        Zona horaria: {profile.timezone}
        {pending && " · guardando…"}
        {saved && " · guardado ✓"}
      </p>
    </section>
  );
}
