import { arrondiCentimes } from "./arrondi";
import type { BaremeValue, CalculLine, ContratPaie } from "./types";
import { getBareme } from "./baremes";

/**
 * Indemnités d'entretien et de repas du mois (specs §5.2).
 * Dues en sus du salaire, par jour de présence réelle, non soumises à cotisations.
 *
 * Le minimum légal d'entretien est proportionnel à la durée d'accueil
 * (référence : 90 % du minimum garanti pour 9 h, proratisé). Le contrôle du
 * minimum est fait à la signature du contrat (M2) — ici on applique le montant
 * contractuel et on joint la référence du minimum à titre d'explication.
 */
export function calculeIndemnites(
  contrat: ContratPaie,
  joursPresenceReelle: number,
  repasFournis: number,
  baremes: readonly BaremeValue[],
  dateDuMois: string,
): { lignes: CalculLine[]; totalEntretien: number; total: number } {
  const lignes: CalculLine[] = [];

  const mg = getBareme(baremes, "MINIMUM_GARANTI", dateDuMois);
  const totalEntretien = arrondiCentimes(
    joursPresenceReelle * contrat.indemniteEntretienJour,
  );

  lignes.push({
    code: "INDEMNITE_ENTRETIEN",
    label: "Indemnités d'entretien",
    montant: totalEntretien,
    formule: "jours_de_présence_réelle × indemnité_entretien_journalière",
    inputs: {
      jours_de_presence_reelle: joursPresenceReelle,
      indemnite_entretien_journaliere: contrat.indemniteEntretienJour,
      minimum_garanti_reference: mg.valeur,
    },
    ref: {
      code: "INDEMNITE_ENTRETIEN_MINIMUM",
      source:
        "CCN particuliers employeurs — minimum proportionnel à la durée d'accueil (90 % du minimum garanti pour 9 h)",
      url: mg.sourceUrl,
    },
  });

  let totalRepas = 0;
  if (contrat.indemniteRepas !== null && repasFournis > 0) {
    totalRepas = arrondiCentimes(repasFournis * contrat.indemniteRepas);
    lignes.push({
      code: "INDEMNITE_REPAS",
      label: "Indemnités de repas",
      montant: totalRepas,
      formule: "repas_fournis × indemnité_par_repas",
      inputs: {
        repas_fournis: repasFournis,
        indemnite_par_repas: contrat.indemniteRepas,
      },
      ref: {
        code: "INDEMNITE_REPAS",
        source:
          "Contrat de travail — montant libre, dû uniquement si l'assistante maternelle fournit les repas",
      },
    });
  }

  return {
    lignes,
    totalEntretien,
    total: arrondiCentimes(totalEntretien + totalRepas),
  };
}
