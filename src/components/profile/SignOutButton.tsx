"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/actions/profile";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => signOut())}
      disabled={pending}
      className="w-full rounded-2xl border border-ink-600 px-5 py-4 text-sm text-ink-200 transition active:scale-[0.98]"
    >
      {pending ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
