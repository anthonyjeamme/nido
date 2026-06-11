import { describe, expect, it } from "vitest";
import {
  calculeMensualisation,
  heuresMensualisees,
  joursActiviteMensualises,
} from "../src/mensualisation";
import type { ContratPaie } from "../src/types";

const base: ContratPaie = {
  type: "annee_complete",
  tauxHoraire: 4.5,
  heuresParSemaine: 40,
  semainesProgrammees: 52,
  joursAccueilParSemaine: 5,
  tauxMajorationPct: 10,
  indemniteEntretienJour: 4.0,
  indemniteRepas: null,
  optionVersementCp: "juin",
  dateDebut: "2026-01-05",
};

describe("calculeMensualisation", () => {
  it("année complète : taux × heures × 52 ÷ 12 (exemple Pajemploi 40 h à 4,50 €)", () => {
    const ligne = calculeMensualisation(base);
    // 4,50 × 40 × 52 ÷ 12 = 780,00 €
    expect(ligne.montant).toBe(780);
    expect(ligne.code).toBe("MENSUALISATION");
    expect(ligne.formule).toContain("52");
  });

  it("année incomplète : taux × heures × semaines programmées ÷ 12", () => {
    const contrat: ContratPaie = {
      ...base,
      type: "annee_incomplete",
      tauxHoraire: 4.2,
      heuresParSemaine: 32,
      semainesProgrammees: 40,
    };
    // 4,20 × 32 × 40 ÷ 12 = 448,00 €
    const ligne = calculeMensualisation(contrat);
    expect(ligne.montant).toBe(448);
    expect(ligne.inputs.semaines_programmees).toBe(40);
  });

  it("arrondit au centime", () => {
    const contrat: ContratPaie = {
      ...base,
      tauxHoraire: 4.37,
      heuresParSemaine: 37,
    };
    // 4,37 × 37 × 52 ÷ 12 = 700,65666… → 700,66
    expect(calculeMensualisation(contrat).montant).toBe(700.66);
  });

  it("expose chaque paramètre utilisé (explicabilité)", () => {
    const ligne = calculeMensualisation(base);
    expect(ligne.inputs.taux_horaire).toBe(4.5);
    expect(ligne.inputs.heures_par_semaine).toBe(40);
    expect(ligne.ref.code).toBe("MENSUALISATION_AC");
  });
});

describe("heuresMensualisees / joursActiviteMensualises", () => {
  it("année complète 40 h/sem : 40 × 52 ÷ 12 = 173,33 h", () => {
    expect(heuresMensualisees(base)).toBeCloseTo(173.333, 2);
  });

  it("année incomplète 32 h/sem sur 40 semaines : 106,67 h", () => {
    expect(
      heuresMensualisees({
        ...base,
        type: "annee_incomplete",
        heuresParSemaine: 32,
        semainesProgrammees: 40,
      }),
    ).toBeCloseTo(106.667, 2);
  });

  it("jours d'activité année complète 5 j/sem : 5 × 52 ÷ 12 = 21,67 j", () => {
    expect(joursActiviteMensualises(base)).toBeCloseTo(21.667, 2);
  });
});
