"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Sube la portada a Storage bajo `goal-covers/<uid>/…` y devuelve la URL pública. */
export function CoverPicker({
  value,
  onChange,
  userId,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  userId: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) return setError("La imagen debe pesar menos de 5 MB.");

    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("goal-covers")
      .upload(path, file, { cacheControl: "31536000", upsert: false });

    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }
    const { data } = supabase.storage.from("goal-covers").getPublicUrl(path);
    onChange(data.publicUrl);
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="relative grid h-36 w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-ink-600 bg-ink-800 text-sm text-ink-400 transition active:scale-[0.99]"
      >
        {value ? (
          <img src={value} alt="Portada" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1">
            <span className="text-2xl" aria-hidden>
              📷
            </span>
            {busy ? "Subiendo…" : "Agregar foto del artículo"}
          </span>
        )}
      </button>

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-ink-400 underline"
        >
          Quitar foto
        </button>
      )}
      {error && <p className="text-xs text-coral">{error}</p>}

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
