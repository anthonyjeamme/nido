import { arrondiCentimes } from "./arrondi";
import type { AbsenceMois, CalculLine, ContratPaie } from "./types";

export interface ImpactAbsences {
  /** Heures déduites du salaire (absences non rémunérées). */
  heuresDeduites: number;
  /** Jours d'absence non rémunérés (déduits des jours d'activité Pajemploi). */
  joursNonRemuneres: number;
  lignes: CalculLine[];
}

/**
 * Impact paie des absences du mois (US-10.2, specs §5.2).
 *
 * Qualification (chaque type est une règle distincte, confirmée par l'assmat) :
 * - enfant_convenance : rémunérée (maintien) → aucun impact ;
 * - enfant_maladie_certificat : retenue possible dans les limites CCN
 *   (le respect du plafond annuel est contrôlé en amont par M10) ;
 * - assmat : non rémunérée → retenue ;
 * - cp / ferie : traités par conges.ts et les règles fériés, pas ici.
 *
 * Retenue : méthode Pajemploi — heures d'absence × taux horaire.
 */
export function calculeImpactAbsences(
  contrat: ContratPaie,
  absences: readonly AbsenceMois[],
): ImpactAbsences {
  let heuresDeduites = 0;
  let joursNonRemuneres = 0;
  const lignes: CalculLine[] = [];

  for (const absence of absences) {
    switch (absence.type) {
      case "enfant_convenance":
        // Maintien de salaire : ligne informative à montant nul.
        lignes.push({
          code: "ABSENCE_CONVENANCE",
          label: "Absence de l'enfant (convenance des parents) — rémunérée",
          montant: 0,
          formule: "maintien de salaire (aucune retenue)",
          inputs: { heures: absence.heures, jours: absence.jours },
          ref: {
            code: "ABSENCE_CONVENANCE",
            source:
              "Pajemploi — l'absence de l'enfant à la convenance des parents reste rémunérée",
          },
        });
        break;

      case "enfant_maladie_certificat": {
        const retenue = arrondiCentimes(absence.heures * contrat.tauxHoraire);
        heuresDeduites += absence.heures;
        joursNonRemuneres += absence.jours;
        lignes.push({
          code: "RETENUE_MALADIE_ENFANT",
          label: "Retenue — maladie de l'enfant (certificat médical)",
          montant: -retenue,
          formule: "− heures_absence × taux_horaire",
          inputs: {
            heures_absence: absence.heures,
            taux_horaire: contrat.tauxHoraire,
          },
          ref: {
            code: "ABSENCE_MALADIE_ENFANT",
            source:
              "CCN particuliers employeurs — retenue possible sur certificat médical, dans la limite du plafond annuel",
          },
        });
        break;
      }

      case "assmat": {
        const retenue = arrondiCentimes(absence.heures * contrat.tauxHoraire);
        heuresDeduites += absence.heures;
        joursNonRemuneres += absence.jours;
        lignes.push({
          code: "RETENUE_ABSENCE_ASSMAT",
          label: "Retenue — absence de l'assistante maternelle",
          montant: -retenue,
          formule: "− heures_absence × taux_horaire",
          inputs: {
            heures_absence: absence.heures,
            taux_horaire: contrat.tauxHoraire,
          },
          ref: {
            code: "ABSENCE_ASSMAT",
            source:
              "Pajemploi — l'absence de l'assistante maternelle n'est pas rémunérée",
          },
        });
        break;
      }

      case "cp":
      case "ferie":
        // Hors périmètre de cette fonction (voir conges.ts / règles fériés).
        break;
    }
  }

  return { heuresDeduites, joursNonRemuneres, lignes };
}
