import Link from "next/link";
import { lundiDeLaSemaine } from "@nido/paie-engine";
import { createClient } from "@/lib/supabase/server";
import { enregistrerMenu } from "./actions";

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"] as const;
const champ =
  "h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-900";

/** Croisement allergènes (US-7.2) : texte du menu vs allergies des enfants. */
function alertesAllergenes(
  entrees: Record<string, { midi?: string; gouter?: string }>,
  allergiesParEnfant: { prenom: string; allergies: string[] }[],
): string[] {
  const alertes: string[] = [];
  const textes = Object.values(entrees)
    .flatMap((j) => [j.midi ?? "", j.gouter ?? ""])
    .join(" ")
    .toLowerCase();
  for (const enfant of allergiesParEnfant) {
    for (const allergie of enfant.allergies) {
      if (allergie && textes.includes(allergie.toLowerCase())) {
        alertes.push(
          `« ${allergie} » apparaît au menu — ${enfant.prenom} y est allergique`,
        );
      }
    }
  }
  return alertes;
}

export default async function MenusPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const semaine = params.semaine ?? lundiDeLaSemaine(new Date());

  const [{ data: menu }, { data: enfantsSante }] = await Promise.all([
    supabase
      .from("menus")
      .select("entrees, publie")
      .eq("semaine", semaine)
      .maybeSingle(),
    supabase
      .from("children")
      .select("prenom, child_health (allergies)")
      .is("deleted_at", null),
  ]);

  const entrees = (menu?.entrees ?? {}) as Record<
    string,
    { midi?: string; gouter?: string }
  >;

  const allergiesParEnfant = (enfantsSante ?? []).map((e) => ({
    prenom: e.prenom,
    allergies: ((e.child_health?.allergies ?? []) as string[]),
  }));
  const alertes = alertesAllergenes(entrees, allergiesParEnfant);

  const semaineSuivante = new Date(`${semaine}T12:00:00`);
  semaineSuivante.setDate(semaineSuivante.getDate() + 7);
  const semainePrecedente = new Date(`${semaine}T12:00:00`);
  semainePrecedente.setDate(semainePrecedente.getDate() - 7);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menus</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/menus?semaine=${semainePrecedente.toISOString().slice(0, 10)}`}
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1"
          >
            ‹
          </Link>
          <span className="text-stone-600">
            Semaine du{" "}
            {new Date(`${semaine}T12:00:00`).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </span>
          <Link
            href={`/menus?semaine=${semaineSuivante.toISOString().slice(0, 10)}`}
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1"
          >
            ›
          </Link>
        </div>
      </div>

      {alertes.map((alerte) => (
        <p
          key={alerte}
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          ⚠ {alerte}
        </p>
      ))}

      {menu?.publie && (
        <p className="text-xs text-emerald-700">
          ✓ Menu publié — visible par les parents.
        </p>
      )}

      <form action={enregistrerMenu} className="flex flex-col gap-3">
        <input type="hidden" name="semaine" value={semaine} />
        {JOURS.map((jour) => (
          <div key={jour} className="rounded-2xl border border-stone-200 bg-white p-3">
            <p className="text-sm font-medium capitalize">{jour}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-stone-500">
                Midi
                <input
                  name={`${jour}_midi`}
                  defaultValue={entrees[jour]?.midi ?? ""}
                  placeholder="Purée de carottes, poulet…"
                  className={champ}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-stone-500">
                Goûter
                <input
                  name={`${jour}_gouter`}
                  defaultValue={entrees[jour]?.gouter ?? ""}
                  placeholder="Compote, gâteau maison…"
                  className={champ}
                />
              </label>
            </div>
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="publier"
            defaultChecked={menu?.publie ?? false}
            className="h-4 w-4"
          />
          Publier ce menu aux parents
        </label>
        <button
          type="submit"
          className="h-12 rounded-xl bg-stone-900 font-medium text-white active:scale-[0.98]"
        >
          Enregistrer le menu
        </button>
      </form>
    </div>
  );
}
