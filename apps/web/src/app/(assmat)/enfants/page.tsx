import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function age(dateNaissance: string): string {
  const naissance = new Date(dateNaissance);
  const mois =
    (Date.now() - naissance.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (mois < 24) return `${Math.floor(mois)} mois`;
  return `${Math.floor(mois / 12)} ans`;
}

export default async function EnfantsPage() {
  const supabase = await createClient();
  const { data: enfants } = await supabase
    .from("children")
    .select("id, prenom, nom, date_naissance")
    .is("deleted_at", null)
    .order("prenom");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Enfants</h1>
        <Link
          href="/enfants/nouveau"
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98]"
        >
          + Ajouter
        </Link>
      </div>

      {!enfants?.length ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          Aucun enfant pour le moment. Ajoutez les enfants que vous accueillez
          pour créer leurs contrats et suivre leurs journées.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {enfants.map((enfant) => (
            <li key={enfant.id}>
              <Link
                href={`/enfants/${enfant.id}`}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-4 active:bg-zinc-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg">
                  {enfant.prenom[0]}
                </span>
                <span className="flex-1">
                  <span className="block font-medium">
                    {enfant.prenom} {enfant.nom}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {age(enfant.date_naissance)}
                  </span>
                </span>
                <span className="text-zinc-300">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
