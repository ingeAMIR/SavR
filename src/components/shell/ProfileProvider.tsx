"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/lib/supabase/types";

interface Ctx {
  profile: Profile;
  /** Día civil del usuario, calculado en el servidor para evitar saltos de TZ. */
  today: string;
}

const ProfileCtx = createContext<Ctx | null>(null);

export function ProfileProvider({
  profile,
  today,
  children,
}: Ctx & { children: React.ReactNode }) {
  return <ProfileCtx.Provider value={{ profile, today }}>{children}</ProfileCtx.Provider>;
}

export function useProfile(): Ctx {
  const ctx = useContext(ProfileCtx);
  if (!ctx) throw new Error("useProfile debe usarse dentro de ProfileProvider");
  return ctx;
}
