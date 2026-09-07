"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Metas", icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" },
  {
    href: "/wishlist",
    label: "Wishlist",
    icon: "M12 21s-7.5-4.6-9.5-9A5.2 5.2 0 0 1 12 6.6 5.2 5.2 0 0 1 21.5 12c-2 4.4-9.5 9-9.5 9Z",
  },
  {
    href: "/activity",
    label: "Actividad",
    icon: "M3 12h4l2.5 7 5-14L17 12h4",
  },
  {
    href: "/profile",
    label: "Perfil",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2.2-7 5v1h14v-1c0-2.8-3-5-7-5Z",
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg border-t border-ink-700/70 bg-ink-900/90 px-2 pt-2 backdrop-blur-xl">
      <ul className="flex items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] transition ${
                  active ? "text-mint-400" : "text-ink-400"
                }`}
              >
                <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
                  <path
                    d={tab.icon}
                    fill={tab.href === "/activity" ? "none" : "currentColor"}
                    stroke={tab.href === "/activity" ? "currentColor" : "none"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
