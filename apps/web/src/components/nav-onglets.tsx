"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface Onglet {
  href: string;
  label: string;
  icone: string;
}

/** Barre d'onglets mobile avec état actif (pastille ambre). */
export function NavOnglets({ onglets }: { onglets: Onglet[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex max-w-lg px-1">
        {onglets.map((onglet) => {
          const actif =
            onglet.href === "/" || onglet.href === "/parent"
              ? pathname === onglet.href
              : pathname.startsWith(onglet.href);
          return (
            <Link
              key={onglet.href}
              href={onglet.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] transition ${
                actif
                  ? "font-semibold text-amber-900"
                  : "text-stone-500 active:bg-stone-50"
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full text-lg leading-none transition ${
                  actif ? "bg-amber-100" : ""
                }`}
              >
                {onglet.icone}
              </span>
              {onglet.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
