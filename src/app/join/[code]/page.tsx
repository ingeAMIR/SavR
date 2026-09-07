import Link from "next/link";

import { peekInvitation } from "@/lib/actions/collab";
import { getSessionUser } from "@/lib/data/queries";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Logo } from "@/components/ui/Logo";
import { AcceptInvite } from "@/components/goals/AcceptInvite";
import { formatMoney } from "@/lib/savings/money";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  not_found: "Ese código de invitación no existe.",
  revoked: "La invitación fue cancelada por quien la creó.",
  already_used: "Esta invitación ya fue utilizada.",
  expired: "La invitación expiró. Pide una nueva.",
  goal_closed: "Esta meta ya está cerrada.",
};

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [preview, user] = await Promise.all([peekInvitation(code), getSessionUser()]);

  const invalid = !preview || preview.invalid_reason;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <Logo />

      {invalid ? (
        <div className="card space-y-4 p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🙈
          </p>
          <p className="text-sm text-ink-200">
            {REASONS[preview?.invalid_reason ?? "not_found"] ?? "Invitación no válida."}
          </p>
          <Link href="/" className="block text-sm text-mint-400 underline">
            Ir a SavR
          </Link>
        </div>
      ) : (
        <div className="card space-y-4 p-6">
          <p className="text-sm text-ink-400">
            {preview!.owner_name ?? "Alguien"} te invitó a ahorrar en conjunto
          </p>
          <h1 className="text-2xl font-semibold">{preview!.goal_name}</h1>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-400">Meta</dt>
              <dd className="font-semibold">{formatMoney(preview!.target_amount ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-400">Te toca</dt>
              <dd className="font-semibold text-mint-400">
                {Math.round((preview!.share_bps ?? 0) / 100)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-400">Fecha límite</dt>
              <dd>
                {new Date(`${preview!.due_date}T00:00:00`).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                })}
              </dd>
            </div>
          </dl>

          {user ? (
            <AcceptInvite code={code} alreadyMember={preview!.already_member} />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-400">
                Entra con Google para aceptar. Tu correo será tu identidad en la meta.
              </p>
              <GoogleButton next={`/join/${code}`} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
