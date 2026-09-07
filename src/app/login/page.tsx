import { Suspense } from "react";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Logo } from "@/components/ui/Logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-between px-6 py-12">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <Logo size="lg" />

        <div className="max-w-sm space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-ink-50">
            Tu alcancía digital,
            <br />
            <span className="text-mint-400">un día a la vez</span>
          </h1>
          <p className="text-sm leading-relaxed text-ink-200/80">
            Convierte lo que quieres comprar en una meta con cuota diaria. Solo o en equipo, con
            progreso sincronizado al instante.
          </p>
        </div>

        <ul className="w-full max-w-sm space-y-2 text-left text-sm text-ink-200/70">
          {[
            "Cuota diaria calculada automáticamente",
            "Metas compartidas 50/50 o como quieras",
            "Racha, hitos y gastos hormiga evitados",
          ].map((f) => (
            <li key={f} className="flex items-center gap-3">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-mint-500/15 text-[10px] text-mint-400">
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {error && (
          <p className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-center text-sm text-coral">
            {decodeURIComponent(error)}
          </p>
        )}
        <Suspense>
          <GoogleButton next={next} />
        </Suspense>
        <p className="text-center text-xs leading-relaxed text-ink-400">
          SavR no mueve dinero real. Es un simulador de ahorro y seguimiento de hábitos.
        </p>
      </div>
    </main>
  );
}
