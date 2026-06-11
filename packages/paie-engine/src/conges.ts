import { arrondiCentimes } from "./arrondi";
import type { CalculLine } from "./types";

/**
 * Acquisition des congés payés (US-10.1) :
 * 2,5 jours ouvrables par mois d'accueil effectif, période de référence
 * du 1er juin au 31 mai, arrondi au nombre entier supérieur, plafonné à 30.
 */
export function acquisitionConges(moisAccueilEffectif: number): CalculLine {
  const jours = Math.min(Math.ceil(moisAccueilEffectif * 2.5), 30);
  return {
    code: "CP_ACQUISITION",
    label: "Congés payés acquis sur la période de référence",
    montant: jours, // ici « montant » est un nombre de jours, pas des euros
    formule: "2,5 jours ouvrables × mois_d'accueil_effectif (arrondi supérieur, max 30)",
    inputs: { mois_accueil_effectif: moisAccueilEffectif },
    ref: {
      code: "CP_ACQUISITION",
      source:
        "CCN particuliers employeurs — 2,5 jours ouvrables par mois d'accueil, période du 1er juin au 31 mai",
    },
  };
}

export interface RemunerationCp {
  /** Méthode retenue (la plus favorable à la salariée). */
  methode: "dixieme" | "maintien";
  montantTotal: number;
  ligne: CalculLine;
}

/**
 * Rémunération des congés payés en année incomplète (US-10.3) :
 * versée EN PLUS du salaire mensualisé, selon la méthode la plus favorable :
 * - règle du 1/10e : 10 % des salaires nets perçus sur la période de référence ;
 * - maintien : salaire qu'aurait perçu la salariée pendant le congé
 *   (jours ouvrables acquis × heures hebdomadaires ÷ 6 × taux horaire).
 *
 * En année complète, les CP sont inclus dans la mensualisation : ne pas appeler.
 */
export function remunerationCongesAnneeIncomplete(params: {
  /** Total des salaires nets perçus du 1er juin au 31 mai (hors indemnités). */
  salairesPeriodeReference: number;
  /** Jours ouvrables acquis sur la période. */
  joursAcquis: number;
  tauxHoraire: number;
  heuresParSemaine: number;
}): RemunerationCp {
  const dixieme = arrondiCentimes(params.salairesPeriodeReference * 0.1);
  const maintien = arrondiCentimes(
    params.joursAcquis * (params.heuresParSemaine / 6) * params.tauxHoraire,
  );

  const methode = dixieme >= maintien ? "dixieme" : "maintien";
  const montantTotal = Math.max(dixieme, maintien);

  return {
    methode,
    montantTotal,
    ligne: {
      code: "CP_REMUNERATION_AI",
      label: "Rémunération des congés payés (année incomplète)",
      montant: montantTotal,
      formule:
        methode === "dixieme"
          ? "10 % × salaires_période_référence (méthode la plus favorable)"
          : "jours_acquis × (heures_par_semaine ÷ 6) × taux_horaire (méthode la plus favorable)",
      inputs: {
        salaires_periode_reference: params.salairesPeriodeReference,
        jours_acquis: params.joursAcquis,
        taux_horaire: params.tauxHoraire,
        heures_par_semaine: params.heuresParSemaine,
        regle_du_dixieme: dixieme,
        maintien_de_salaire: maintien,
        methode_retenue: methode,
      },
      ref: {
        code: "CP_REMUNERATION_AI",
        source:
          "CCN particuliers employeurs — comparaison 1/10e vs maintien, méthode la plus favorable",
      },
    },
  };
}

/**
 * Part de la rémunération de CP à verser un mois donné, selon l'option du contrat :
 * - "juin" : tout en une fois avec la paie de juin ;
 * - "prise_principale" : tout au mois de la prise principale ;
 * - "au_fil" : proportionnel aux jours pris dans le mois.
 */
export function cpAVerserCeMois(params: {
  option: "juin" | "prise_principale" | "au_fil";
  remunerationTotale: number;
  joursAcquis: number;
  joursPrisCeMois: number;
  /** Vrai si ce mois est celui du versement unique (juin ou prise principale). */
  estMoisDeVersementUnique: boolean;
}): { montant: number; jours: number } {
  if (params.option === "au_fil") {
    if (params.joursAcquis === 0 || params.joursPrisCeMois === 0) {
      return { montant: 0, jours: 0 };
    }
    return {
      montant: arrondiCentimes(
        (params.remunerationTotale * params.joursPrisCeMois) /
          params.joursAcquis,
      ),
      jours: params.joursPrisCeMois,
    };
  }

  if (params.estMoisDeVersementUnique) {
    return { montant: params.remunerationTotale, jours: params.joursAcquis };
  }
  return { montant: 0, jours: 0 };
}
