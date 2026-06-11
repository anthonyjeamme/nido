import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MaJourneePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  const { count: nbEnfants } = await supabase
    .from("children")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  const prenom = profile?.display_name ?? "";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">
        Bonjour{prenom ? ` ${prenom}` : ""} 👋
      </h1>

      {nbEnfants === 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <p className="font-medium">Bienvenue dans votre espace !</p>
          <p className="text-sm text-zinc-600">
            Commencez par ajouter les enfants que vous accueillez, puis créez
            leurs contrats. Votre tableau de bord « Ma journée » prendra vie
            avec le pointage et le journal de bord.
          </p>
          <Link
            href="/enfants/nouveau"
            className="rounded-xl bg-zinc-900 px-4 py-3 text-center font-medium text-white active:scale-[0.98]"
          >
            Ajouter mon premier enfant
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-sm text-zinc-600">
            Le pointage et le journal de bord arrivent à la prochaine étape —
            votre journée s&apos;affichera ici.
          </p>
        </div>
      )}
    </div>
  );
}
