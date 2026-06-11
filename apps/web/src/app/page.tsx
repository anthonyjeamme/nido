import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "./actions";

export default async function AccueilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  const prenom = profile?.display_name ?? user.email;
  const estAssmat = profile?.role === "assmat";

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Nido</h1>
        <form action={seDeconnecter}>
          <button
            type="submit"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm text-zinc-600 transition active:scale-[0.98]"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
        <p className="text-lg font-medium">Bonjour {prenom} 👋</p>
        <p className="mt-1 text-sm text-zinc-600">
          {estAssmat
            ? "Bienvenue dans votre espace. Votre tableau de bord « Ma journée » arrive bientôt."
            : "Bienvenue dans votre espace parent. La timeline de votre enfant arrive bientôt."}
        </p>
      </section>
    </main>
  );
}
