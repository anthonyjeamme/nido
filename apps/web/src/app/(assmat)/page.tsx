import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { genererRecap } from "./journee-actions";
import { PointageBouton } from "./pointage-bouton";
import { SaisieRapide } from "./saisie-rapide";

export default async function MaJourneePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const jourSemaine = ((new Date().getDay() + 6) % 7) + 1; // 1 = lundi

  const [{ data: profile }, { data: assmat }, { data: contrats }] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user!.id).single(),
      supabase.from("assmats").select("id, agrement_capacite").eq("profile_id", user!.id).single(),
      supabase
        .from("contracts")
        .select(
          "id, parent_peut_pointer, children (id, prenom, nom), planned_schedules (jour_semaine, heure_debut, heure_fin)",
        )
        .eq("statut", "actif")
        .is("deleted_at", null),
    ]);

  const { data: pointages } = await supabase
    .from("attendance_events")
    .select("contract_id, child_id, type, horodatage")
    .gte("horodatage", `${aujourdHui}T00:00:00`)
    .order("horodatage");

  const { data: recaps } = await supabase
    .from("daily_summaries")
    .select("child_id, statut")
    .eq("date", aujourdHui);

  // État de présence par contrat (dernier pointage du jour)
  const lignes = (contrats ?? []).map((contrat) => {
    const evenements = (pointages ?? []).filter(
      (p) => p.contract_id === contrat.id,
    );
    const dernier = evenements[evenements.length - 1];
    const present = dernier?.type === "in";
    const creneau = contrat.planned_schedules.find(
      (p) => p.jour_semaine === jourSemaine,
    );
    const recap = recaps?.find((r) => r.child_id === contrat.children?.id);
    return { contrat, evenements, present, creneau, recap };
  });

  const presents = lignes.filter((l) => l.present).length;
  const capacite = assmat?.agrement_capacite ?? 0;
  const prenom = profile?.display_name;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Bonjour{prenom ? ` ${prenom}` : ""} 👋
        </h1>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            presents > capacite
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {presents}/{capacite} présent{presents > 1 ? "s" : ""}
        </span>
      </div>

      <Link
        href="/menus"
        className="flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3 text-sm active:bg-stone-50"
      >
        <span>🍽️ Menus de la semaine</span>
        <span className="text-stone-300">›</span>
      </Link>

      {presents > capacite && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          ⚠ Dépassement de votre capacité d&apos;agrément ({presents} enfants
          présents pour {capacite} autorisés).
        </p>
      )}

      {!lignes.length ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <p className="font-medium">Aucun contrat actif aujourd&apos;hui.</p>
          <p className="text-sm text-stone-600">
            Ajoutez un enfant puis activez son contrat : votre journée
            s&apos;affichera ici, avec le pointage en un geste.
          </p>
          <Link
            href="/enfants/nouveau"
            className="rounded-xl bg-stone-900 px-4 py-3 text-center font-medium text-white active:scale-[0.98]"
          >
            Ajouter un enfant
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {lignes.map(({ contrat, evenements, present, creneau, recap }) => {
            const enfant = contrat.children;
            if (!enfant) return null;
            const aQuitte =
              evenements.length > 0 &&
              evenements[evenements.length - 1]?.type === "out";
            return (
              <li
                key={contrat.id}
                className={`flex flex-col gap-3 rounded-2xl border p-4 ${
                  present ? "border-emerald-300 bg-emerald-50/40" : "border-stone-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{enfant.prenom}</p>
                    <p className="text-xs text-stone-500">
                      {creneau
                        ? `Prévu ${creneau.heure_debut.slice(0, 5)} – ${creneau.heure_fin.slice(0, 5)}`
                        : "Pas de créneau prévu aujourd'hui"}
                      {evenements.map(
                        (e) =>
                          ` · ${e.type === "in" ? "arrivé" : "parti"} ${new Date(e.horodatage).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
                      )}
                    </p>
                  </div>
                  <PointageBouton
                    contractId={contrat.id}
                    childId={enfant.id}
                    type={present ? "out" : "in"}
                    label={present ? "Départ" : "Arrivée"}
                  />
                </div>

                {present && <SaisieRapide childId={enfant.id} />}

                {aQuitte && recap?.statut !== "envoye" && (
                  <form action={genererRecap}>
                    <input type="hidden" name="child_id" value={enfant.id} />
                    <input type="hidden" name="date" value={aujourdHui} />
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 active:scale-[0.98]"
                    >
                      📋 Préparer le récap du soir
                    </button>
                  </form>
                )}
                {recap?.statut === "envoye" && (
                  <p className="text-center text-xs text-emerald-700">
                    ✓ Récap du soir envoyé
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
