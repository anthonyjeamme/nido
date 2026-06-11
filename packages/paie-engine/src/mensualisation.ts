import { arrondiCentimes } from "./arrondi";
import type { CalculLine, ContratPaie } from "./types";

/**
 * Salaire mensualisé de base (US-9.1, specs §5.2).
 *
 * - Année complète (52 semaines) : taux × heures/semaine × 52 ÷ 12
 * - Année incomplète (≤ 46 semaines programmées) : taux × heures/semaine × semaines ÷ 12
 *
 * En année complète, les congés payés sont inclus dans la mensualisation.
 * En année incomplète, ils sont rémunérés EN PLUS (voir conges.ts).
 */
export function calculeMensualisation(contrat: ContratPaie): CalculLine {
  if (contrat.type === "annee_complete") {
    const montant = arrondiCentimes(
      (contrat.tauxHoraire * contrat.heuresParSemaine * 52) / 12,
    );
    return {
      code: "MENSUALISATION",
      label: "Salaire mensualisé (année complète)",
      montant,
      formule: "taux_horaire × heures_par_semaine × 52 ÷ 12",
      inputs: {
        taux_horaire: contrat.tauxHoraire,
        heures_par_semaine: contrat.heuresParSemaine,
      },
      ref: {
        code: "MENSUALISATION_AC",
        source: "Pajemploi — La mensualisation, accueil 52 semaines",
      },
    };
  }

  const montant = arrondiCentimes(
    (contrat.tauxHoraire *
      contrat.heuresParSemaine *
      contrat.semainesProgrammees) /
      12,
  );
  return {
    code: "MENSUALISATION",
    label: "Salaire mensualisé (année incomplète)",
    montant,
    formule: "taux_horaire × heures_par_semaine × semaines_programmées ÷ 12",
    inputs: {
      taux_horaire: contrat.tauxHoraire,
      heures_par_semaine: contrat.heuresParSemaine,
      semaines_programmees: contrat.semainesProgrammees,
    },
    ref: {
      code: "MENSUALISATION_AI",
      source: "Pajemploi — La mensualisation, accueil 46 semaines ou moins",
    },
  };
}

/** Heures mensualisées (base du champ « heures normales » Pajemploi). */
export function heuresMensualisees(contrat: ContratPaie): number {
  const semaines =
    contrat.type === "annee_complete" ? 52 : contrat.semainesProgrammees;
  return (contrat.heuresParSemaine * semaines) / 12;
}

/** Jours d'activité mensualisés (base du champ « jours d'activité » Pajemploi). */
export function joursActiviteMensualises(contrat: ContratPaie): number {
  const semaines =
    contrat.type === "annee_complete" ? 52 : contrat.semainesProgrammees;
  return (contrat.joursAccueilParSemaine * semaines) / 12;
}
