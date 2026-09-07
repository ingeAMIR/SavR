"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Sincronización en tiempo real.
 *
 * En lugar de mantener un store cliente paralelo, escuchamos los cambios de
 * Postgres y pedimos a Next que revalide los Server Components. Es una sola
 * fuente de verdad (el servidor, con RLS aplicada) y el diff de RSC hace que la
 * actualización se sienta instantánea.
 */
export function RealtimeRefresher({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    // agrupamos ráfagas (p. ej. el botón maestro inserta N filas de golpe)
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase
      .channel(`savr:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contributions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_members" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, refresh)
      .subscribe();

    // al volver del segundo plano el día pudo cambiar
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
