/** Arrondi monétaire au centime (2 décimales), demi-centime vers le haut. */
export function arrondiCentimes(montant: number): number {
  return Math.round((montant + Number.EPSILON) * 100) / 100;
}

/** Arrondi à l'entier le plus proche (heures normales Pajemploi). */
export function arrondiEntier(valeur: number): number {
  return Math.round(valeur + Number.EPSILON);
}

/** Arrondi à l'entier supérieur (jours d'activité Pajemploi). */
export function arrondiEntierSuperieur(valeur: number): number {
  return Math.ceil(valeur - Number.EPSILON);
}
