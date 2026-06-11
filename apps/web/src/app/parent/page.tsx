import { createClient } from "@/lib/supabase/server";
import { pointerParent } from "./actions";

const TYPES_EVENEMENT: Record<string, string> = {
  repas: "🍽️",
  sieste: "😴",
  change: "🧷",
  activite: "🎨",
  humeur: "💛",
  note: "📝",
  arrivee_info: "🌅",
};

function decrisEvenement(type: string, payload: Record<string, unknown>): string {
  if (type === "repas") {
    const q: Record<string, string> = {
      tout: "a tout mangé",
      bien: "a bien mangé",
      peu: "a peu mangé",
      refus: "a refusé le repas",
    };
    return q[String(payload.quantite)] ?? "a mangé";
  }
  if (type === "sieste")
    return payload.duree_min ? `a dormi ${payload.duree_min} min` : "a fait la sieste";
  if (type === "change") return payload.selles ? "change (selles)" : "change";
  return String(payload.texte ?? "");
}

export default async function ParentAccueilPage() {
  const supabase = await createClient();
  const aujourdHui = new Date().toISOString().slice(0, 10);

  const { data: enfants } = await supabase
    .from("children")
    .select("id, prenom, nom")
    .is("deleted_at", null);

  if (!enfants?.length) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
        <h1 className="text-2xl font-bold">Bienvenue 👋</h1>
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          Aucun enfant n&apos;est encore rattaché à votre compte. Ouvrez le
          lien d&apos;invitation envoyé par votre assistante maternelle.
        </p>
      </div>
    );
  }

  const enfantIds = enfants.map((e) => e.id);
  const [{ data: contrats }, { data: evenements }, { data: pointages }, { data: recaps }] =
    await Promise.all([
      supabase
        .from("contracts")
        .select("id, child_id, parent_peut_pointer, statut")
        .in("child_id", enfantIds)
        .eq("statut", "actif"),
      supabase
        .from("daily_log_entries")
        .select("child_id, type, heure, payload")
        .in("child_id", enfantIds)
        .eq("date", aujourdHui)
        .order("heure"),
      supabase
        .from("attendance_events")
        .select("child_id, type, horodatage")
        .in("child_id", enfantIds)
        .gte("horodatage", `${aujourdHui}T00:00:00`)
        .order("horodatage"),
      supabase
        .from("daily_summaries")
        .select("child_id, date, contenu, statut")
        .in("child_id", enfantIds)
        .eq("statut", "envoye")
        .order("date", { ascending: false })
        .limit(7),
    ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 p-4">
      {enfants.map((enfant) => {
        const contrat = contrats?.find((c) => c.child_id === enfant.id);
        const evtsJour = evenements?.filter((e) => e.child_id === enfant.id) ?? [];
        const ptgJour = pointages?.filter((p) => p.child_id === enfant.id) ?? [];
        const present = ptgJour[ptgJour.length - 1]?.type === "in";
        const recap = recaps?.find(
          (r) => r.child_id === enfant.id && r.date === aujourdHui,
        );
        const motDuJour = (recap?.contenu as { mot_du_jour?: string } | null)
          ?.mot_du_jour;

        return (
          <section key={enfant.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{enfant.prenom}</h1>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  present
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {present ? "Chez l'assistante maternelle" : "Pas encore arrivé"}
              </span>
            </div>

            {contrat?.parent_peut_pointer && (
              <form action={pointerParent}>
                <input type="hidden" name="contract_id" value={contrat.id} />
                <input type="hidden" name="child_id" value={enfant.id} />
                <input type="hidden" name="type" value={present ? "out" : "in"} />
                <button
                  type="submit"
                  className={`h-12 w-full rounded-xl font-medium text-white active:scale-[0.98] ${
                    present ? "bg-zinc-700" : "bg-emerald-600"
                  }`}
                >
                  {present ? "Je récupère mon enfant (départ)" : "Je dépose mon enfant (arrivée)"}
                </button>
              </form>
            )}

            {motDuJour && (
              <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                💌 {motDuJour}
              </p>
            )}

            <div className="rounded-2xl border border-zinc-200 p-4">
              <h2 className="text-sm font-semibold">La journée d&apos;aujourd&apos;hui</h2>
              {ptgJour.length === 0 && evtsJour.length === 0 ? (
                <p className="mt-1 text-sm text-zinc-500">
                  Rien pour le moment — la journée s&apos;affichera ici au fil
                  de l&apos;eau.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  {ptgJour.map((p, i) => (
                    <li key={`p${i}`} className="flex gap-2">
                      <span>{p.type === "in" ? "🌅" : "🌙"}</span>
                      <span>
                        {p.type === "in" ? "Arrivée" : "Départ"} à{" "}
                        {new Date(p.horodatage).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                  {evtsJour.map((e, i) => (
                    <li key={`e${i}`} className="flex gap-2">
                      <span>{TYPES_EVENEMENT[e.type] ?? "•"}</span>
                      <span>
                        <span className="text-zinc-400">
                          {e.heure.slice(0, 5)}
                        </span>{" "}
                        {enfant.prenom}{" "}
                        {decrisEvenement(e.type, (e.payload ?? {}) as Record<string, unknown>)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
