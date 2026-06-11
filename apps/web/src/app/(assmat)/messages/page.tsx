import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { reglerPlageDispo } from "./actions";

export default async function MessagesAssmatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: assmat } = await supabase
    .from("assmats")
    .select("id, reglages_visibilite")
    .eq("profile_id", user!.id)
    .single();

  const { data: enfants } = await supabase
    .from("children")
    .select("id, prenom, nom")
    .is("deleted_at", null)
    .order("prenom");

  // Crée les fils manquants (un par enfant).
  const { data: threads } = await supabase.from("threads").select("id, child_id");
  const manquants = (enfants ?? []).filter(
    (e) => !threads?.some((t) => t.child_id === e.id),
  );
  if (manquants.length > 0 && assmat) {
    await supabase
      .from("threads")
      .insert(manquants.map((e) => ({ assmat_id: assmat.id, child_id: e.id })));
  }

  const { data: derniers } = await supabase
    .from("messages")
    .select("thread_id, contenu, created_at, traite_le, type, threads (child_id)")
    .order("created_at", { ascending: false })
    .limit(50);

  const plage = (assmat?.reglages_visibilite as { plage_dispo?: { debut: string; fin: string } | null } | null)
    ?.plage_dispo;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Messages</h1>

      <details className="rounded-2xl border border-stone-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium">
          🔕 Mes horaires de disponibilité
          {plage ? ` : ${plage.debut} – ${plage.fin}` : " (non définis)"}
        </summary>
        <p className="mt-2 text-xs text-stone-500">
          Hors de ces horaires, les parents sont prévenus que leur message
          sera lu plus tard — et vous ne recevrez pas de notification.
        </p>
        <form action={reglerPlageDispo} className="mt-3 flex items-center gap-2">
          <input
            name="debut" type="time" defaultValue={plage?.debut ?? "07:30"}
            className="h-10 rounded-lg border border-stone-300 bg-white px-2 text-sm"
          />
          <span className="text-stone-400">→</span>
          <input
            name="fin" type="time" defaultValue={plage?.fin ?? "19:00"}
            className="h-10 rounded-lg border border-stone-300 bg-white px-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm active:bg-stone-50"
          >
            Enregistrer
          </button>
        </form>
      </details>

      <ul className="flex flex-col gap-2">
        {(enfants ?? []).map((enfant) => {
          const dernier = derniers?.find(
            (m) => m.threads?.child_id === enfant.id,
          );
          const aTraiter = derniers?.some(
            (m) =>
              m.threads?.child_id === enfant.id &&
              m.type !== "libre" &&
              !m.traite_le,
          );
          return (
            <li key={enfant.id}>
              <Link
                href={`/messages/${enfant.id}`}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 active:bg-stone-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg">
                  {enfant.prenom[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    Famille de {enfant.prenom}
                    {aTraiter && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        à confirmer
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-sm text-stone-500">
                    {dernier?.contenu ?? "Aucun message"}
                  </span>
                </span>
                <span className="text-stone-300">›</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
