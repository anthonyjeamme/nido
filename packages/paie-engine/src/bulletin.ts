import { arrondiCentimes, arrondiEntier, arrondiEntierSuperieur } from "./arrondi";
import { calculeImpactAbsences } from "./absences";
import { getBareme } from "./baremes";
import { calculeHeuresSupplementaires } from "./heures";
import { calculeIndemnites } from "./indemnites";
import {
  calculeMensualisation,
  heuresMensualisees,
  joursActiviteMensualises,
} from "./mensualisation";
import type {
  BaremeValue,
  Bulletin,
  CalculLine,
  ContratPaie,
  EvenementsMois,
} from "./types";

export const ENGINE_VERSION = "0.1.0";

/**
 * Génère le bulletin du mois (US-9.2) : fonction pure
 * (contrat, événements du mois, barèmes) → arbre de lignes explicables.
 */
export function genereBulletin(
  contrat: ContratPaie,
  evenements: EvenementsMois,
  baremes: readonly BaremeValue[],
): Bulletin {
  const dateDuMois = `${evenements.mois}-01`;
  const lignes: CalculLine[] = [];

  // 1. Salaire mensualisé de base
  const mensualisation = calculeMensualisation(contrat);
  lignes.push(mensualisation);

  // 2. Heures complémentaires et majorées (seuil hebdo depuis les barèmes)
  const seuilMajoration = getBareme(
    baremes,
    "SEUIL_HEURES_MAJOREES_SEMAINE",
    dateDuMois,
  );
  const heuresSupp = calculeHeuresSupplementaires(
    contrat,
    evenements.semaines,
    seuilMajoration.valeur,
  );
  lignes.push(...heuresSupp.lignes);

  // 3. Absences (retenues ou maintien)
  const absences = calculeImpactAbsences(contrat, evenements.absences);
  lignes.push(...absences.lignes);

  // 4. Rémunération des CP versée ce mois (année incomplète uniquement)
  let heuresCpAjoutees = 0;
  if (evenements.cpAVerser && evenements.cpAVerser.montant > 0) {
    if (contrat.type === "annee_complete") {
      throw new Error(
        "En année complète, les congés payés sont inclus dans la mensualisation : aucun versement séparé ne doit être déclaré.",
      );
    }
    // Conversion en heures pour le champ « heures normales » Pajemploi.
    heuresCpAjoutees = evenements.cpAVerser.montant / contrat.tauxHoraire;
    lignes.push({
      code: "CP_VERSEMENT",
      label: "Congés payés versés ce mois",
      montant: evenements.cpAVerser.montant,
      formule: "selon l'option de versement du contrat (voir détail congés payés)",
      inputs: {
        montant: evenements.cpAVerser.montant,
        jours: evenements.cpAVerser.jours,
        option_versement: contrat.optionVersementCp,
      },
      ref: {
        code: "CP_REMUNERATION_AI",
        source:
          "CCN particuliers employeurs — en année incomplète, les CP sont rémunérés en plus de la mensualisation",
      },
    });
  }

  // 5. Net total
  const netTotal = arrondiCentimes(
    lignes.reduce((somme, ligne) => somme + ligne.montant, 0),
  );

  // 6. Indemnités (entretien, repas) — en sus du salaire
  const indemnites = calculeIndemnites(
    contrat,
    evenements.joursPresenceReelle,
    evenements.repasFournis,
    baremes,
    dateDuMois,
  );

  // 7. Champs de la déclaration Pajemploi (US-9.3)
  const heuresNormales = arrondiEntier(
    heuresMensualisees(contrat) - absences.heuresDeduites + heuresCpAjoutees,
  );
  const joursActivite = Math.max(
    arrondiEntierSuperieur(joursActiviteMensualises(contrat)) -
      absences.joursNonRemuneres,
    0,
  );

  return {
    mois: evenements.mois,
    lignes,
    netTotal,
    indemnites: indemnites.lignes,
    totalIndemnites: indemnites.total,
    totalDu: arrondiCentimes(netTotal + indemnites.total),
    champsPajemploi: {
      heuresNormales,
      joursActivite,
      joursCongesPayes: evenements.cpAVerser?.jours ?? 0,
      heuresComplementaires: heuresSupp.heuresComplementaires,
      heuresMajorees: heuresSupp.heuresMajorees,
      salaireNetTotal: netTotal,
      indemnitesEntretien: indemnites.totalEntretien,
    },
    engineVersion: ENGINE_VERSION,
  };
}
