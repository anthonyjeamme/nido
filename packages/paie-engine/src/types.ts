/**
 * Types fondamentaux du moteur de paie (specs §5.1).
 *
 * Le moteur est un ensemble de fonctions pures :
 *   (contrat, événements du mois, barèmes) → bulletin
 *
 * La sortie n'est jamais un simple montant : chaque ligne est un nœud
 * explicable (formule, valeurs d'entrée, référence réglementaire).
 *
 * Tous les montants sont en euros NETS (le parent et l'assmat raisonnent
 * en net ; Pajemploi calcule les cotisations et fait foi).
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
  /** Montant en euros (négatif pour une retenue). */
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

// ---------------------------------------------------------------------------
// Contrat
// ---------------------------------------------------------------------------

export type TypeContrat = "annee_complete" | "annee_incomplete";

export type OptionVersementCp =
  /** En une seule fois en juin (avec la paie de juin). */
  | "juin"
  /** Lors de la prise principale des congés. */
  | "prise_principale"
  /** Au fur et à mesure de la prise. */
  | "au_fil";

/** Paramètres de paie d'un contrat (sous-ensemble pur de la table `contracts`). */
export interface ContratPaie {
  type: TypeContrat;
  /** Salaire horaire net en euros. */
  tauxHoraire: number;
  /** Heures d'accueil par semaine prévues au contrat. */
  heuresParSemaine: number;
  /** Semaines programmées par an (52 si année complète, ≤ 46 sinon). */
  semainesProgrammees: number;
  /** Jours d'accueil par semaine prévus au contrat. */
  joursAccueilParSemaine: number;
  /** Majoration des heures au-delà de 45 h/semaine, en % (ex. 10 pour +10 %). Libre au contrat. */
  tauxMajorationPct: number;
  /** Indemnité d'entretien par jour de présence réelle, en euros. */
  indemniteEntretienJour: number;
  /** Indemnité par repas fourni par l'assmat, en euros (null si parents fournissent). */
  indemniteRepas: number | null;
  optionVersementCp: OptionVersementCp;
  /** Date de début du contrat (ISO). */
  dateDebut: string;
}

// ---------------------------------------------------------------------------
// Événements du mois (issus des pointages M3, absences M10…)
// ---------------------------------------------------------------------------

export type TypeAbsence =
  /** Absence de l'enfant à la convenance des parents : rémunérée (maintien). */
  | "enfant_convenance"
  /** Maladie de l'enfant avec certificat : retenue possible dans la limite CCN. */
  | "enfant_maladie_certificat"
  /** Absence de l'assmat (hors CP) : non rémunérée. */
  | "assmat"
  /** Congé payé pris. */
  | "cp"
  /** Jour férié chômé. */
  | "ferie";

export interface AbsenceMois {
  type: TypeAbsence;
  /** Heures d'accueil prévues non effectuées du fait de l'absence, sur le mois. */
  heures: number;
  /** Jours d'accueil prévus non effectués, sur le mois. */
  jours: number;
}

/** Une semaine avec les heures réellement effectuées (pour heures comp/majorées). */
export interface SemaineRealisee {
  /** Lundi de la semaine (ISO), pour traçabilité. */
  lundi: string;
  /** Heures d'accueil réellement effectuées sur la semaine. */
  heuresReelles: number;
}

/** Agrégat des événements d'un mois pour un contrat (produit par M3/M10, consommé ici). */
export interface EvenementsMois {
  /** Mois au format "YYYY-MM". */
  mois: string;
  /** Semaines (entières ou partielles) du mois, avec les heures réelles. */
  semaines: SemaineRealisee[];
  /** Jours de présence réelle de l'enfant dans le mois (indemnités d'entretien). */
  joursPresenceReelle: number;
  /** Nombre de repas fournis par l'assmat dans le mois. */
  repasFournis: number;
  /** Absences du mois, déjà qualifiées (l'assmat confirme la qualification en M10). */
  absences: AbsenceMois[];
  /** Jours ouvrables de CP pris ce mois. */
  joursCpPris: number;
  /**
   * Rémunération de CP à verser ce mois (année incomplète uniquement),
   * calculée par `remunerationCongesAnneeIncomplete` selon l'option du contrat.
   * Montant en euros, et jours correspondants pour la déclaration.
   */
  cpAVerser?: { montant: number; jours: number };
}

// ---------------------------------------------------------------------------
// Bulletin (sortie)
// ---------------------------------------------------------------------------

/** Champs de la déclaration Pajemploi mensuelle, par enfant (US-9.3). */
export interface ChampsPajemploi {
  /** Nombre d'heures normales, arrondi à l'entier le plus proche. */
  heuresNormales: number;
  /** Nombre de jours d'activité. */
  joursActivite: number;
  /** Nombre de jours de congés payés (année incomplète, au versement). */
  joursCongesPayes: number;
  heuresComplementaires: number;
  heuresMajorees: number;
  /** Salaire net total (hors indemnités). */
  salaireNetTotal: number;
  /** Indemnités d'entretien du mois (hors salaire). */
  indemnitesEntretien: number;
}

export interface Bulletin {
  mois: string;
  /** Arbre de lignes composant le salaire net (somme = netTotal). */
  lignes: CalculLine[];
  /** Salaire net total du mois (hors indemnités). */
  netTotal: number;
  /** Indemnités (entretien, repas) — dues en sus du salaire, non soumises à cotisations. */
  indemnites: CalculLine[];
  totalIndemnites: number;
  /** Total dû par l'employeur (net + indemnités). */
  totalDu: number;
  champsPajemploi: ChampsPajemploi;
  /** Version du moteur ayant produit ce bulletin. */
  engineVersion: string;
}
