import { creerEnfant } from "../actions";

const champ =
  "h-12 rounded-xl border border-zinc-300 px-4 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

export default async function NouvelEnfantPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 p-4">
      <h1 className="text-2xl font-bold">Ajouter un enfant</h1>

      {erreur && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {erreur === "champs"
            ? "Le prénom, le nom et la date de naissance sont obligatoires."
            : "Une erreur est survenue. Veuillez réessayer."}
        </p>
      )}

      <form action={creerEnfant} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Prénom</span>
          <input name="prenom" required className={champ} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Nom</span>
          <input name="nom" required className={champ} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Date de naissance</span>
          <input name="date_naissance" type="date" required className={champ} />
        </label>

        <fieldset className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-medium text-zinc-600">
            Parent employeur (facultatif, modifiable ensuite)
          </legend>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Prénom du parent</span>
            <input name="tuteur_prenom" className={champ} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Nom du parent</span>
            <input name="tuteur_nom" className={champ} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">E-mail du parent</span>
            <input name="tuteur_email" type="email" className={champ} />
          </label>
        </fieldset>

        <button
          type="submit"
          className="h-12 rounded-xl bg-zinc-900 font-medium text-white active:scale-[0.98]"
        >
          Ajouter l&apos;enfant
        </button>
      </form>
    </div>
  );
}
