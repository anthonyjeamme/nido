import { describe, expect, it } from "vitest";
import { genereBulletin } from "../src/bulletin";
import type { BaremeValue, ContratPaie, EvenementsMois } from "../src/types";

const baremes: BaremeValue[] = [
  { code: "MINIMUM_GARANTI", valeur: 4.22, dateEffet: "2025-01-01" },
  { code: "SEUIL_HEURES_MAJOREES_SEMAINE", valeur: 45, dateEffet: "2022-01-01" },
];

const contratAC: ContratPaie = {
  type: "annee_complete",
  tauxHoraire: 4.5,
  heuresParSemaine: 40,
  semainesProgrammees: 52,
  joursAccueilParSemaine: 5,
  tauxMajorationPct: 10,
  indemniteEntretienJour: 4.0,
  indemniteRepas: 3.5,
  optionVersementCp: "juin",
  dateDebut: "2026-01-05",
};

const moisSansEvenement: EvenementsMois = {
  mois: "2026-06",
  semaines: [
    { lundi: "2026-06-01", heuresReelles: 40 },
    { lundi: "2026-06-08", heuresReelles: 40 },
    { lundi: "2026-06-15", heuresReelles: 40 },
    { lundi: "2026-06-22", heuresReelles: 40 },
  ],
  joursPresenceReelle: 21,
  repasFournis: 21,
  absences: [],
  joursCpPris: 0,
};

describe("genereBulletin — année complète, mois normal", () => {
  const bulletin = genereBulletin(contratAC, moisSansEvenement, baremes);

  it("net = mensualisation seule", () => {
    expect(bulletin.netTotal).toBe(780);
    expect(bulletin.lignes).toHaveLength(1);
  });

  it("indemnités : entretien + repas en sus", () => {
    // entretien : 21 × 4,00 = 84,00 ; repas : 21 × 3,50 = 73,50
    expect(bulletin.totalIndemnites).toBe(157.5);
    expect(bulletin.totalDu).toBe(937.5);
  });

  it("champs Pajemploi : heures normales arrondies à l'entier", () => {
    // 40 × 52 ÷ 12 = 173,33 → 173
    expect(bulletin.champsPajemploi.heuresNormales).toBe(173);
    // 5 × 52 ÷ 12 = 21,67 → arrondi supérieur 22
    expect(bulletin.champsPajemploi.joursActivite).toBe(22);
    expect(bulletin.champsPajemploi.joursCongesPayes).toBe(0);
    expect(bulletin.champsPajemploi.indemnitesEntretien).toBe(84);
  });

  it("chaque ligne est explicable (formule + inputs + ref)", () => {
    for (const ligne of [...bulletin.lignes, ...bulletin.indemnites]) {
      expect(ligne.formule.length).toBeGreaterThan(0);
      expect(Object.keys(ligne.inputs).length).toBeGreaterThan(0);
      expect(ligne.ref.code.length).toBeGreaterThan(0);
    }
  });
});

describe("genereBulletin — mois avec dépassements et absence", () => {
  const evenements: EvenementsMois = {
    ...moisSansEvenement,
    semaines: [
      { lundi: "2026-06-01", heuresReelles: 47 }, // 5 comp + 2 majo
      { lundi: "2026-06-08", heuresReelles: 40 },
      { lundi: "2026-06-15", heuresReelles: 32 }, // 8 h maladie enfant
      { lundi: "2026-06-22", heuresReelles: 40 },
    ],
    absences: [{ type: "enfant_maladie_certificat", heures: 8, jours: 1 }],
  };
  const bulletin = genereBulletin(contratAC, evenements, baremes);

  it("net = mensualisation + comp + majo − retenue", () => {
    // 780 + (5 × 4,50) + (2 × 4,95) − (8 × 4,50) = 780 + 22,50 + 9,90 − 36 = 776,40
    expect(bulletin.netTotal).toBe(776.4);
  });

  it("champs Pajemploi cohérents", () => {
    // heures normales : 173,33 − 8 = 165,33 → 165
    expect(bulletin.champsPajemploi.heuresNormales).toBe(165);
    expect(bulletin.champsPajemploi.heuresComplementaires).toBe(5);
    expect(bulletin.champsPajemploi.heuresMajorees).toBe(2);
    // jours d'activité : 22 − 1 = 21
    expect(bulletin.champsPajemploi.joursActivite).toBe(21);
  });
});

describe("genereBulletin — année incomplète avec CP versés", () => {
  const contratAI: ContratPaie = {
    ...contratAC,
    type: "annee_incomplete",
    tauxHoraire: 4.0,
    heuresParSemaine: 32,
    semainesProgrammees: 44,
    optionVersementCp: "au_fil",
  };
  const evenements: EvenementsMois = {
    ...moisSansEvenement,
    semaines: [
      { lundi: "2026-06-01", heuresReelles: 32 },
      { lundi: "2026-06-08", heuresReelles: 32 },
      { lundi: "2026-06-15", heuresReelles: 32 },
      { lundi: "2026-06-22", heuresReelles: 32 },
    ],
    joursCpPris: 6,
    cpAVerser: { montant: 150, jours: 6 },
  };
  const bulletin = genereBulletin(contratAI, evenements, baremes);

  it("les CP s'ajoutent au salaire mensualisé", () => {
    // mensualisation : 4 × 32 × 44 ÷ 12 = 469,33 ; + 150 de CP = 619,33
    expect(bulletin.netTotal).toBe(619.33);
  });

  it("les CP versés sont convertis en heures normales et déclarés en jours", () => {
    // heures : 32 × 44 ÷ 12 = 117,33 + (150 ÷ 4 = 37,5) = 154,83 → 155
    expect(bulletin.champsPajemploi.heuresNormales).toBe(155);
    expect(bulletin.champsPajemploi.joursCongesPayes).toBe(6);
  });

  it("refuse un versement de CP en année complète", () => {
    expect(() =>
      genereBulletin(contratAC, evenements, baremes),
    ).toThrow(/année complète/);
  });
});
