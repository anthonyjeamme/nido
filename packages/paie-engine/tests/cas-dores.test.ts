import { describe, expect, it } from "vitest";
import { genereBulletin } from "../src/bulletin";
import type {
  BaremeValue,
  ContratPaie,
  EvenementsMois,
} from "../src/types";
import fixtures from "./fixtures/cas-dores.json";

interface CasDore {
  nom: string;
  source: string;
  contrat: ContratPaie;
  evenements: EvenementsMois;
  attendu: {
    netTotal: number;
    champsPajemploi: Record<string, number>;
  };
  verification: string;
}

const baremes = fixtures.baremes as BaremeValue[];
const cas = fixtures.cas as unknown as CasDore[];

describe("Cas dorés (fixtures JSON, vérifiables à la main)", () => {
  for (const casDore of cas) {
    describe(casDore.nom, () => {
      const bulletin = genereBulletin(
        casDore.contrat,
        casDore.evenements,
        baremes,
      );

      it("net total", () => {
        expect(bulletin.netTotal).toBe(casDore.attendu.netTotal);
      });

      it("champs Pajemploi", () => {
        expect(bulletin.champsPajemploi).toEqual(
          casDore.attendu.champsPajemploi,
        );
      });

      it("toutes les lignes sont explicables", () => {
        for (const ligne of [...bulletin.lignes, ...bulletin.indemnites]) {
          expect(ligne.formule.length, ligne.code).toBeGreaterThan(0);
          expect(Object.keys(ligne.inputs).length, ligne.code).toBeGreaterThan(0);
          expect(ligne.ref.code.length, ligne.code).toBeGreaterThan(0);
        }
      });
    });
  }
});
