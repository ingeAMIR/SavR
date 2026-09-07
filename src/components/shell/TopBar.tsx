import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import type { Profile } from "@/lib/supabase/types";

export function TopBar({ profile }: { profile: Profile }) {
  return (
    <header className="safe-top sticky top-0 z-30 flex items-center justify-between bg-ink-950/80 px-4 pb-3 backdrop-blur-lg">
      <Link href="/" aria-label="Inicio">
        <Logo size="sm" />
      </Link>
      <Link href="/profile" aria-label="Tu perfil" className="rounded-full">
        <Avatar
          src={profile.avatar_url}
          name={profile.full_name}
          email={profile.email}
          size={32}
        />
      </Link>
    </header>
  );
}
