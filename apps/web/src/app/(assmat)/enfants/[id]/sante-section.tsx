import { createClient } from "@/lib/supabase/server";
import {
  administrerMedicament,
  ajouterMedicament,
  confirmerReappro,
  majStockCouches,
} from "../sante-actions";

const champ =
  "h-11 rounded-xl border border-zinc-300 px-3 text-base outline-none focus:border-zinc-900";

const TYPES_SANTE: Record<string, string> = {
  fievre: "🌡 Fièvre",
  medicament: "💊 Médicament",
  symptome: "🤒 Symptôme",
  incident: "⚠ Incident",
};

export async function SanteSection({
  childId,
  autorisationMedicament,
}: {
  childId: string;
  autorisationMedicament: boolean;
}) {
  const supabase = await createClient();

  const [{ data: medicaments }, { data: stock }, { data: evenements }, { data: reapprosEnAttente }] =
    await Promise.all([
      supabase
        .from("medications")
        .select("id, nom, posologie, actif, date_debut, date_fin")
        .eq("child_id", childId)
        .eq("actif", true),
      supabase
        .from("supplies")
        .select("id, quantite, seuil_alerte")
        .eq("child_id", childId)
        .eq("type", "couches")
        .maybeSingle(),
      supabase
        .from("health_events")
        .select("type, heure, payload")
        .eq("child_id", childId)
        .order("heure", { ascending: false })
        .limit(5),
      supabase
        .from("supply_movements")
        .select("id, delta, created_at, supplies!inner (child_id)")
        .eq("source", "reappro_parent")
        .eq("confirme", false)
        .eq("supplies.child_id", childId),
    ]);

  return (
    <>
      {/* Stock de couches */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Stock de couches</h2>
        {stock && stock.quantite <= stock.seuil_alerte && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            ⚠ Plus que {stock.quantite} couches — pensez à prévenir les
            parents.
          </p>
        )}
        {(reapprosEnAttente ?? []).map((mouvement) => (
          <form
            key={mouvement.id}
            action={confirmerReappro}
            className="flex items-center justify-between rounded-xl bg-blue-50 p-3"
          >
            <input type="hidden" name="mouvement_id" value={mouvement.id} />
            <input type="hidden" name="retour" value={`/enfants/${childId}`} />
            <span className="text-sm text-blue-900">
              Le parent annonce +{mouvement.delta} couches
            </span>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white active:scale-[0.98]"
            >
              Confirmer la réception
            </button>
          </form>
        ))}
        <form
          action={majStockCouches}
          className="flex items-end gap-2 rounded-2xl border border-zinc-200 p-4"
        >
          <input type="hidden" name="child_id" value={childId} />
          <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-600">
            Couches restantes
            <input
              name="quantite" type="number" min="0" required
              defaultValue={stock?.quantite ?? ""}
              className={champ}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-600">
            Seuil d&apos;alerte
            <input
              name="seuil_alerte" type="number" min="1"
              defaultValue={stock?.seuil_alerte ?? 8}
              className={champ}
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-xl border border-zinc-300 px-4 text-sm active:bg-zinc-50"
          >
            OK
          </button>
        </form>
        <p className="text-xs text-zinc-400">
          Chaque change saisi décompte automatiquement une couche.
        </p>
      </section>

      {/* Traitements */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Traitements en cours</h2>
        {!autorisationMedicament && (
          <p className="rounded-xl bg-zinc-100 px-4 py-3 text-xs text-zinc-600">
            L&apos;autorisation parentale « Médicaments » est inactive : aucune
            administration ne pourra être enregistrée (blocage serveur).
          </p>
        )}
        {(medicaments ?? []).map((medicament) => (
          <div
            key={medicament.id}
            className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 p-4"
          >
            <div>
              <p className="font-medium">{medicament.nom}</p>
              <p className="text-xs text-zinc-500">
                {medicament.posologie} · ordonnance jointe ✓
              </p>
            </div>
            <form action={administrerMedicament}>
              <input type="hidden" name="child_id" value={childId} />
              <input type="hidden" name="medication_id" value={medicament.id} />
              <button
                type="submit"
                className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white active:scale-[0.98] disabled:bg-zinc-300"
                disabled={!autorisationMedicament}
              >
                💊 Administrer
              </button>
            </form>
          </div>
        ))}
        <details className="rounded-2xl border border-dashed border-zinc-300 p-4">
          <summary className="cursor-pointer text-sm text-zinc-600">
            + Ajouter un traitement (ordonnance obligatoire)
          </summary>
          <form action={ajouterMedicament} className="mt-3 flex flex-col gap-2">
            <input type="hidden" name="child_id" value={childId} />
            <input name="nom" required placeholder="Nom du médicament" className={champ} />
            <input name="posologie" required placeholder="Posologie (ex. 1 dose si T° > 38,5°)" className={champ} />
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Début
                <input name="date_debut" type="date" required className={champ} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-600">
                Fin (facultatif)
                <input name="date_fin" type="date" className={champ} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-zinc-600">
              Ordonnance (photo ou PDF) — obligatoire
              <input
                name="ordonnance" type="file" required
                accept="image/*,.pdf"
                className="rounded-xl border border-zinc-300 p-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="h-11 rounded-xl bg-zinc-900 text-sm font-medium text-white active:scale-[0.98]"
            >
              Enregistrer le traitement
            </button>
          </form>
        </details>
      </section>

      {/* Historique santé (append-only) */}
      {(evenements?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Derniers événements santé</h2>
          <ul className="flex flex-col gap-1 rounded-2xl border border-zinc-200 p-4 text-sm">
            {evenements!.map((evenement, i) => {
              const payload = evenement.payload as Record<string, unknown>;
              return (
                <li key={i} className="flex justify-between gap-2">
                  <span>
                    {TYPES_SANTE[evenement.type]}
                    {evenement.type === "fievre" && ` ${payload.temp} °C (${payload.action})`}
                    {evenement.type === "symptome" && ` ${payload.texte ?? ""}`}
                    {evenement.type === "medicament" && ` ${payload.dose ?? ""}`}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(evenement.heure).toLocaleString("fr-FR", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-zinc-400">
            Journal infalsifiable : aucune modification ni suppression possible.
          </p>
        </section>
      )}
    </>
  );
}
