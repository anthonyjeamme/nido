import { arrondiCentimes } from "./arrondi";
import type { CalculLine, ContratPaie } from "./types";

/**
 * Rémunération d'un jour férié TRAVAILLÉ (specs §5.2) :
 * - 1er mai : majoration de 100 % (art. 47.1) ;
 * - férié ordinaire : majoration de 10 %, à condition d'être prévu au contrat
 *   (art. 47.2).
 *
 * Le taux vient de `rule_definitions` (params), jamais en dur : le caller le
 * lit dans la règle JOUR_FERIE_1ER_MAI / JOUR_FERIE_ORDINAIRE applicable.
 *
 * Un férié CHÔMÉ payé n'appelle aucune ligne : il est déjà couvert par la
 * mensualisation (maintien de rémunération sous condition d'encadrement).
 */
export function calculeMajorationFerieTravaille(
  contrat: ContratPaie,
  params: {
    estPremierMai: boolean;
    heuresTravaillees: number;
    majorationPct: number;
  },
): CalculLine {
  const majoration = arrondiCentimes(
    params.heuresTravaillees *
      contrat.tauxHoraire *
      (params.majorationPct / 100),
  );

  return params.estPremierMai
    ? {
        code: "MAJORATION_1ER_MAI",
        label: "Majoration — 1er mai travaillé (+100 %)",
        montant: majoration,
        formule: "heures_travaillées × taux_horaire × (majoration ÷ 100)",
        inputs: {
          heures_travaillees: params.heuresTravaillees,
          taux_horaire: contrat.tauxHoraire,
          majoration_pct: params.majorationPct,
        },
        ref: {
          code: "JOUR_FERIE_1ER_MAI",
          source: "CCN IDCC 3239, socle commun, art. 47.1",
        },
      }
    : {
        code: "MAJORATION_FERIE",
        label: "Majoration — jour férié travaillé (+10 %)",
        montant: majoration,
        formule: "heures_travaillées × taux_horaire × (majoration ÷ 100)",
        inputs: {
          heures_travaillees: params.heuresTravaillees,
          taux_horaire: contrat.tauxHoraire,
          majoration_pct: params.majorationPct,
        },
        ref: {
          code: "JOUR_FERIE_ORDINAIRE",
          source: "CCN IDCC 3239, socle commun, art. 47.2",
        },
      };
}
