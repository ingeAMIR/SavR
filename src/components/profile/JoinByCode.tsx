"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { acceptInvitation } from "@/lib/actions/collab";
import { inputClass } from "@/components/ui/Field";

export function JoinByCode() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function join() {
    if (code.trim().length < 4) return setError("Escribe el código completo.");
    startTransition(async () => {
      const res = await acceptInvitation(code.trim());
      if (!res.ok) return setError(res.error ?? "No se pudo unir.");
      router.push(`/goals/${res.data as string}`);
    });
  }

  return (
    <section className="card space-y-3 p-4">
      <h2 className="text-sm font-medium">Unirme a una meta</h2>
      <div className="flex gap-2">
        <input
          className={`${inputClass} font-mono uppercase tracking-widest`}
          placeholder="ABC1234"
          value={code}
          maxLength={12}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
        />
        <button
          onClick={join}
          disabled={pending}
          className="shrink-0 rounded-xl bg-mint-500 px-4 font-semibold text-ink-950 transition active:scale-95 disabled:opacity-60"
        >
          {pending ? "…" : "Unirme"}
        </button>
      </div>
      {error && <p className="text-sm text-coral">{error}</p>}
    </section>
  );
}
