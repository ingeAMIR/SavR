"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { acceptInvitation } from "@/lib/actions/collab";

export function AcceptInvite({
  code,
  alreadyMember,
}: {
  code: string;
  alreadyMember: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    startTransition(async () => {
      const res = await acceptInvitation(code);
      if (!res.ok) return setError(res.error ?? "No se pudo aceptar.");
      router.push(`/goals/${res.data as string}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={accept}
        disabled={pending}
        className="w-full rounded-2xl bg-mint-500 px-5 py-4 font-semibold text-ink-950 transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Uniéndote…" : alreadyMember ? "Ir a la meta" : "Aceptar invitación"}
      </button>
      {error && <p className="text-sm text-coral">{error}</p>}
    </div>
  );
}
