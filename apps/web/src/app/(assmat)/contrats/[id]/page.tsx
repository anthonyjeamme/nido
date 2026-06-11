import Link from "next/link";
import { notFound } from "next/navigation";
import { genereBulletin } from "@nido/paie-engine";
import {
  baremeRowsVersBaremes,
  contratRowVersContratPaie,
  euros,
} from "@/lib/paie";
import { createClient } from "@/lib/supabase/server";
import { activerContrat, majPlanning } from "../actions";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default async function ContratPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contrat } = await supabase
    .from("contracts")
    .select("*, children (id, prenom, nom)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!contrat) notFound();

  const [{ data: planning }, { data: baremeRows }] = await Promise.all([
    supabase
      .from("planned_schedules")
      .select("jour_semaine, heure_debut, heure_fin")
      .eq("contract_id", id)
      .order("jour_semaine"),
    supabase.from("bareme_values").select("code, valeur, date_effet, source_url"),
  ]);

  const contratPaie = contratRowVersContratPaie(contrat);
  const baremes = baremeRowsVersBaremes(baremeRows ?? []);

  // Bulletin « mois type » : 4 semaines au contrat, aucune absence — pour
  // montrer aux parents à quoi ressemblera une fiche de paie normale.
  const moisType = genereBulletin(
    contratPaie,
    {
      mois: contrat.date_debut.slice(0, 7),
      semaines: [],
      joursPresenceReelle: Math.round(
        (contratPaie.joursAccueilParSemaine * 52) / 12,
      ),
      repasFournis: 0,
      absences: [],
      joursCpPris: 0,
    },
    baremes,
  );

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4">
      <div>
        <Link href="/contrats" className="text-sm text-zinc-500">
          ‹ Contrats
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Contrat — {contrat.children?.prenom}
          </h1>
          {contrat.statut === "brouillon" && (
            <form action={activerContrat}>
              <input type="hidden" name="contract_id" value={contrat.id} />
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white active:scale-[0.98]"
              >
                Activer
              </button>
            </form>
          )}
        </div>
        <p className="text-sm text-zinc-500">
          {contrat.type === "annee_complete"
            ? "Année complète (52 semaines)"
            : `Année incomplète (${contrat.semaines_programmees} semaines)`}{" "}
          · débute le {new Date(contrat.date_debut).toLocaleDateString("fr-FR")}{" "}
          · {contrat.statut}
        </p>
      </div>

      {/* Mensualisation expliquée */}
      <section className="rounded-2xl border border-zinc-200 p-4">
        <h2 className="font-semibold">Mensualisation</h2>
        {moisType.lignes.map((ligne) => (
          <details key={ligne.code} className="mt-2">
            <summary className="flex cursor-pointer items-center justify-between">
              <span className="text-sm">{ligne.label}</span>
              <span className="font-medium tabular-nums">
                {euros(ligne.montant)}
              </span>
            </summary>
            <div className="mt-2 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
              <p className="font-mono">{ligne.formule}</p>
              <ul className="mt-1">
                {Object.entries(ligne.inputs).map(([cle, valeur]) => (
                  <li key={cle}>
                    {cle} = {String(valeur)}
                  </li>
                ))}
              </ul>
              <p className="mt-1 italic">Source : {ligne.ref.source}</p>
            </div>
          </details>
        ))}
        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
          <span className="text-sm font-medium">Indemnité d&apos;entretien</span>
          <span className="text-sm tabular-nums">
            {euros(Number(contrat.indemnite_entretien_jour))} / jour de présence
          </span>
        </div>
        {contrat.assmat_fournit_repas && contrat.indemnite_repas !== null && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-medium">Indemnité de repas</span>
            <span className="text-sm tabular-nums">
              {euros(Number(contrat.indemnite_repas))} / repas
            </span>
          </div>
        )}
      </section>

      {/* Réglages parents */}
      <section className="rounded-2xl border border-zinc-200 p-4 text-sm">
        <h2 className="font-semibold">Accès des parents</h2>
        <p className="mt-1 text-zinc-600">
          Pointage par les parents :{" "}
          <span className="font-medium">
            {contrat.parent_peut_pointer ? "autorisé" : "désactivé"}
          </span>
        </p>
      </section>

      {/* Planning semaine type */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Semaine type</h2>
        <form
          action={majPlanning}
          className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4"
        >
          <input type="hidden" name="contract_id" value={contrat.id} />
          {JOURS.map((jour, index) => {
            const ligne = planning?.find((p) => p.jour_semaine === index + 1);
            return (
              <div key={jour} className="flex items-center gap-2">
                <span className="w-20 text-sm">{jour}</span>
                <input
                  type="time"
                  name={`debut_${index + 1}`}
                  defaultValue={ligne?.heure_debut?.slice(0, 5) ?? ""}
                  className="h-10 flex-1 rounded-lg border border-zinc-300 px-2 text-sm"
                />
                <span className="text-zinc-400">→</span>
                <input
                  type="time"
                  name={`fin_${index + 1}`}
                  defaultValue={ligne?.heure_fin?.slice(0, 5) ?? ""}
                  className="h-10 flex-1 rounded-lg border border-zinc-300 px-2 text-sm"
                />
              </div>
            );
          })}
          <button
            type="submit"
            className="mt-2 self-end rounded-xl border border-zinc-300 px-4 py-2 text-sm active:bg-zinc-50"
          >
            Enregistrer la semaine type
          </button>
        </form>
      </section>
    </div>
  );
}
