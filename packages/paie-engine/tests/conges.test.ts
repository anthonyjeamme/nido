import { describe, expect, it } from "vitest";
import {
  acquisitionConges,
  cpAVerserCeMois,
  remunerationCongesAnneeIncomplete,
} from "../src/conges";

describe("acquisitionConges", () => {
  it("2,5 jours ouvrables par mois d'accueil", () => {
    expect(acquisitionConges(12).montant).toBe(30);
    expect(acquisitionConges(6).montant).toBe(15);
  });

  it("arrondit au jour entier supérieur", () => {
    // 7 mois × 2,5 = 17,5 → 18 jours
    expect(acquisitionConges(7).montant).toBe(18);
  });

  it("plafonne à 30 jours", () => {
    expect(acquisitionConges(13).montant).toBe(30);
  });
});

describe("remunerationCongesAnneeIncomplete", () => {
  it("retient la règle du 1/10e quand elle est plus favorable", () => {
    const res = remunerationCongesAnneeIncomplete({
      salairesPeriodeReference: 6000,
      joursAcquis: 23,
      tauxHoraire: 4.0,
      heuresParSemaine: 30,
    });
    // 1/10e : 600,00 € ; maintien : 23 × (30 ÷ 6) × 4,00 = 460,00 €
    expect(res.methode).toBe("dixieme");
    expect(res.montantTotal).toBe(600);
    expect(res.ligne.inputs.regle_du_dixieme).toBe(600);
    expect(res.ligne.inputs.maintien_de_salaire).toBe(460);
  });

  it("retient le maintien quand il est plus favorable", () => {
    const res = remunerationCongesAnneeIncomplete({
      salairesPeriodeReference: 4000,
      joursAcquis: 30,
      tauxHoraire: 5.0,
      heuresParSemaine: 40,
    });
    // 1/10e : 400,00 € ; maintien : 30 × (40 ÷ 6) × 5,00 = 1000,00 €
    expect(res.methode).toBe("maintien");
    expect(res.montantTotal).toBe(1000);
  });
});

describe("cpAVerserCeMois", () => {
  const remuneration = { remunerationTotale: 600, joursAcquis: 24 };

  it("option juin : tout au mois du versement unique, rien les autres mois", () => {
    expect(
      cpAVerserCeMois({
        option: "juin",
        ...remuneration,
        joursPrisCeMois: 0,
        estMoisDeVersementUnique: true,
      }),
    ).toEqual({ montant: 600, jours: 24 });

    expect(
      cpAVerserCeMois({
        option: "juin",
        ...remuneration,
        joursPrisCeMois: 6,
        estMoisDeVersementUnique: false,
      }),
    ).toEqual({ montant: 0, jours: 0 });
  });

  it("option au fil : proportionnel aux jours pris", () => {
    expect(
      cpAVerserCeMois({
        option: "au_fil",
        ...remuneration,
        joursPrisCeMois: 12,
        estMoisDeVersementUnique: false,
      }),
    ).toEqual({ montant: 300, jours: 12 });
  });

  it("option au fil sans prise ce mois : rien", () => {
    expect(
      cpAVerserCeMois({
        option: "au_fil",
        ...remuneration,
        joursPrisCeMois: 0,
        estMoisDeVersementUnique: false,
      }),
    ).toEqual({ montant: 0, jours: 0 });
  });
});
