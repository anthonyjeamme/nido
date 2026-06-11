import type { SemaineRealisee } from "./types";

export interface PointageBrut {
  /** 'in' (arrivée) ou 'out' (départ). */
  type: "in" | "out";
  /** Horodatage serveur ISO. */
  horodatage: string;
}

/** Lundi (ISO) de la semaine contenant la date donnée, au format YYYY-MM-DD. */
export function lundiDeLaSemaine(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jour = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() - jour);
  return d.toISOString().slice(0, 10);
}

export interface AgregatPointages {
  semaines: SemaineRealisee[];
  /** Jours distincts avec au moins une présence (indemnités d'entretien). */
  joursPresenceReelle: number;
  /** Anomalies détectées (arrivée sans départ…), à montrer à l'assmat. */
  anomalies: string[];
}

/**
 * Agrège les pointages bruts d'un mois en semaines réalisées (US-3.4) :
 * chaque paire arrivée→départ ajoute sa durée à la semaine ISO de l'arrivée.
 *
 * Fonction pure et testée : c'est elle qui garantit le critère « un mois de
 * pointages génère sans saisie supplémentaire le récap d'heures de M9 ».
 */
export function agregePointages(
  pointages: readonly PointageBrut[],
  arrondiMinutes = 5,
): AgregatPointages {
  const tries = [...pointages].sort((a, b) =>
    a.horodatage.localeCompare(b.horodatage),
  );

  const heuresParSemaine = new Map<string, number>();
  const joursPresents = new Set<string>();
  const anomalies: string[] = [];

  let arriveeEnCours: Date | null = null;
  for (const pointage of tries) {
    const quand = new Date(pointage.horodatage);
    if (pointage.type === "in") {
      if (arriveeEnCours) {
        anomalies.push(
          `Deux arrivées sans départ autour du ${arriveeEnCours.toISOString().slice(0, 10)}`,
        );
      }
      arriveeEnCours = quand;
    } else {
      if (!arriveeEnCours) {
        anomalies.push(
          `Départ sans arrivée le ${quand.toISOString().slice(0, 10)}`,
        );
        continue;
      }
      const dureeMs = quand.getTime() - arriveeEnCours.getTime();
      const dureeMin =
        Math.round(dureeMs / 60000 / arrondiMinutes) * arrondiMinutes;
      const lundi = lundiDeLaSemaine(arriveeEnCours);
      heuresParSemaine.set(
        lundi,
        (heuresParSemaine.get(lundi) ?? 0) + dureeMin / 60,
      );
      joursPresents.add(arriveeEnCours.toISOString().slice(0, 10));
      arriveeEnCours = null;
    }
  }
  if (arriveeEnCours) {
    anomalies.push(
      `Arrivée sans départ le ${arriveeEnCours.toISOString().slice(0, 10)}`,
    );
  }

  const semaines: SemaineRealisee[] = [...heuresParSemaine.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([lundi, heures]) => ({
      lundi,
      heuresReelles: Math.round(heures * 100) / 100,
    }));

  return {
    semaines,
    joursPresenceReelle: joursPresents.size,
    anomalies,
  };
}
