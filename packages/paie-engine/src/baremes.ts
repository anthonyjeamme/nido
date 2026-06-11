import type { BaremeValue } from "./types";

/**
 * Résout la valeur d'un barème applicable à une date donnée :
 * la valeur dont la date d'effet est la plus récente parmi celles ≤ date.
 *
 * Les valeurs viennent de la table `bareme_values` — le moteur ne contient
 * aucune constante réglementaire en dur (specs §5.1).
 */
export function getBareme(baremes: readonly BaremeValue[], code: string, date: string): BaremeValue {
  const applicable = baremes
    .filter((b) => b.code === code && b.dateEffet <= date)
    .sort((a, b) => (a.dateEffet < b.dateEffet ? 1 : -1))[0];

  if (!applicable) {
    throw new Error(`Aucune valeur de barème « ${code} » applicable au ${date}`);
  }
  return applicable;
}
