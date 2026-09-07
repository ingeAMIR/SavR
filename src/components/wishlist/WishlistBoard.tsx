"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Sheet } from "@/components/ui/Sheet";
import { Field, inputClass } from "@/components/ui/Field";
import { CoverPicker } from "@/components/goals/CoverPicker";
import {
  addWishlistItem,
  deleteWishlistItem,
  promoteWishlistItem,
} from "@/lib/actions/wishlist";
import { formatMoney, parseMoney } from "@/lib/savings/money";
import { addDays, todayISO } from "@/lib/savings/dates";
import type { WishlistItem } from "@/lib/supabase/types";

export function WishlistBoard({
  items,
  currency,
  userId,
}: {
  items: WishlistItem[];
  currency: string;
  userId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [promoting, setPromoting] = useState<WishlistItem | null>(null);
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 60));

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) return setError("Ponle nombre al deseo.");
    startTransition(async () => {
      const res = await addWishlistItem({
        name,
        estimatedAmount: parseMoney(price),
        linkUrl: link.trim() || null,
        imageUrl,
      });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      setName("");
      setPrice("");
      setLink("");
      setImageUrl(null);
      setOpen(false);
      router.refresh();
    });
  }

  function promote() {
    if (!promoting) return;
    startTransition(async () => {
      const res = await promoteWishlistItem(promoting.id, dueDate);
      if (!res.ok) return setError(res.error ?? "No se pudo crear la meta.");
      setPromoting(null);
      router.push(`/goals/${res.data as string}`);
    });
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-ink-600 px-5 py-4 text-sm text-ink-200 transition active:scale-[0.98]"
      >
        + Agregar deseo
      </button>

      {items.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-400">
          Nada en la lista todavía. Cuando completes una meta, SavR te propondrá una de aquí.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <li key={item.id} className="card overflow-hidden">
              <div className="h-24 bg-ink-700">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-2xl">✨</div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-ink-400">
                  {item.estimated_amount
                    ? formatMoney(item.estimated_amount, currency)
                    : "Sin precio"}
                </p>

                {item.promoted_goal_id ? (
                  <span className="block text-[11px] text-mint-400">Ya es meta activa</span>
                ) : (
                  <button
                    onClick={() => setPromoting(item)}
                    disabled={!item.estimated_amount}
                    className="w-full rounded-lg bg-mint-500/15 px-2 py-1.5 text-[11px] font-medium text-mint-300 transition active:scale-95 disabled:opacity-40"
                  >
                    Convertir en meta
                  </button>
                )}
                <button
                  onClick={() =>
                    startTransition(async () => {
                      await deleteWishlistItem(item.id);
                      router.refresh();
                    })
                  }
                  className="w-full text-[11px] text-ink-400 underline"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo deseo">
        <div className="space-y-4">
          <CoverPicker value={imageUrl} onChange={setImageUrl} userId={userId} />
          <Field label="¿Qué quieres?">
            <input
              className={inputClass}
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="Audífonos"
            />
          </Field>
          <Field label="Precio estimado">
            <input
              className={inputClass}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="2,499.00"
            />
          </Field>
          <Field label="Liga (opcional)">
            <input
              className={inputClass}
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          {error && <p className="text-sm text-coral">{error}</p>}
          <button
            onClick={submit}
            disabled={pending}
            className="w-full rounded-2xl bg-mint-500 px-5 py-4 font-semibold text-ink-950 transition active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Agregar a la wishlist"}
          </button>
        </div>
      </Sheet>

      <Sheet open={Boolean(promoting)} onClose={() => setPromoting(null)} title="Activar meta">
        <div className="space-y-4">
          <p className="text-sm text-ink-400">
            «{promoting?.name}» pasará a ser una alcancía activa con cuota diaria.
          </p>
          <Field label="Fecha límite">
            <input
              type="date"
              className={inputClass}
              value={dueDate}
              min={todayISO()}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          {error && <p className="text-sm text-coral">{error}</p>}
          <button
            onClick={promote}
            disabled={pending}
            className="w-full rounded-2xl bg-mint-500 px-5 py-4 font-semibold text-ink-950 transition active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Creando…" : "Activar meta"}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
