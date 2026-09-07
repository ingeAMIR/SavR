"use client";

import { useEffect, useState } from "react";

export function NotificationToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
  }, []);

  async function toggle() {
    if (!enabled && permission === "default" && typeof Notification !== "undefined") {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;
    }
    onChange(!enabled);
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={toggle}
        role="switch"
        aria-checked={enabled}
        className="flex w-full items-center justify-between rounded-xl border border-ink-600 px-4 py-3 text-sm transition active:scale-[0.98]"
      >
        <span>Recordarme por la noche</span>
        <span
          className={`relative h-6 w-11 rounded-full transition ${
            enabled ? "bg-mint-500" : "bg-ink-600"
          }`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-ink-50 transition-all ${
              enabled ? "left-[22px]" : "left-0.5"
            }`}
          />
        </span>
      </button>

      {permission === "denied" && (
        <p className="text-xs text-amber-warm">
          Tu navegador bloqueó las notificaciones. Habilítalas en los ajustes del sitio.
        </p>
      )}
      {permission === "unsupported" && (
        <p className="text-xs text-ink-400">
          Este navegador no soporta notificaciones. Instala SavR en tu pantalla de inicio.
        </p>
      )}
    </div>
  );
}
