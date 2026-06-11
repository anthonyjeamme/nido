import { arrondiCentimes } from "./arrondi";
import type { CalculLine, ContratPaie, SemaineRealisee } from "./types";

export interface HeuresSupplementaires {
  /** Heures au-delà du contrat, jusqu'à 45 h/semaine — payées au taux normal. */
  heuresComplementaires: number;
  /** Heures au-delà de 45 h/semaine — payées au taux majoré du contrat. */
  heuresMajorees: number;
  lignes: CalculLine[];
}

/** Seuil hebdomadaire au-delà duquel les heures sont majorées (CCN). */
const CODE_SEUIL_MAJORATION = "SEUIL_HEURES_MAJOREES_SEMAINE";

/**
 * Détecte, semaine par semaine, les heures effectuées au-delà du contrat (US-3.4) :
 * - jusqu'au seuil (45 h/semaine) : heures complémentaires, taux normal ;
 * - au-delà : heures majorées, au taux de majoration du contrat.
 *
 * Le seuil vient des barèmes (jamais en dur) : passer la valeur applicable au mois.
 */
export function calculeHeuresSupplementaires(
  contrat: ContratPaie,
  semaines: readonly SemaineRealisee[],
  seuilMajorationHebdo: number,
): HeuresSupplementaires {
  let totalComp = 0;
  let totalMajo = 0;

  for (const semaine of semaines) {
    const depassement = semaine.heuresReelles - contrat.heuresParSemaine;
    if (depassement <= 0) continue;

    // Si le contrat prévoit déjà plus que le seuil, seules les heures
    // au-delà du contrat sont dues (et elles sont toutes majorées).
    const majorees = Math.min(
      Math.max(semaine.heuresReelles - seuilMajorationHebdo, 0),
      depassement,
    );
    const complementaires = depassement - majorees;
    totalComp += complementaires;
    totalMajo += majorees;
  }

  const lignes: CalculLine[] = [];

  if (totalComp > 0) {
    lignes.push({
      code: "HEURES_COMPLEMENTAIRES",
      label: "Heures complémentaires",
      montant: arrondiCentimes(totalComp * contrat.tauxHoraire),
      formule: "heures_complémentaires × taux_horaire",
      inputs: {
        heures_complementaires: totalComp,
        taux_horaire: contrat.tauxHoraire,
      },
      ref: {
        code: "HEURES_COMPLEMENTAIRES",
        source:
          "Pajemploi — heures effectuées au-delà du contrat, dans la limite de 45 h/semaine",
      },
    });
  }

  if (totalMajo > 0) {
    const tauxMajore = arrondiCentimes(
      contrat.tauxHoraire * (1 + contrat.tauxMajorationPct / 100),
    );
    lignes.push({
      code: "HEURES_MAJOREES",
      label: "Heures majorées (au-delà de 45 h/semaine)",
      montant: arrondiCentimes(totalMajo * tauxMajore),
      formule:
        "heures_majorées × taux_horaire × (1 + taux_majoration ÷ 100)",
      inputs: {
        heures_majorees: totalMajo,
        taux_horaire: contrat.tauxHoraire,
        taux_majoration_pct: contrat.tauxMajorationPct,
      },
      ref: {
        code: CODE_SEUIL_MAJORATION,
        source:
          "CCN particuliers employeurs — majoration des heures au-delà de 45 h/semaine (taux défini au contrat)",
      },
    });
  }

  return {
    heuresComplementaires: totalComp,
    heuresMajorees: totalMajo,
    lignes,
  };
}
