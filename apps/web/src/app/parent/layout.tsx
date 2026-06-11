import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NavOnglets } from "@/components/nav-onglets";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "../actions";

const ONGLETS = [
  { href: "/parent", label: "Mon enfant", icone: "🧒" },
  { href: "/parent/bulletins", label: "Bulletins", icone: "💶" },
  { href: "/parent/messages", label: "Messages", icone: "💬" },
];

export default async function ParentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "parent") {
    redirect("/");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200/70 bg-white/85 px-4 py-3 backdrop-blur">
        <Link href="/parent" className="flex items-center gap-2">
          <Image
            src="/icons/icon.svg"
            alt=""
            width={28}
            height={28}
            className="rounded-lg"
          />
          <span className="text-xl font-bold tracking-tight text-stone-900">
            Nido
          </span>
        </Link>
        <form action={seDeconnecter}>
          <button
            type="submit"
            className="rounded-full px-3 py-1.5 text-sm text-stone-500 active:bg-stone-100"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <NavOnglets onglets={ONGLETS} />
    </div>
  );
}
