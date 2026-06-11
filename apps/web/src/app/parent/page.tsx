import { lundiDeLaSemaine } from "@nido/paie-engine";
import { createClient } from "@/lib/supabase/server";
import { pointerParent, signalerReappro, signalerSymptome } from "./actions";

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
        <p className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-600">
          Aucun enfant n&apos;est encore rattaché à votre compte. Ouvrez le
          lien d&apos;invitation envoyé par votre assistante maternelle.
        </p>
      </div>
    );
  }

  const enfantIds = enfants.map((e) => e.id);
  const semaine = lundiDeLaSemaine(new Date());
  const [
    { data: contrats },
    { data: evenements },
    { data: pointages },
    { data: recaps },
    { data: santeJour },
    { data: stocks },
    { data: menus },
  ] = await Promise.all([
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
      supabase
        .from("health_events")
        .select("child_id, type, heure, payload")
        .in("child_id", enfantIds)
        .gte("heure", `${aujourdHui}T00:00:00`)
        .order("heure"),
      supabase
        .from("supplies")
        .select("id, child_id, quantite, seuil_alerte, label")
        .in("child_id", enfantIds)
        .eq("type", "couches"),
      supabase.from("menus").select("semaine, entrees").eq("semaine", semaine).eq("publie", true),
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
        const santeEnfant = santeJour?.filter((s) => s.child_id === enfant.id) ?? [];
        const fievre = santeEnfant.find((s) => s.type === "fievre");
        const stock = stocks?.find((s) => s.child_id === enfant.id);
        const menuSemaine = menus?.[0]?.entrees as
          | Record<string, { midi?: string; gouter?: string }>
          | undefined;

        return (
          <section key={enfant.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{enfant.prenom}</h1>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  present
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-stone-100 text-stone-500"
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
                    present ? "bg-stone-700" : "bg-emerald-600"
                  }`}
                >
                  {present ? "Je récupère mon enfant (départ)" : "Je dépose mon enfant (arrivée)"}
                </button>
              </form>
            )}

            {fievre && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
                🌡 Fièvre signalée :{" "}
                {(fievre.payload as { temp?: number }).temp} °C à{" "}
                {new Date(fievre.heure).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {motDuJour && (
              <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                💌 {motDuJour}
              </p>
            )}

            {stock && stock.quantite <= stock.seuil_alerte && (
              <form
                action={signalerReappro}
                className="flex items-center justify-between gap-2 rounded-2xl bg-amber-50 p-4"
              >
                <input type="hidden" name="supply_id" value={stock.id} />
                <input type="hidden" name="delta" value="20" />
                <span className="text-sm text-amber-900">
                  🧷 Pensez à ramener des couches (il en reste {stock.quantite})
                </span>
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-amber-600 px-3 py-2 text-xs font-medium text-white active:scale-[0.98]"
                >
                  J&apos;en ramène 20
                </button>
              </form>
            )}

            {!present && (
              <details className="rounded-2xl border border-stone-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  🤒 Signaler quelque chose ce matin
                </summary>
                <form action={signalerSymptome} className="mt-2 flex gap-2">
                  <input type="hidden" name="child_id" value={enfant.id} />
                  <input
                    name="texte"
                    required
                    placeholder="Nuit difficile, doliprane donné à 6 h…"
                    className="h-11 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-900"
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-stone-300 bg-white px-3 text-sm active:bg-stone-50"
                  >
                    Envoyer
                  </button>
                </form>
              </details>
            )}

            {menuSemaine && (
              <details className="rounded-2xl border border-stone-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  🍽️ Le menu de la semaine
                </summary>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-stone-700">
                  {Object.entries(menuSemaine).map(([jour, repas]) => (
                    <li key={jour}>
                      <span className="font-medium capitalize">{jour}</span>
                      {repas.midi && ` · midi : ${repas.midi}`}
                      {repas.gouter && ` · goûter : ${repas.gouter}`}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <h2 className="text-sm font-semibold">La journée d&apos;aujourd&apos;hui</h2>
              {ptgJour.length === 0 && evtsJour.length === 0 ? (
                <p className="mt-1 text-sm text-stone-500">
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
                        <span className="text-stone-400">
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
