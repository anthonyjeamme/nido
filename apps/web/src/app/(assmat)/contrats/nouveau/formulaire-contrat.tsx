"use client";

import { useMemo, useState } from "react";
import {
  calculeMensualisation,
  valideContratPaie,
  type BaremeValue,
  type ContratPaie,
} from "@nido/paie-engine";
import { euros } from "@/lib/paie";
import { creerContrat } from "../actions";

const champ =
  "h-12 w-full rounded-xl border border-zinc-300 px-4 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

interface Enfant {
  id: string;
  prenom: string;
  nom: string;
}

export function FormulaireContrat({
  enfants,
  baremes,
  enfantPreselectionne,
}: {
  enfants: Enfant[];
  baremes: BaremeValue[];
  enfantPreselectionne?: string;
}) {
  const [type, setType] = useState<ContratPaie["type"]>("annee_incomplete");
  const [tauxHoraire, setTauxHoraire] = useState(4.0);
  const [heuresParSemaine, setHeuresParSemaine] = useState(40);
  const [semaines, setSemaines] = useState(44);
  const [joursParSemaine, setJoursParSemaine] = useState(5);
  const [majoration, setMajoration] = useState(10);
  const [entretien, setEntretien] = useState(4.5);
  const [fournitRepas, setFournitRepas] = useState(false);
  const [indemniteRepas, setIndemniteRepas] = useState(4.0);
  const [dateDebut, setDateDebut] = useState("");

  const contrat: ContratPaie = useMemo(
    () => ({
      type,
      tauxHoraire,
      heuresParSemaine,
      semainesProgrammees: type === "annee_complete" ? 52 : semaines,
      joursAccueilParSemaine: joursParSemaine,
      tauxMajorationPct: majoration,
      indemniteEntretienJour: entretien,
      indemniteRepas: fournitRepas ? indemniteRepas : null,
      optionVersementCp: "juin",
      dateDebut: dateDebut || new Date().toISOString().slice(0, 10),
    }),
    [type, tauxHoraire, heuresParSemaine, semaines, joursParSemaine,
     majoration, entretien, fournitRepas, indemniteRepas, dateDebut],
  );

  const simulation = useMemo(() => {
    try {
      return {
        mensualisation: calculeMensualisation(contrat),
        problemes: valideContratPaie(contrat, baremes, contrat.dateDebut),
      };
    } catch {
      return null;
    }
  }, [contrat, baremes]);

  const bloquants = simulation?.problemes.filter((p) => p.niveau === "bloquant") ?? [];
  const avertissements = simulation?.problemes.filter((p) => p.niveau === "avertissement") ?? [];

  return (
    <form action={creerContrat} className="flex flex-col gap-5">
      {/* ----- Simulateur en direct ----- */}
      <div className="sticky top-14 z-10 rounded-2xl border border-zinc-900 bg-zinc-900 p-4 text-white shadow-lg">
        <p className="text-sm text-zinc-300">Salaire mensualisé estimé (net)</p>
        <p className="text-3xl font-bold tabular-nums">
          {simulation ? euros(simulation.mensualisation.montant) : "—"}
        </p>
        {simulation && (
          <p className="mt-1 text-xs text-zinc-400">
            {simulation.mensualisation.formule}
          </p>
        )}
        {type === "annee_incomplete" && (
          <p className="mt-1 text-xs text-amber-300">
            + congés payés rémunérés en plus de la mensualisation (année
            incomplète)
          </p>
        )}
      </div>

      {bloquants.map((p) => (
        <p key={p.code} className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          ⛔ {p.message}{" "}
          <span className="text-xs text-red-400">({p.ref.source})</span>
        </p>
      ))}
      {avertissements.map((p) => (
        <p key={p.code} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          ⚠ {p.message}{" "}
          <span className="text-xs text-amber-500">({p.ref.source})</span>
        </p>
      ))}

      {/* ----- Enfant et type ----- */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Enfant</span>
        <select
          name="child_id"
          required
          defaultValue={enfantPreselectionne ?? ""}
          className={champ}
        >
          <option value="" disabled>
            Choisir un enfant…
          </option>
          {enfants.map((e) => (
            <option key={e.id} value={e.id}>
              {e.prenom} {e.nom}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["annee_complete", "Année complète", "52 semaines, CP inclus"],
            ["annee_incomplete", "Année incomplète", "≤ 46 semaines, CP en plus"],
          ] as const
        ).map(([valeur, label, aide]) => (
          <label
            key={valeur}
            className={`flex cursor-pointer flex-col gap-0.5 rounded-2xl border p-3 ${
              type === valeur ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={valeur}
              checked={type === valeur}
              onChange={() => setType(valeur)}
              className="sr-only"
            />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-zinc-500">{aide}</span>
          </label>
        ))}
      </div>

      {/* ----- Paramètres ----- */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Taux horaire net (€)</span>
          <input
            name="taux_horaire" type="number" step="0.01" min="0" required
            value={tauxHoraire}
            onChange={(e) => setTauxHoraire(Number(e.target.value))}
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Heures / semaine</span>
          <input
            name="heures_par_semaine" type="number" step="0.5" min="1" max="60" required
            value={heuresParSemaine}
            onChange={(e) => setHeuresParSemaine(Number(e.target.value))}
            className={champ}
          />
        </label>
        {type === "annee_incomplete" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Semaines / an</span>
            <input
              name="semaines_programmees" type="number" min="1" max="51" required
              value={semaines}
              onChange={(e) => setSemaines(Number(e.target.value))}
              className={champ}
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Jours / semaine</span>
          <input
            name="jours_accueil_par_semaine" type="number" step="0.5" min="0.5" max="6" required
            value={joursParSemaine}
            onChange={(e) => setJoursParSemaine(Number(e.target.value))}
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Majoration &gt; 45 h (%)</span>
          <input
            name="taux_majoration_pct" type="number" step="1" min="0" required
            value={majoration}
            onChange={(e) => setMajoration(Number(e.target.value))}
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Entretien (€/jour)</span>
          <input
            name="indemnite_entretien_jour" type="number" step="0.01" min="0" required
            value={entretien}
            onChange={(e) => setEntretien(Number(e.target.value))}
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Début du contrat</span>
          <input
            name="date_debut" type="date" required
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className={champ}
          />
        </label>
      </div>

      {/* ----- Repas ----- */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox" name="assmat_fournit_repas"
            checked={fournitRepas}
            onChange={(e) => setFournitRepas(e.target.checked)}
            className="h-4 w-4"
          />
          Je fournis les repas
        </label>
        {fournitRepas && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Indemnité par repas (€)</span>
            <input
              name="indemnite_repas" type="number" step="0.01" min="0"
              value={indemniteRepas}
              onChange={(e) => setIndemniteRepas(Number(e.target.value))}
              className={champ}
            />
          </label>
        )}
      </div>

      {/* ----- Options ----- */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Versement des congés payés (année incomplète)</span>
        <select name="option_versement_cp" className={champ} defaultValue="juin">
          <option value="juin">En une fois, avec la paie de juin</option>
          <option value="prise_principale">À la prise principale des congés</option>
          <option value="au_fil">Au fur et à mesure de la prise</option>
        </select>
      </label>

      <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 p-4 text-sm">
        <input type="checkbox" name="parent_peut_pointer" className="h-4 w-4" />
        <span>
          <span className="font-medium">Les parents peuvent pointer</span>
          <br />
          <span className="text-zinc-500">
            Arrivées/départs enregistrables par les parents (révocable à tout
            moment)
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={bloquants.length > 0}
        className="h-12 rounded-xl bg-zinc-900 font-medium text-white active:scale-[0.98] disabled:bg-zinc-300"
      >
        Créer le contrat (brouillon)
      </button>
    </form>
  );
}
