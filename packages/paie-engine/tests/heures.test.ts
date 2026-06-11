import { describe, expect, it } from "vitest";
import { calculeHeuresSupplementaires } from "../src/heures";
import type { ContratPaie } from "../src/types";

const contrat: ContratPaie = {
  type: "annee_complete",
  tauxHoraire: 4.0,
  heuresParSemaine: 40,
  semainesProgrammees: 52,
  joursAccueilParSemaine: 5,
  tauxMajorationPct: 10,
  indemniteEntretienJour: 4.0,
  indemniteRepas: null,
  optionVersementCp: "juin",
  dateDebut: "2026-01-05",
};

const SEUIL = 45;

describe("calculeHeuresSupplementaires", () => {
  it("aucune heure au-delà du contrat : rien", () => {
    const res = calculeHeuresSupplementaires(
      contrat,
      [{ lundi: "2026-06-01", heuresReelles: 40 }],
      SEUIL,
    );
    expect(res.heuresComplementaires).toBe(0);
    expect(res.heuresMajorees).toBe(0);
    expect(res.lignes).toHaveLength(0);
  });

  it("dépassement sous 45 h : heures complémentaires au taux normal", () => {
    const res = calculeHeuresSupplementaires(
      contrat,
      [{ lundi: "2026-06-01", heuresReelles: 43 }],
      SEUIL,
    );
    expect(res.heuresComplementaires).toBe(3);
    expect(res.heuresMajorees).toBe(0);
    // 3 h × 4,00 € = 12,00 €
    expect(res.lignes[0]?.montant).toBe(12);
  });

  it("dépassement au-delà de 45 h : part complémentaire + part majorée", () => {
    const res = calculeHeuresSupplementaires(
      contrat,
      [{ lundi: "2026-06-01", heuresReelles: 47 }],
      SEUIL,
    );
    // 40 → 45 : 5 h complémentaires ; 45 → 47 : 2 h majorées
    expect(res.heuresComplementaires).toBe(5);
    expect(res.heuresMajorees).toBe(2);
    // comp : 5 × 4,00 = 20,00 ; majo : 2 × (4,00 × 1,10) = 8,80
    expect(res.lignes.find((l) => l.code === "HEURES_COMPLEMENTAIRES")?.montant).toBe(20);
    expect(res.lignes.find((l) => l.code === "HEURES_MAJOREES")?.montant).toBe(8.8);
  });

  it("le seuil s'applique semaine par semaine, pas au cumul du mois", () => {
    const res = calculeHeuresSupplementaires(
      contrat,
      [
        { lundi: "2026-06-01", heuresReelles: 46 }, // 5 comp + 1 majo
        { lundi: "2026-06-08", heuresReelles: 38 }, // rien (sous contrat)
        { lundi: "2026-06-15", heuresReelles: 42 }, // 2 comp
      ],
      SEUIL,
    );
    expect(res.heuresComplementaires).toBe(7);
    expect(res.heuresMajorees).toBe(1);
  });

  it("contrat au-delà du seuil : tout dépassement est majoré", () => {
    const res = calculeHeuresSupplementaires(
      { ...contrat, heuresParSemaine: 46 },
      [{ lundi: "2026-06-01", heuresReelles: 48 }],
      SEUIL,
    );
    expect(res.heuresComplementaires).toBe(0);
    expect(res.heuresMajorees).toBe(2);
  });
});
