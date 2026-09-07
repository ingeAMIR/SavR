"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { GoalVM } from "@/lib/data/viewmodel";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalRow } from "@/components/goals/GoalRow";

type View = "cards" | "list";
const STORAGE_KEY = "savr:view";

export function GoalCatalog({ goals, currency }: { goals: GoalVM[]; currency: string }) {
  const [view, setView] = useState<View>("cards");

  // la preferencia de vista es del dispositivo, no de la cuenta
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "cards" || saved === "list") setView(saved);
    } catch {
      /* modo privado */
    }
  }, []);

  function choose(next: View) {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignorar */
    }
  }

  const active = goals.filter((g) => g.status === "active");
  const others = goals.filter((g) => g.status !== "active");

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink-200">Tus alcancías</h2>
        <div className="flex items-center gap-1 rounded-xl border border-ink-700 p-1">
          <ViewButton active={view === "cards"} onClick={() => choose("cards")} label="Tarjetas">
            <path d="M4 5h16v6H4zM4 13h16v6H4z" />
          </ViewButton>
          <ViewButton active={view === "list"} onClick={() => choose("list")} label="Lista">
            <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" stroke="currentColor" fill="none" />
          </ViewButton>
        </div>
      </div>

      {view === "cards" ? (
        <div className="space-y-3">
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} currency={currency} />
          ))}
        </div>
      ) : (
        <ul className="card divide-y divide-ink-700 overflow-hidden">
          {active.map((g) => (
            <GoalRow key={g.id} goal={g} currency={currency} />
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm text-ink-400">
            Pausadas y completadas ({others.length})
          </summary>
          <div className="mt-3 space-y-3">
            {others.map((g) => (
              <GoalCard key={g.id} goal={g} currency={currency} />
            ))}
          </div>
        </details>
      )}

      <Link
        href="/goals/new"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-600 px-5 py-4 text-sm text-ink-200 transition active:scale-[0.98]"
      >
        + Nueva meta
      </Link>
    </section>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Vista ${label}`}
      aria-pressed={active}
      className={`rounded-lg p-1.5 transition ${
        active ? "bg-ink-700 text-mint-400" : "text-ink-400"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
