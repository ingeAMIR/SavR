"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useProfile } from "./ProfileProvider";

/**
 * Recordatorio "inteligente" del lado del cliente.
 *
 * Programa una notificación local a la hora elegida y sólo la dispara si el
 * usuario todavía no ha registrado su cuota del día (marca guardada por la
 * pantalla principal). Es una solución sin backend: funciona mientras la PWA
 * siga viva en segundo plano. Para un recordatorio garantizado hace falta Web
 * Push + un cron — ver DEPLOYMENT.md.
 */
export function ReminderScheduler() {
  const { profile, today } = useProfile();
  const pathname = usePathname();

  useEffect(() => {
    if (!profile.reminder_enabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const [h, m] = profile.reminder_time.split(":").map(Number);
    const now = new Date();
    const at = new Date(now);
    at.setHours(h, m ?? 0, 0, 0);
    if (at.getTime() <= now.getTime()) return; // ya pasó la hora de hoy

    const delay = at.getTime() - now.getTime();
    if (delay > 6 * 60 * 60 * 1000) return; // no programamos con más de 6 h de antelación

    const timer = setTimeout(() => {
      const paid = localStorage.getItem("savr:paid") === today;
      if (paid) return;
      new Notification("Tu cuota de hoy sigue pendiente", {
        body: "Un toque y sigues con tu racha 🔥",
        icon: "/icons/icon-192.png",
        tag: "savr-daily",
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [profile.reminder_enabled, profile.reminder_time, today, pathname]);

  return null;
}
