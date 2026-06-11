import Link from "next/link";
import { euros } from "@/lib/paie";
import { createClient } from "@/lib/supabase/server";
import { declarerAbsence, genererBulletinMensuel } from "./actions";

const champ =
  "h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-900";

function moisRecents(nombre: number): string[] {
  const liste: string[] = [];
  const d = new Date();
  for (let i = 0; i < nombre; i++) {
    liste.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
    d.setMonth(d.getMonth() - 1);
  }
  return liste;
}

function libelleMois(mois: string): string {
  return new Date(`${mois}-01T12:00:00`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export default async function PaiePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const supabase = await createClient();

  const [{ data: contrats }, { data: bulletins }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, date_debut, children (prenom, nom)")
      .eq("statut", "actif")
      .is("deleted_at", null),
    supabase
      .from("payslips")
      .select("id, contract_id, mois, statut, net_total, total_du"),
  ]);

  const mois = moisRecents(3);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 p-4">
      <h1 className="text-2xl font-bold">Paie</h1>

      {erreur && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          La génération a échoué. Vérifiez que le bulletin du mois n&apos;est
          pas déjà validé.
        </p>
      )}

      {!contrats?.length ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          Activez un contrat pour générer vos bulletins : chaque ligne sera
          expliquée (formule, valeurs, source réglementaire) et la déclaration
          Pajemploi pré-remplie.
        </p>
      ) : (
        contrats.map((contrat) => (
          <section key={contrat.id} className="flex flex-col gap-2">
            <h2 className="font-semibold">
              {contrat.children?.prenom} {contrat.children?.nom}
            </h2>
            <ul className="flex flex-col gap-2">
              {mois.map((m) => {
                const bulletin = bulletins?.find(
                  (b) => b.contract_id === contrat.id && b.mois === `${m}-01`,
                );
                return (
                  <li
                    key={m}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 p-4"
                  >
                    <div>
                      <p className="font-medium capitalize">{libelleMois(m)}</p>
                      {bulletin ? (
                        <p className="text-sm text-zinc-500">
                          {euros(Number(bulletin.total_du))} ·{" "}
                          {bulletin.statut === "valide" ? "validé" : "brouillon"}
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-400">Pas encore généré</p>
                      )}
                    </div>
                    {bulletin ? (
                      <Link
                        href={`/paie/${contrat.id}/${m}`}
                        className="rounded-xl border border-zinc-300 px-4 py-2 text-sm active:bg-zinc-50"
                      >
                        Voir
                      </Link>
                    ) : (
                      <form action={genererBulletinMensuel}>
                        <input type="hidden" name="contract_id" value={contrat.id} />
                        <input type="hidden" name="mois" value={m} />
                        <button
                          type="submit"
                          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98]"
                        >
                          Générer
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>

            <details className="rounded-2xl border border-dashed border-zinc-300 p-4">
              <summary className="cursor-pointer text-sm text-zinc-600">
                + Déclarer une absence sur ce contrat
              </summary>
              <form action={declarerAbsence} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="contract_id" value={contrat.id} />
                <select name="type" className={champ} defaultValue="enfant_convenance">
                  <option value="enfant_convenance">
                    Enfant absent — convenance des parents (rémunérée)
                  </option>
                  <option value="enfant_maladie_certificat">
                    Enfant malade — certificat médical (retenue, limite 5 j/an)
                  </option>
                  <option value="assmat_maladie">Absence assmat (retenue)</option>
                  <option value="cp">Congés payés</option>
                  <option value="sans_solde">Sans solde</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs text-zinc-600">
                    Du
                    <input name="date_debut" type="date" required className={champ} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-zinc-600">
                    Au
                    <input name="date_fin" type="date" className={champ} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-zinc-600">
                    Heures d&apos;accueil manquées
                    <input name="heures" type="number" step="0.5" min="0" required className={champ} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-zinc-600">
                    Jours d&apos;accueil manqués
                    <input name="jours" type="number" step="0.5" min="0" required className={champ} />
                  </label>
                </div>
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-zinc-900 text-sm font-medium text-white active:scale-[0.98]"
                >
                  Enregistrer l&apos;absence
                </button>
              </form>
            </details>
          </section>
        ))
      )}
    </div>
  );
}
