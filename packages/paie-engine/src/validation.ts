import { arrondiCentimes } from "./arrondi";
import { getBareme } from "./baremes";
import type { BaremeValue, ContratPaie, RefReglementaire } from "./types";

/** Format français : virgule décimale (messages destinés à l'UI). */
function fmt(montant: number): string {
  return montant.toFixed(2).replace(".", ",");
}

export interface ProblemeContrat {
  code: string;
  /** bloquant : contraire à la CCN ; avertissement : zone grise ou à vérifier. */
  niveau: "bloquant" | "avertissement";
  message: string;
  ref: RefReglementaire;
}

/**
 * Vérifie la conformité CCN des paramètres de paie d'un contrat (US-9.1).
 * Utilisé par le simulateur de mensualisation à la création du contrat (M2).
 *
 * Ne bloque jamais silencieusement : retourne la liste des problèmes,
 * l'UI les affiche avec leurs sources (principe du choix documenté, §5.3).
 */
export function valideContratPaie(
  contrat: ContratPaie,
  baremes: readonly BaremeValue[],
  date: string,
): ProblemeContrat[] {
  const problemes: ProblemeContrat[] = [];

  // Semaines programmées vs type de contrat (art. 109.1 / 109.2)
  if (contrat.type === "annee_complete" && contrat.semainesProgrammees !== 52) {
    problemes.push({
      code: "SEMAINES_ANNEE_COMPLETE",
      niveau: "bloquant",
      message:
        "Un contrat en année complète correspond à 52 semaines d'accueil.",
      ref: {
        code: "MENSUALISATION",
        source: "CCN IDCC 3239, art. 109.1",
      },
    });
  }
  if (contrat.type === "annee_incomplete") {
    if (contrat.semainesProgrammees > 51) {
      problemes.push({
        code: "SEMAINES_ANNEE_INCOMPLETE",
        niveau: "bloquant",
        message:
          "Un contrat en année incomplète compte au plus 46 semaines programmées.",
        ref: { code: "MENSUALISATION", source: "CCN IDCC 3239, art. 109.2" },
      });
    } else if (contrat.semainesProgrammees > 46) {
      problemes.push({
        code: "SEMAINES_ZONE_GRISE",
        niveau: "avertissement",
        message:
          "Entre 47 et 51 semaines, la convention collective ne tranche pas (elle ne définit que « 52 semaines » et « 46 semaines ou moins »). Ce choix doit être documenté au contrat.",
        ref: { code: "MENSUALISATION", source: "CCN IDCC 3239, art. 109.1 et 109.2 (vide conventionnel)" },
      });
    }
  }

  // Plancher de majoration des heures > 45 h/sem (art. 110.1)
  const plancherMajoration = getBareme(
    baremes,
    "MAJORATION_HEURES_PLANCHER_PCT",
    date,
  );
  if (contrat.tauxMajorationPct < plancherMajoration.valeur) {
    problemes.push({
      code: "MAJORATION_SOUS_PLANCHER",
      niveau: "bloquant",
      message: `Le taux de majoration des heures au-delà de 45 h/semaine ne peut pas être inférieur à ${plancherMajoration.valeur} %.`,
      ref: {
        code: "MAJORATION_HEURES_PLANCHER_PCT",
        source: "CCN IDCC 3239, art. 110.1",
        url: plancherMajoration.sourceUrl,
      },
    });
  }

  // Salaire horaire minimum conventionnel (équivalent net, indicatif)
  const minimumNet = getBareme(baremes, "ASSMAT_MIN_CONV_NET_HORAIRE", date);
  if (contrat.tauxHoraire < minimumNet.valeur) {
    problemes.push({
      code: "TAUX_SOUS_MINIMUM",
      niveau: "bloquant",
      message: `Le salaire horaire net (${fmt(contrat.tauxHoraire)} €) est inférieur au minimum conventionnel (équivalent net ${fmt(minimumNet.valeur)} €/heure d'accueil).`,
      ref: {
        code: "ASSMAT_MIN_CONV_NET_HORAIRE",
        source: "CCN IDCC 3239, annexe 5 (montant net indicatif Urssaf)",
        url: minimumNet.sourceUrl,
      },
    });
  }

  // Indemnité d'entretien : minimum proratisé + plancher journalier
  const entretienMin9h = getBareme(baremes, "INDEMNITE_ENTRETIEN_MIN_9H", date);
  const plancherEntretien = getBareme(
    baremes,
    "INDEMNITE_ENTRETIEN_PLANCHER_JOUR",
    date,
  );
  const heuresParJour =
    contrat.joursAccueilParSemaine > 0
      ? contrat.heuresParSemaine / contrat.joursAccueilParSemaine
      : 0;
  const minimumEntretien = arrondiCentimes(
    Math.max(
      (entretienMin9h.valeur / 9) * heuresParJour,
      plancherEntretien.valeur,
    ),
  );
  if (contrat.indemniteEntretienJour < minimumEntretien) {
    problemes.push({
      code: "ENTRETIEN_SOUS_MINIMUM",
      niveau: "bloquant",
      message: `L'indemnité d'entretien (${fmt(contrat.indemniteEntretienJour)} €/jour) est inférieure au minimum pour ${heuresParJour.toFixed(1).replace(".", ",")} h d'accueil par jour : ${fmt(minimumEntretien)} € (90 % du minimum garanti pour 9 h, proratisé, plancher ${fmt(plancherEntretien.valeur)} €).`,
      ref: {
        code: "INDEMNITE_ENTRETIEN_MIN_9H",
        source: "Art. D423-7 CASF et CCN IDCC 3239 (plancher conventionnel)",
        url: entretienMin9h.sourceUrl,
      },
    });
  }

  return problemes;
}
