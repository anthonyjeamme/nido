import { describe, expect, it } from "vitest";
import { calculeImpactAbsences } from "../src/absences";
import type { ContratPaie } from "../src/types";

const contrat: ContratPaie = {
  type: "annee_incomplete",
  tauxHoraire: 4.0,
  heuresParSemaine: 32,
  semainesProgrammees: 44,
  joursAccueilParSemaine: 4,
  tauxMajorationPct: 10,
  indemniteEntretienJour: 4.0,
  indemniteRepas: null,
  optionVersementCp: "au_fil",
  dateDebut: "2025-09-01",
};

describe("calculeImpactAbsences", () => {
  it("convenance des parents : maintien, aucun impact", () => {
    const res = calculeImpactAbsences(contrat, [
      { type: "enfant_convenance", heures: 8, jours: 1 },
    ]);
    expect(res.heuresDeduites).toBe(0);
    expect(res.joursNonRemuneres).toBe(0);
    expect(res.lignes[0]?.montant).toBe(0);
    expect(res.lignes[0]?.code).toBe("ABSENCE_CONVENANCE");
  });

  it("maladie de l'enfant avec certificat : retenue heures × taux", () => {
    const res = calculeImpactAbsences(contrat, [
      { type: "enfant_maladie_certificat", heures: 16, jours: 2 },
    ]);
    expect(res.heuresDeduites).toBe(16);
    expect(res.joursNonRemuneres).toBe(2);
    // −16 × 4,00 = −64,00 €
    expect(res.lignes[0]?.montant).toBe(-64);
  });

  it("absence de l'assmat : retenue", () => {
    const res = calculeImpactAbsences(contrat, [
      { type: "assmat", heures: 8, jours: 1 },
    ]);
    expect(res.lignes[0]?.montant).toBe(-32);
  });

  it("cumule plusieurs absences", () => {
    const res = calculeImpactAbsences(contrat, [
      { type: "enfant_maladie_certificat", heures: 8, jours: 1 },
      { type: "assmat", heures: 8, jours: 1 },
      { type: "enfant_convenance", heures: 8, jours: 1 },
    ]);
    expect(res.heuresDeduites).toBe(16);
    expect(res.joursNonRemuneres).toBe(2);
  });

  it("ignore cp et fériés (traités ailleurs)", () => {
    const res = calculeImpactAbsences(contrat, [
      { type: "cp", heures: 8, jours: 1 },
      { type: "ferie", heures: 8, jours: 1 },
    ]);
    expect(res.lignes).toHaveLength(0);
    expect(res.heuresDeduites).toBe(0);
  });
});
