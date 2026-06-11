import { enregistrerEvenement } from "./journee-actions";

const bouton =
  "rounded-xl border border-zinc-300 px-3 py-2 text-sm active:bg-zinc-100";
const champ =
  "h-10 rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900";

/**
 * Saisie ultra-rapide des événements du jour (US-4.1) :
 * formulaires repliés, gros boutons, une main.
 */
export function SaisieRapide({ childId }: { childId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* Repas : 4 boutons directs, 1 tap */}
      <details className="w-full">
        <summary className="cursor-pointer text-sm font-medium">
          🍽️ Repas
        </summary>
        <form action={enregistrerEvenement} className="mt-2 flex gap-2">
          <input type="hidden" name="child_id" value={childId} />
          <input type="hidden" name="type" value="repas" />
          {(
            [
              ["tout", "Tout mangé"],
              ["bien", "Bien"],
              ["peu", "Peu"],
              ["refus", "Refus"],
            ] as const
          ).map(([valeur, label]) => (
            <button key={valeur} type="submit" name="quantite" value={valeur} className={bouton}>
              {label}
            </button>
          ))}
        </form>
      </details>

      {/* Sieste */}
      <details className="w-full">
        <summary className="cursor-pointer text-sm font-medium">
          😴 Sieste
        </summary>
        <form action={enregistrerEvenement} className="mt-2 flex items-center gap-2">
          <input type="hidden" name="child_id" value={childId} />
          <input type="hidden" name="type" value="sieste" />
          <input
            name="duree_min" type="number" min="5" step="5" placeholder="Durée (min)"
            className={`${champ} w-32`}
          />
          <button type="submit" className={bouton}>Enregistrer</button>
        </form>
      </details>

      {/* Change : 2 boutons directs */}
      <details className="w-full">
        <summary className="cursor-pointer text-sm font-medium">
          🧷 Change
        </summary>
        <div className="mt-2 flex gap-2">
          <form action={enregistrerEvenement}>
            <input type="hidden" name="child_id" value={childId} />
            <input type="hidden" name="type" value="change" />
            <button type="submit" className={bouton}>Pipi</button>
          </form>
          <form action={enregistrerEvenement}>
            <input type="hidden" name="child_id" value={childId} />
            <input type="hidden" name="type" value="change" />
            <input type="hidden" name="selles" value="on" />
            <button type="submit" className={bouton}>Selles</button>
          </form>
        </div>
      </details>

      {/* Activité / note */}
      <details className="w-full">
        <summary className="cursor-pointer text-sm font-medium">
          🎨 Activité ou note
        </summary>
        <form action={enregistrerEvenement} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="child_id" value={childId} />
          <input
            name="texte" required placeholder="Peinture, promenade au parc…"
            className={champ}
          />
          <div className="flex items-center gap-3">
            <select name="type" className={`${champ} flex-1`} defaultValue="activite">
              <option value="activite">Activité</option>
              <option value="humeur">Humeur</option>
              <option value="note">Note</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-zinc-600">
              <input type="checkbox" name="prive" className="h-4 w-4" />
              Privé
            </label>
            <button type="submit" className={bouton}>OK</button>
          </div>
        </form>
      </details>
    </div>
  );
}
