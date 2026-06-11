import Link from "next/link";
import { notFound } from "next/navigation";
import { euros } from "@/lib/paie";
import { createClient } from "@/lib/supabase/server";
import {
  genererBulletinMensuel,
  marquerDeclare,
  validerBulletin,
} from "../../actions";
import { BoutonCopier } from "@/components/bouton-copier";

function libelleMois(mois: string): string {
  return new Date(`${mois}-01T12:00:00`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export default async function BulletinPage({
  params,
}: {
  params: Promise<{ contractId: string; mois: string }>;
}) {
  const { contractId, mois } = await params;
  const supabase = await createClient();

  const { data: bulletin } = await supabase
    .from("payslips")
    .select("id, statut, net_total, total_indemnites, total_du, anomalies, engine_version")
    .eq("contract_id", contractId)
    .eq("mois", `${mois}-01`)
    .maybeSingle();

  if (!bulletin) notFound();

  const [{ data: contrat }, { data: lignes }, { data: declaration }] =
    await Promise.all([
      supabase
        .from("contracts")
        .select("children (prenom, nom)")
        .eq("id", contractId)
        .single(),
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

  const anomalies = (bulletin.anomalies ?? []) as string[];
  const retour = `/paie/${contractId}/${mois}`;
  const lignesSalaire = lignes?.filter((l) => l.section === "salaire") ?? [];
  const lignesIndemnites = lignes?.filter((l) => l.section === "indemnites") ?? [];

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
        <Link href="/paie" className="text-sm text-stone-500">
          ‹ Paie
        </Link>
        <h1 className="mt-1 text-2xl font-bold capitalize">
          {libelleMois(mois)} — {contrat?.children?.prenom}
        </h1>
        <p className="text-sm text-stone-500">
          Bulletin {bulletin.statut === "valide" ? "validé" : "brouillon"} ·
          moteur v{bulletin.engine_version} · montant net estimé, Pajemploi
          fait foi
        </p>
      </div>

      {anomalies.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">⚠ Anomalies de pointage détectées :</p>
          <ul className="mt-1 text-xs">
            {anomalies.map((a, i) => (
              <li key={i}>• {a}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs">
            Corrigez les pointages puis régénérez le bulletin.
          </p>
        </div>
      )}

      {/* ----- La fiche expliquée : chaque ligne est dépliable ----- */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Salaire</h2>
        {lignesSalaire.map((ligne) => (
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
          <span className="font-semibold">Net total</span>
          <span className="text-lg font-bold tabular-nums">
            {euros(Number(bulletin.net_total))}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Indemnités (en sus du salaire)</h2>
        {lignesIndemnites.map((ligne) => (
          <details key={ligne.id} className="border-b border-stone-100 py-2 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between gap-2">
              <span className="text-sm">{ligne.label}</span>
              <span className="font-medium tabular-nums">{euros(Number(ligne.montant))}</span>
            </summary>
            <div className="mt-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
              <p className="font-mono">{ligne.formule}</p>
              <p className="mt-1 italic">Source : {ligne.ref_source}</p>
            </div>
          </details>
        ))}
        <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-3">
          <span className="font-semibold">Total dû par l&apos;employeur</span>
          <span className="text-lg font-bold tabular-nums">
            {euros(Number(bulletin.total_du))}
          </span>
        </div>
      </section>

      {/* ----- Actions bulletin ----- */}
      {bulletin.statut === "brouillon" && (
        <div className="flex gap-2">
          <form action={genererBulletinMensuel} className="flex-1">
            <input type="hidden" name="contract_id" value={contractId} />
            <input type="hidden" name="mois" value={mois} />
            <button
              type="submit"
              className="h-12 w-full rounded-xl border border-stone-300 text-sm font-medium active:bg-stone-50"
            >
              Régénérer
            </button>
          </form>
          <form action={validerBulletin} className="flex-1">
            <input type="hidden" name="payslip_id" value={bulletin.id} />
            <input type="hidden" name="retour" value={retour} />
            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-stone-900 text-sm font-medium text-white active:scale-[0.98]"
            >
              Valider le bulletin
            </button>
          </form>
        </div>
      )}

      {/* ----- Déclaration Pajemploi ----- */}
      {declaration && (
        <section className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Déclaration Pajemploi</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                declaration.statut === "declare"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {declaration.statut === "declare" ? "Déclaré ✓" : "À déclarer"}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-600">
            Une déclaration par enfant. Recopiez chaque champ dans le
            formulaire Pajemploi avec le bouton copier.
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
          {declaration.statut !== "declare" && bulletin.statut === "valide" && (
            <form action={marquerDeclare} className="mt-3">
              <input type="hidden" name="declaration_id" value={declaration.id} />
              <input type="hidden" name="retour" value={retour} />
              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-blue-600 text-sm font-medium text-white active:scale-[0.98]"
              >
                J&apos;ai déclaré sur Pajemploi ✓
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
