import { describe, expect, it } from "vitest";
import { agregePointages, lundiDeLaSemaine } from "../src/pointages";

describe("lundiDeLaSemaine", () => {
  it("retourne le lundi ISO de la semaine", () => {
    expect(lundiDeLaSemaine(new Date("2026-06-11T10:00:00Z"))).toBe("2026-06-08"); // jeudi
    expect(lundiDeLaSemaine(new Date("2026-06-08T00:00:00Z"))).toBe("2026-06-08"); // lundi
    expect(lundiDeLaSemaine(new Date("2026-06-14T23:00:00Z"))).toBe("2026-06-08"); // dimanche
  });
});

describe("agregePointages", () => {
  it("une journée simple : 8 h 30 → 17 h 30 = 9 h", () => {
    const res = agregePointages([
      { type: "in", horodatage: "2026-06-08T08:30:00Z" },
      { type: "out", horodatage: "2026-06-08T17:30:00Z" },
    ]);
    expect(res.semaines).toEqual([{ lundi: "2026-06-08", heuresReelles: 9 }]);
    expect(res.joursPresenceReelle).toBe(1);
    expect(res.anomalies).toEqual([]);
  });

  it("cumule les jours d'une même semaine et sépare les semaines", () => {
    const res = agregePointages([
      { type: "in", horodatage: "2026-06-08T08:00:00Z" },
      { type: "out", horodatage: "2026-06-08T17:00:00Z" }, // 9 h, semaine 1
      { type: "in", horodatage: "2026-06-09T08:00:00Z" },
      { type: "out", horodatage: "2026-06-09T16:00:00Z" }, // 8 h, semaine 1
      { type: "in", horodatage: "2026-06-15T09:00:00Z" },
      { type: "out", horodatage: "2026-06-15T18:00:00Z" }, // 9 h, semaine 2
    ]);
    expect(res.semaines).toEqual([
      { lundi: "2026-06-08", heuresReelles: 17 },
      { lundi: "2026-06-15", heuresReelles: 9 },
    ]);
    expect(res.joursPresenceReelle).toBe(3);
  });

  it("arrondit à 5 minutes par défaut (17 h 02 → 17 h 00)", () => {
    const res = agregePointages([
      { type: "in", horodatage: "2026-06-08T08:00:00Z" },
      { type: "out", horodatage: "2026-06-08T17:02:00Z" },
    ]);
    expect(res.semaines[0]?.heuresReelles).toBe(9);
  });

  it("signale une arrivée sans départ", () => {
    const res = agregePointages([
      { type: "in", horodatage: "2026-06-08T08:00:00Z" },
    ]);
    expect(res.anomalies).toHaveLength(1);
    expect(res.anomalies[0]).toContain("Arrivée sans départ");
    expect(res.semaines).toEqual([]);
  });

  it("signale un départ sans arrivée et l'ignore", () => {
    const res = agregePointages([
      { type: "out", horodatage: "2026-06-08T17:00:00Z" },
    ]);
    expect(res.anomalies[0]).toContain("Départ sans arrivée");
  });

  it("gère deux passages le même jour (périscolaire) sans doubler le jour", () => {
    const res = agregePointages([
      { type: "in", horodatage: "2026-06-08T07:00:00Z" },
      { type: "out", horodatage: "2026-06-08T08:30:00Z" }, // 1 h 30
      { type: "in", horodatage: "2026-06-08T16:30:00Z" },
      { type: "out", horodatage: "2026-06-08T18:30:00Z" }, // 2 h
    ]);
    expect(res.semaines[0]?.heuresReelles).toBe(3.5);
    expect(res.joursPresenceReelle).toBe(1);
  });
});
