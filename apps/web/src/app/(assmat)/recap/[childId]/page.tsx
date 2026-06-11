import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validerEtEnvoyerRecap } from "../../journee-actions";

const QUANTITES: Record<string, string> = {
  tout: "tout mangé",
  bien: "bien mangé",
  peu: "peu mangé",
  refus: "a refusé le repas",
};

export default async function RecapPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { childId } = await params;
  const { date = new Date().toISOString().slice(0, 10) } = await searchParams;
  const supabase = await createClient();

  const [{ data: enfant }, { data: recap }] = await Promise.all([
    supabase
      .from("children")
      .select("prenom")
      .eq("id", childId)
      .single(),
    supabase
      .from("daily_summaries")
      .select("contenu, statut")
      .eq("child_id", childId)
      .eq("date", date)
      .maybeSingle(),
  ]);

  if (!enfant || !recap) notFound();

  const contenu = recap.contenu as {
    repas?: { quantite?: string; commentaire?: string }[];
    siestes?: { duree_min?: number }[];
    changes?: { selles?: boolean }[];
    activites?: { texte?: string }[];
    humeurs?: { texte?: string }[];
    notes?: { texte?: string }[];
    mot_du_jour?: string;
  };

  const sections: { titre: string; lignes: string[] }[] = [
    {
      titre: "🍽️ Repas",
      lignes: (contenu.repas ?? []).map(
        (r) =>
          `${enfant.prenom} a ${QUANTITES[r.quantite ?? "bien"]}${r.commentaire ? ` — ${r.commentaire}` : ""}`,
      ),
    },
    {
      titre: "😴 Siestes",
      lignes: (contenu.siestes ?? []).map((s) =>
        s.duree_min ? `Sieste de ${s.duree_min} minutes` : "A fait la sieste",
      ),
    },
    {
      titre: "🧷 Changes",
      lignes: (contenu.changes ?? []).map((c) =>
        c.selles ? "Change avec selles" : "Change",
      ),
    },
    {
      titre: "🎨 Activités",
      lignes: (contenu.activites ?? [])
        .map((a) => a.texte ?? "")
        .filter(Boolean),
    },
    {
      titre: "💛 Humeur",
      lignes: (contenu.humeurs ?? []).map((h) => h.texte ?? "").filter(Boolean),
    },
    {
      titre: "📝 Notes",
      lignes: (contenu.notes ?? []).map((n) => n.texte ?? "").filter(Boolean),
    },
  ].filter((s) => s.lignes.length > 0);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div>
        <Link href="/" className="text-sm text-zinc-500">
          ‹ Ma journée
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          Récap du soir — {enfant.prenom}
        </h1>
        <p className="text-sm text-zinc-500">
          {new Date(date).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {recap.statut === "envoye" ? (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ Ce récap a été envoyé aux parents.
        </p>
      ) : (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          Relisez la journée de {enfant.prenom} : seuls les événements «
          visibles parents » sont inclus. Un mot personnel, puis envoyez.
        </p>
      )}

      {sections.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          Aucun événement visible aujourd&apos;hui.
        </p>
      ) : (
        sections.map((section) => (
          <section
            key={section.titre}
            className="rounded-2xl border border-zinc-200 p-4"
          >
            <h2 className="text-sm font-semibold">{section.titre}</h2>
            <ul className="mt-1 text-sm text-zinc-700">
              {section.lignes.map((ligne, i) => (
                <li key={i}>• {ligne}</li>
              ))}
            </ul>
          </section>
        ))
      )}

      {recap.statut !== "envoye" && (
        <form action={validerEtEnvoyerRecap} className="flex flex-col gap-3">
          <input type="hidden" name="child_id" value={childId} />
          <input type="hidden" name="date" value={date} />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Un mot pour les parents (facultatif)</span>
            <textarea
              name="mot_du_jour"
              rows={3}
              defaultValue={contenu.mot_du_jour}
              placeholder="Très belle journée, beaucoup de sourires…"
              className="rounded-xl border border-zinc-300 p-3 text-base outline-none focus:border-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="h-12 rounded-xl bg-zinc-900 font-medium text-white active:scale-[0.98]"
          >
            Valider et envoyer aux parents
          </button>
        </form>
      )}
    </div>
  );
}
