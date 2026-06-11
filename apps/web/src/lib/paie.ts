import type { Tables } from "@nido/db";
import type { BaremeValue, ContratPaie } from "@nido/paie-engine";

/** Convertit une ligne `contracts` en paramètres purs pour le moteur de paie. */
export function contratRowVersContratPaie(
  row: Tables<"contracts">,
): ContratPaie {
  return {
    type: row.type,
    tauxHoraire: Number(row.taux_horaire),
    heuresParSemaine: Number(row.heures_par_semaine),
    semainesProgrammees: row.semaines_programmees,
    joursAccueilParSemaine: Number(row.jours_accueil_par_semaine),
    tauxMajorationPct: Number(row.taux_majoration_pct),
    indemniteEntretienJour: Number(row.indemnite_entretien_jour),
    indemniteRepas:
      row.indemnite_repas === null ? null : Number(row.indemnite_repas),
    optionVersementCp: row.option_versement_cp,
    dateDebut: row.date_debut,
  };
}

/** Convertit les lignes `bareme_values` en barèmes pour le moteur. */
export function baremeRowsVersBaremes(
  rows: Pick<Tables<"bareme_values">, "code" | "valeur" | "date_effet" | "source_url">[],
): BaremeValue[] {
  return rows.map((r) => ({
    code: r.code,
    valeur: Number(r.valeur),
    dateEffet: r.date_effet,
    sourceUrl: r.source_url ?? undefined,
  }));
}

/** Format monétaire français. */
export function euros(montant: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(montant);
}
