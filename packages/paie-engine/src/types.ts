/**
 * Types fondamentaux du moteur de paie (specs §5.1).
 *
 * Le moteur est un ensemble de fonctions pures :
 *   (contrat, événements du mois, barèmes) → bulletin
 *
 * La sortie n'est jamais un simple montant : chaque ligne est un nœud
 * explicable (formule, valeurs d'entrée, référence réglementaire).
 */

/** Référence vers une entrée du référentiel réglementaire (article CCN, page Pajemploi…). */
export interface RefReglementaire {
  /** Code de la règle dans `rule_definitions` (ex. "CP_ACQUISITION") ou du barème (ex. "SMIC_HORAIRE"). */
  code: string;
  /** Libellé lisible de la source (ex. "CCN particuliers employeurs, art. 109-2"). */
  source: string;
  url?: string;
}

/** Une ligne de calcul explicable — l'UI ne fait que rendre cet arbre. */
export interface CalculLine {
  /** Code stable de la ligne (ex. "MENSUALISATION", "HEURES_MAJOREES"). */
  code: string;
  /** Libellé affiché, en français. */
  label: string;
  /** Montant en euros (positif ou négatif pour une retenue). */
  montant: number;
  /** Formule lisible, avec les noms des paramètres (ex. "taux_horaire × heures_semaine × 52 ÷ 12"). */
  formule: string;
  /** Valeurs effectivement injectées dans la formule. */
  inputs: Record<string, number | string>;
  /** Référence réglementaire justifiant la ligne. */
  ref: RefReglementaire;
  /** Sous-lignes détaillant le calcul, le cas échéant. */
  details?: CalculLine[];
}

/** Valeur de barème versionnée par date d'effet (jamais de constante en dur dans le code). */
export interface BaremeValue {
  code: string;
  valeur: number;
  dateEffet: string; // ISO date
  sourceUrl?: string;
}
