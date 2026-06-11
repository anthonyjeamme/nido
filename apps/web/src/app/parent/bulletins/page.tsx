import Link from "next/link";
import { euros } from "@/lib/paie";
import { createClient } from "@/lib/supabase/server";

function libelleMois(mois: string): string {
  return new Date(`${mois.slice(0, 7)}-01T12:00:00`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export default async function BulletinsParentPage() {
  const supabase = await createClient();

  const { data: bulletins } = await supabase
    .from("payslips")
    .select("id, contract_id, mois, statut, total_du, contracts (child_id, children (prenom))")
    .order("mois", { ascending: false });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Bulletins</h1>
      <p className="text-sm text-zinc-500">
        Chaque montant est expliqué ligne par ligne — exactement ce que voit
        votre assistante maternelle. Montants nets estimés, Pajemploi fait foi.
      </p>

      {!bulletins?.length ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          Aucun bulletin pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bulletins.map((bulletin) => (
            <li key={bulletin.id}>
              <Link
                href={`/parent/bulletins/${bulletin.contract_id}/${bulletin.mois.slice(0, 7)}`}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 active:bg-zinc-50"
              >
                <span>
                  <span className="block font-medium capitalize">
                    {libelleMois(bulletin.mois)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {bulletin.contracts?.children?.prenom} ·{" "}
                    {bulletin.statut === "valide" ? "validé" : "brouillon"}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">
                  {euros(Number(bulletin.total_du))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
