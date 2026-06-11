import Link from "next/link";
import { baremeRowsVersBaremes } from "@/lib/paie";
import { createClient } from "@/lib/supabase/server";
import { FormulaireContrat } from "./formulaire-contrat";

export default async function NouveauContratPage({
  searchParams,
}: {
  searchParams: Promise<{ enfant?: string; erreur?: string }>;
}) {
  const { enfant, erreur } = await searchParams;
  const supabase = await createClient();

  const [{ data: enfants }, { data: baremeRows }] = await Promise.all([
    supabase
      .from("children")
      .select("id, prenom, nom")
      .is("deleted_at", null)
      .order("prenom"),
    supabase.from("bareme_values").select("code, valeur, date_effet, source_url"),
  ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 p-4">
      <div>
        <Link href="/contrats" className="text-sm text-zinc-500">
          ‹ Contrats
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Nouveau contrat</h1>
        <p className="text-sm text-zinc-500">
          Faites varier les paramètres : la mensualisation se met à jour en
          direct, idéal pendant l&apos;entretien avec les parents.
        </p>
      </div>

      {erreur && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {erreur === "ccn"
            ? "Le contrat ne respecte pas la convention collective (voir les contrôles ci-dessous)."
            : "Une erreur est survenue. Veuillez réessayer."}
        </p>
      )}

      {!enfants?.length ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          Ajoutez d&apos;abord un enfant pour créer son contrat.{" "}
          <Link href="/enfants/nouveau" className="underline">
            Ajouter un enfant
          </Link>
        </p>
      ) : (
        <FormulaireContrat
          enfants={enfants}
          baremes={baremeRowsVersBaremes(baremeRows ?? [])}
          enfantPreselectionne={enfant}
        />
      )}
    </div>
  );
}
