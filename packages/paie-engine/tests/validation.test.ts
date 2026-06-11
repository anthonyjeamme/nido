import { describe, expect, it } from "vitest";
import { valideContratPaie } from "../src/validation";
import type { BaremeValue, ContratPaie } from "../src/types";

const baremes: BaremeValue[] = [
  { code: "MAJORATION_HEURES_PLANCHER_PCT", valeur: 10, dateEffet: "2022-01-01" },
  { code: "ASSMAT_MIN_CONV_NET_HORAIRE", valeur: 3.28, dateEffet: "2026-06-01" },
  { code: "INDEMNITE_ENTRETIEN_MIN_9H", valeur: 3.92, dateEffet: "2026-06-01" },
  { code: "INDEMNITE_ENTRETIEN_PLANCHER_JOUR", valeur: 2.65, dateEffet: "2022-01-01" },
];

const contratValide: ContratPaie = {
  type: "annee_complete",
  tauxHoraire: 4.0,
  heuresParSemaine: 36, // 9 h/jour sur 4 jours
  semainesProgrammees: 52,
  joursAccueilParSemaine: 4,
  tauxMajorationPct: 10,
  indemniteEntretienJour: 4.0,
  indemniteRepas: null,
  optionVersementCp: "juin",
  dateDebut: "2026-06-01",
};

const DATE = "2026-06-15";

describe("valideContratPaie", () => {
  it("contrat conforme : aucun problème", () => {
    expect(valideContratPaie(contratValide, baremes, DATE)).toEqual([]);
  });

  it("bloque une majoration sous le plancher CCN de 10 %", () => {
    const problemes = valideContratPaie(
      { ...contratValide, tauxMajorationPct: 5 },
      baremes,
      DATE,
    );
    expect(problemes).toContainEqual(
      expect.objectContaining({ code: "MAJORATION_SOUS_PLANCHER", niveau: "bloquant" }),
    );
  });

  it("bloque un taux horaire sous le minimum conventionnel", () => {
    const problemes = valideContratPaie(
      { ...contratValide, tauxHoraire: 3.0 },
      baremes,
      DATE,
    );
    expect(problemes).toContainEqual(
      expect.objectContaining({ code: "TAUX_SOUS_MINIMUM", niveau: "bloquant" }),
    );
  });

  it("bloque une indemnité d'entretien sous le minimum proratisé (9 h/jour → 3,92 €)", () => {
    const problemes = valideContratPaie(
      { ...contratValide, indemniteEntretienJour: 3.5 },
      baremes,
      DATE,
    );
    expect(problemes).toContainEqual(
      expect.objectContaining({ code: "ENTRETIEN_SOUS_MINIMUM", niveau: "bloquant" }),
    );
  });

  it("applique le plancher de 2,65 € même pour un accueil court", () => {
    // 2 h/jour : minimum proratisé = 3,92 ÷ 9 × 2 = 0,87 €, mais plancher 2,65 €
    const problemes = valideContratPaie(
      {
        ...contratValide,
        heuresParSemaine: 8,
        joursAccueilParSemaine: 4,
        indemniteEntretienJour: 2.0,
      },
      baremes,
      DATE,
    );
    const probleme = problemes.find((p) => p.code === "ENTRETIEN_SOUS_MINIMUM");
    expect(probleme).toBeDefined();
    expect(probleme?.message).toContain("2,65");
  });

  it("signale la zone grise 47-51 semaines (choix documenté)", () => {
    const problemes = valideContratPaie(
      { ...contratValide, type: "annee_incomplete", semainesProgrammees: 48 },
      baremes,
      DATE,
    );
    expect(problemes).toContainEqual(
      expect.objectContaining({ code: "SEMAINES_ZONE_GRISE", niveau: "avertissement" }),
    );
  });

  it("bloque une année complète qui n'a pas 52 semaines", () => {
    const problemes = valideContratPaie(
      { ...contratValide, semainesProgrammees: 45 },
      baremes,
      DATE,
    );
    expect(problemes).toContainEqual(
      expect.objectContaining({ code: "SEMAINES_ANNEE_COMPLETE", niveau: "bloquant" }),
    );
  });
});
