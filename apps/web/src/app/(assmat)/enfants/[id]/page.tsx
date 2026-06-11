import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ajouterTuteur, basculerAutorisation, majSante } from "../actions";

const champ =
  "h-11 rounded-xl border border-zinc-300 px-3 text-base outline-none focus:border-zinc-900";

const AUTORISATIONS: {
  type: "sortie" | "transport" | "photo" | "medicament";
  label: string;
  description: string;
}[] = [
  { type: "sortie", label: "Sorties", description: "Promenades, parc, sorties pédagogiques" },
  { type: "transport", label: "Transport", description: "Trajets en voiture ou transports en commun" },
  { type: "photo", label: "Photos", description: "Prise et partage de photos selon le niveau choisi" },
  { type: "medicament", label: "Médicaments", description: "Administration sur ordonnance uniquement" },
];

export default async function FicheEnfantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: enfant } = await supabase
    .from("children")
    .select("id, prenom, nom, date_naissance")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!enfant) notFound();

  const [{ data: tuteurs }, { data: sante }, { data: autorisations }, { data: contrats }] =
    await Promise.all([
      supabase
        .from("child_guardians")
        .select("id, prenom, nom, email, telephone, est_employeur, profile_id")
        .eq("child_id", id)
        .is("deleted_at", null),
      supabase
        .from("child_health")
        .select("allergies")
        .eq("child_id", id)
        .maybeSingle(),
      supabase
        .from("authorizations")
        .select("type, niveau, actif, signe_le")
        .eq("child_id", id)
        .is("deleted_at", null),
      supabase
        .from("contracts")
        .select("id, statut, date_debut")
        .eq("child_id", id)
        .is("deleted_at", null),
    ]);

  const allergies = (sante?.allergies ?? []) as string[];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-4">
      <div>
        <Link href="/enfants" className="text-sm text-zinc-500">
          ‹ Enfants
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          {enfant.prenom} {enfant.nom}
        </h1>
        <p className="text-sm text-zinc-500">
          Né(e) le {new Date(enfant.date_naissance).toLocaleDateString("fr-FR")}
        </p>
      </div>

      {allergies.length > 0 && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          ⚠ Allergies : {allergies.join(", ")}
        </p>
      )}

      {/* Contrats */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Contrats</h2>
        {contrats?.length ? (
          contrats.map((c) => (
            <Link
              key={c.id}
              href={`/contrats/${c.id}`}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 active:bg-zinc-50"
            >
              <span>
                Contrat du{" "}
                {new Date(c.date_debut).toLocaleDateString("fr-FR")}
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs">
                {c.statut}
              </span>
            </Link>
          ))
        ) : (
          <Link
            href={`/contrats/nouveau?enfant=${enfant.id}`}
            className="rounded-2xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-600 active:bg-zinc-50"
          >
            + Créer le contrat de {enfant.prenom}
          </Link>
        )}
      </section>

      {/* Santé */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Santé</h2>
        <form action={majSante} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4">
          <input type="hidden" name="child_id" value={enfant.id} />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-zinc-600">
              Allergies (séparées par des virgules)
            </span>
            <input
              name="allergies"
              defaultValue={allergies.join(", ")}
              placeholder="arachide, lait de vache…"
              className={champ}
            />
          </label>
          <button
            type="submit"
            className="self-end rounded-xl border border-zinc-300 px-4 py-2 text-sm active:bg-zinc-50"
          >
            Enregistrer
          </button>
        </form>
      </section>

      {/* Autorisations */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Autorisations parentales</h2>
        <p className="text-xs text-zinc-500">
          Chaque autorisation est horodatée et signée. Sans autorisation «
          Photos » active, aucune photo ne peut être partagée ; sans
          autorisation « Médicaments », aucune administration ne peut être
          enregistrée.
        </p>
        <ul className="flex flex-col gap-2">
          {AUTORISATIONS.map((def) => {
            const existante = autorisations?.find((a) => a.type === def.type);
            const active = existante?.actif ?? false;
            return (
              <li
                key={def.type}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-4"
              >
                <div className="flex-1">
                  <p className="font-medium">{def.label}</p>
                  <p className="text-xs text-zinc-500">{def.description}</p>
                  {active && existante?.signe_le && (
                    <p className="mt-1 text-xs text-emerald-700">
                      Signée le{" "}
                      {new Date(existante.signe_le).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                  {def.type === "photo" && active && (
                    <p className="text-xs text-zinc-500">
                      Niveau : {existante?.niveau ?? "privees_parents"}
                    </p>
                  )}
                </div>
                <form action={basculerAutorisation}>
                  <input type="hidden" name="child_id" value={enfant.id} />
                  <input type="hidden" name="type" value={def.type} />
                  {def.type === "photo" && (
                    <input type="hidden" name="niveau" value="privees_parents" />
                  )}
                  <input type="hidden" name="actif" value={String(!active)} />
                  <button
                    type="submit"
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {active ? "Active" : "Inactive"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Tuteurs */}
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Parents et responsables</h2>
        <ul className="flex flex-col gap-2">
          {tuteurs?.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-zinc-200 p-4"
            >
              <p className="font-medium">
                {t.prenom} {t.nom}{" "}
                {t.est_employeur && (
                  <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    employeur
                  </span>
                )}
              </p>
              <p className="text-sm text-zinc-500">
                {[t.email, t.telephone].filter(Boolean).join(" · ") || "—"}
              </p>
              {!t.profile_id && (
                <p className="mt-1 text-xs text-zinc-400">
                  Pas encore de compte parent (invitation à la prochaine étape)
                </p>
              )}
            </li>
          ))}
        </ul>

        <details className="rounded-2xl border border-dashed border-zinc-300 p-4">
          <summary className="cursor-pointer text-sm text-zinc-600">
            + Ajouter un parent / responsable
          </summary>
          <form action={ajouterTuteur} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="child_id" value={enfant.id} />
            <div className="grid grid-cols-2 gap-2">
              <input name="prenom" placeholder="Prénom" required className={champ} />
              <input name="nom" placeholder="Nom" required className={champ} />
            </div>
            <input name="email" type="email" placeholder="E-mail" className={champ} />
            <input name="telephone" placeholder="Téléphone" className={champ} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="est_employeur" className="h-4 w-4" />
              C&apos;est le parent employeur
            </label>
            <button
              type="submit"
              className="h-11 rounded-xl bg-zinc-900 text-sm font-medium text-white active:scale-[0.98]"
            >
              Ajouter
            </button>
          </form>
        </details>
      </section>
    </div>
  );
}
