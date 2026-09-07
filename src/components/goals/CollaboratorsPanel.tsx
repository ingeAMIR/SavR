"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { Field, inputClass } from "@/components/ui/Field";
import {
  createInvitation,
  leaveGoal,
  removeMember,
  revokeInvitation,
  updateShares,
} from "@/lib/actions/collab";
import { formatMoney } from "@/lib/savings/money";
import type { GoalVM } from "@/lib/data/viewmodel";
import type { Invitation } from "@/lib/supabase/types";

const SPLIT_PRESETS = [
  { label: "50 / 50", bps: 5000 },
  { label: "70 / 30", bps: 3000 },
  { label: "60 / 40", bps: 4000 },
];

export function CollaboratorsPanel({
  goal,
  invitations,
  currency,
  meId,
}: {
  goal: GoalVM;
  invitations: Invitation[];
  currency: string;
  meId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [shareBps, setShareBps] = useState(5000);
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");

  function invite() {
    setError(null);
    startTransition(async () => {
      const res = await createInvitation({ goalId: goal.id, email: email || null, shareBps });
      if (!res.ok) return setError(res.error ?? "No se pudo crear la invitación.");
      setCreated(res.data as string);
      router.refresh();
    });
  }

  async function copyLink(code: string) {
    const link = `${origin}/join/${code}`;
    try {
      if (navigator.share) await navigator.share({ title: goal.name, url: link });
      else await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el usuario canceló */
    }
  }

  function applySplit(collaboratorBps: number, collaboratorId: string) {
    startTransition(async () => {
      const shares: Record<string, number> = {};
      for (const m of goal.members) {
        shares[m.userId] =
          m.userId === collaboratorId ? collaboratorBps : m.userId === goal.ownerId ? 0 : m.shareBps;
      }
      const others = Object.entries(shares)
        .filter(([id]) => id !== goal.ownerId)
        .reduce((s, [, v]) => s + v, 0);
      shares[goal.ownerId] = 10000 - others;
      const res = await updateShares(goal.id, shares);
      if (!res.ok) setError(res.error ?? null);
      router.refresh();
    });
  }

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">
          {goal.isShared ? "Colaboradores" : "Modo dúo"}
        </h2>
        {goal.isOwner && (
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs transition active:scale-95"
          >
            + Invitar
          </button>
        )}
      </div>

      {!goal.isShared && (
        <p className="text-xs text-ink-400">
          Invita a alguien y repartan la cuota diaria. Cada quien abona sólo su parte.
        </p>
      )}

      <ul className="space-y-2">
        {goal.members.map((m) => (
          <li key={m.userId} className="flex items-center gap-3">
            <Avatar src={m.avatar_url} name={m.name} email={m.email} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.name ?? m.email}
                {m.userId === meId && <span className="text-ink-400"> · tú</span>}
              </p>
              <p className="text-xs text-ink-400">
                {Math.round(m.shareBps / 100)}% · {formatMoney(m.saved, currency)} de{" "}
                {formatMoney(m.targetShare, currency)}
              </p>
            </div>
            <span
              className={`text-xs ${m.todayCovered ? "text-mint-400" : "text-ink-400"}`}
              title={m.todayCovered ? "Cuota de hoy cubierta" : "Pendiente hoy"}
            >
              {m.todayCovered ? "✓" : "○"}
            </span>
            {goal.isOwner && m.role !== "owner" && (
              <button
                onClick={() =>
                  startTransition(async () => {
                    await removeMember(goal.id, m.userId);
                    router.refresh();
                  })
                }
                className="text-xs text-ink-400 underline"
              >
                Quitar
              </button>
            )}
          </li>
        ))}
      </ul>

      {goal.isOwner && goal.isShared && (
        <div className="space-y-2 border-t border-ink-700 pt-3">
          <p className="text-xs text-ink-400">Reparto rápido</p>
          <div className="flex flex-wrap gap-2">
            {SPLIT_PRESETS.map((p) => {
              const collab = goal.members.find((m) => m.role !== "owner");
              if (!collab) return null;
              return (
                <button
                  key={p.label}
                  onClick={() => applySplit(p.bps, collab.userId)}
                  disabled={pending}
                  className="rounded-full border border-ink-600 px-3 py-1.5 text-xs transition active:scale-95"
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!goal.isOwner && (
        <button
          onClick={() =>
            startTransition(async () => {
              await leaveGoal(goal.id);
              router.push("/");
            })
          }
          className="text-xs text-ink-400 underline"
        >
          Salir de esta meta
        </button>
      )}

      {invitations.length > 0 && (
        <ul className="space-y-1 border-t border-ink-700 pt-3 text-xs">
          {invitations.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-2">
              <span className="text-ink-400">
                Código <span className="font-mono text-ink-200">{inv.code}</span>
                {inv.invited_email && ` · ${inv.invited_email}`}
              </span>
              <span className="flex gap-2">
                <button onClick={() => copyLink(inv.code)} className="text-mint-400 underline">
                  {copied ? "¡Listo!" : "Compartir"}
                </button>
                <button
                  onClick={() =>
                    startTransition(async () => {
                      await revokeInvitation(inv.id, goal.id);
                      router.refresh();
                    })
                  }
                  className="text-ink-400 underline"
                >
                  Cancelar
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setCreated(null);
        }}
        title="Invitar a esta meta"
      >
        {created ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-ink-400">Comparte este código o el enlace:</p>
            <p className="font-mono text-3xl tracking-[0.3em] text-mint-300">{created}</p>
            <button
              onClick={() => copyLink(created)}
              className="w-full rounded-2xl bg-mint-500 px-5 py-4 font-semibold text-ink-950 transition active:scale-95"
            >
              {copied ? "¡Enlace copiado!" : "Compartir enlace"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Field
              label="Correo de Google (opcional)"
              hint="Si lo llenas, sólo esa cuenta podrá aceptar la invitación."
            >
              <input
                className={inputClass}
                type="email"
                inputMode="email"
                placeholder="persona@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="¿Qué porcentaje le toca?">
              <div className="flex gap-2">
                {[2500, 3000, 5000, 7000].map((bps) => (
                  <button
                    key={bps}
                    type="button"
                    onClick={() => setShareBps(bps)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition active:scale-95 ${
                      shareBps === bps ? "border-mint-500 bg-mint-500/10 text-mint-300" : "border-ink-600"
                    }`}
                  >
                    {bps / 100}%
                  </button>
                ))}
              </div>
            </Field>

            {error && <p className="text-sm text-coral">{error}</p>}

            <button
              onClick={invite}
              disabled={pending}
              className="w-full rounded-2xl bg-mint-500 px-5 py-4 font-semibold text-ink-950 transition active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Generando…" : "Generar invitación"}
            </button>
          </div>
        )}
      </Sheet>
    </section>
  );
}
