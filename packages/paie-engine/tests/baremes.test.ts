import { describe, expect, it } from "vitest";
import { getBareme } from "../src/baremes";
import type { BaremeValue } from "../src/types";

const baremes: BaremeValue[] = [
  { code: "SMIC_HORAIRE", valeur: 11.88, dateEffet: "2025-01-01" },
  { code: "SMIC_HORAIRE", valeur: 12.05, dateEffet: "2026-01-01" },
  { code: "MINIMUM_GARANTI", valeur: 4.22, dateEffet: "2025-01-01" },
];

describe("getBareme", () => {
  it("retourne la valeur en vigueur à la date demandée", () => {
    expect(getBareme(baremes, "SMIC_HORAIRE", "2025-06-15").valeur).toBe(11.88);
  });

  it("retourne la valeur la plus récente quand plusieurs sont passées", () => {
    expect(getBareme(baremes, "SMIC_HORAIRE", "2026-03-01").valeur).toBe(12.05);
  });

  it("retourne la valeur dont la date d'effet est exactement la date demandée", () => {
    expect(getBareme(baremes, "SMIC_HORAIRE", "2026-01-01").valeur).toBe(12.05);
  });

  it("lève une erreur si aucune valeur n'est applicable", () => {
    expect(() => getBareme(baremes, "SMIC_HORAIRE", "2024-12-31")).toThrow(/Aucune valeur/);
    expect(() => getBareme(baremes, "INCONNU", "2026-01-01")).toThrow(/Aucune valeur/);
  });
});
