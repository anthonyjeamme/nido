import Link from "next/link";
import { euros } from "@/lib/paie";
import { createClient } from "@/lib/supabase/server";

const STATUTS: Record<string, { label: string; classe: string }> = {
  brouillon: { label: "Brouillon", classe: "bg-zinc-100 text-zinc-600" },
  actif: { label: "Actif", classe: "bg-emerald-100 text-emerald-800" },
  termine: { label: "Terminé", classe: "bg-zinc-100 text-zinc-400" },
};

export default async function ContratsPage() {
  const supabase = await createClient();
  const { data: contrats } = await supabase
    .from("contracts")
    .select(
      "id, type, statut, date_debut, taux_horaire, heures_par_semaine, semaines_programmees, children (prenom, nom)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contrats</h1>
        <Link
          href="/contrats/nouveau"
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white active:scale-[0.98]"
        >
          + Nouveau
        </Link>
      </div>

      {!contrats?.length ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          Aucun contrat. Créez votre premier contrat avec le simulateur de
          mensualisation : chaque montant est expliqué, formule et source à
          l&apos;appui.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {contrats.map((c) => {
            const statut = STATUTS[c.statut] ?? STATUTS.brouillon!;
            const mensualisation =
              (Number(c.taux_horaire) *
                Number(c.heures_par_semaine) *
                (c.type === "annee_complete" ? 52 : c.semaines_programmees)) /
              12;
            return (
              <li key={c.id}>
                <Link
                  href={`/contrats/${c.id}`}
                  className="flex flex-col gap-1 rounded-2xl border border-zinc-200 p-4 active:bg-zinc-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {c.children?.prenom} {c.children?.nom}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs ${statut.classe}`}
                    >
                      {statut.label}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    {c.type === "annee_complete"
                      ? "Année complète"
                      : `Année incomplète · ${c.semaines_programmees} sem.`}{" "}
                    · {Number(c.heures_par_semaine)} h/sem ·{" "}
                    {euros(mensualisation)} /mois
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
