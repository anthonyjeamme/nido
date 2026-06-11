import Link from "next/link";
import { notFound } from "next/navigation";
import { BoutonCopier } from "@/components/bouton-copier";
import { euros } from "@/lib/paie";
import { createClient } from "@/lib/supabase/server";

function libelleMois(mois: string): string {
  return new Date(`${mois}-01T12:00:00`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export default async function BulletinParentPage({
  params,
}: {
  params: Promise<{ contractId: string; mois: string }>;
}) {
  const { contractId, mois } = await params;
  const supabase = await createClient();

  const { data: bulletin } = await supabase
    .from("payslips")
    .select("id, statut, net_total, total_indemnites, total_du, contracts (children (prenom))")
    .eq("contract_id", contractId)
    .eq("mois", `${mois}-01`)
    .maybeSingle();

  if (!bulletin) notFound();

  const [{ data: lignes }, { data: declaration }] = await Promise.all([
    supabase
      .from("payslip_lines")
      .select("*")
      .eq("payslip_id", bulletin.id)
      .order("ordre"),
    supabase
      .from("pajemploi_declarations")
      .select("*")
      .eq("payslip_id", bulletin.id)
      .maybeSingle(),
  ]);

  const champsDeclaration = declaration
    ? [
        { label: "Nombre d'heures normales", valeur: declaration.heures_normales },
        { label: "Nombre de jours d'activité", valeur: declaration.jours_activite },
        { label: "Nombre de jours de congés payés", valeur: Number(declaration.jours_cp) },
        { label: "Heures complémentaires", valeur: Number(declaration.heures_complementaires) },
        { label: "Heures majorées", valeur: Number(declaration.heures_majorees) },
        { label: "Salaire net total", valeur: Number(declaration.salaire_net_total).toFixed(2) },
        { label: "Indemnités d'entretien", valeur: Number(declaration.indemnites_entretien).toFixed(2) },
      ]
    : [];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 p-4">
      <div>
        <Link href="/parent/bulletins" className="text-sm text-stone-500">
          ‹ Bulletins
        </Link>
        <h1 className="mt-1 text-2xl font-bold capitalize">
          {libelleMois(mois)} — {bulletin.contracts?.children?.prenom}
        </h1>
        <p className="text-sm text-stone-500">
          Montant net estimé · Pajemploi fait foi
        </p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Le salaire, expliqué</h2>
        <p className="mt-1 text-xs text-stone-500">
          Touchez une ligne pour voir la formule, les valeurs et la source
          réglementaire.
        </p>
        {(lignes ?? []).map((ligne) => (
          <details key={ligne.id} className="border-b border-stone-100 py-2 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between gap-2">
              <span className="text-sm">{ligne.label}</span>
              <span className={`font-medium tabular-nums ${Number(ligne.montant) < 0 ? "text-red-600" : ""}`}>
                {euros(Number(ligne.montant))}
              </span>
            </summary>
            <div className="mt-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
              <p className="font-mono">{ligne.formule}</p>
              <ul className="mt-1">
                {Object.entries((ligne.inputs ?? {}) as Record<string, unknown>).map(
                  ([cle, valeur]) => (
                    <li key={cle}>
                      {cle.replaceAll("_", " ")} = {String(valeur)}
                    </li>
                  ),
                )}
              </ul>
              <p className="mt-1 italic">
                Source : {ligne.ref_source}
                {ligne.ref_url && (
                  <>
                    {" — "}
                    <a href={ligne.ref_url} target="_blank" rel="noreferrer" className="underline">
                      référence
                    </a>
                  </>
                )}
              </p>
            </div>
          </details>
        ))}
        <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-3">
          <span className="font-semibold">Total dû</span>
          <span className="text-lg font-bold tabular-nums">
            {euros(Number(bulletin.total_du))}
          </span>
        </div>
      </section>

      {declaration && (
        <section className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-4">
          <h2 className="font-semibold">Votre déclaration Pajemploi</h2>
          <p className="mt-1 text-xs text-stone-600">
            En tant que parent employeur, c&apos;est vous qui déclarez. Copiez
            chaque champ dans le formulaire Pajemploi.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {champsDeclaration.map((champ) => (
              <li
                key={champ.label}
                className="flex items-center justify-between gap-2 rounded-xl bg-white p-3"
              >
                <span className="text-sm">{champ.label}</span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{champ.valeur}</span>
                  <BoutonCopier valeur={champ.valeur} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
