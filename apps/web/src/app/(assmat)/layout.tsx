import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "../actions";

const ONGLETS = [
  { href: "/", label: "Ma journée", icone: "🏠" },
  { href: "/enfants", label: "Enfants", icone: "🧒" },
  { href: "/contrats", label: "Contrats", icone: "📋" },
  { href: "/paie", label: "Paie", icone: "💶" },
];

export default async function AssmatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Nido
        </Link>
        <form action={seDeconnecter}>
          <button
            type="submit"
            className="text-sm text-zinc-500 underline-offset-2 active:underline"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-lg">
          {ONGLETS.map((onglet) => (
            <Link
              key={onglet.href}
              href={onglet.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs text-zinc-600 active:bg-zinc-50"
            >
              <span className="text-xl leading-none">{onglet.icone}</span>
              {onglet.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
