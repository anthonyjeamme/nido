import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { envoyerMessageParent } from "../../actions";

function horsPlage(plage: { debut: string; fin: string } | null): boolean {
  if (!plage) return false;
  const maintenant = new Date().toTimeString().slice(0, 5);
  return maintenant < plage.debut || maintenant > plage.fin;
}

export default async function FilParentPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: enfant } = await supabase
    .from("children")
    .select("id, prenom")
    .eq("id", childId)
    .single();
  if (!enfant) notFound();

  const [{ data: thread }, { data: plageJson }] = await Promise.all([
    supabase.from("threads").select("id").eq("child_id", childId).maybeSingle(),
    supabase.rpc("plage_dispo_assmat", { p_child_id: childId }),
  ]);

  const plage = plageJson as { debut: string; fin: string } | null;
  const silencieux = horsPlage(plage);

  const { data: messages } = thread
    ? await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", thread.id)
        .order("created_at")
    : { data: [] };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div>
        <Link href="/parent/messages" className="text-sm text-stone-500">
          ‹ Messages
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          Votre assistante maternelle
        </h1>
      </div>

      {silencieux && plage && (
        <p className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
          🔕 Votre assistante maternelle consulte ses messages entre{" "}
          {plage.debut} et {plage.fin}. Vous pouvez écrire dès maintenant :
          votre message sera lu à la reprise.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {(messages ?? []).map((message) => {
          const deMoi = message.auteur === user!.id;
          return (
            <li
              key={message.id}
              className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                deMoi
                  ? "self-end bg-blue-600 text-white"
                  : "self-start border border-stone-200 bg-white"
              }`}
            >
              <p>{message.contenu}</p>
              <p className="mt-1 text-xs opacity-60">
                {new Date(message.created_at).toLocaleString("fr-FR", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
                {deMoi && message.type !== "libre" && message.traite_le && " · confirmé ✓"}
              </p>
            </li>
          );
        })}
      </ul>

      {/* Messages structurés rapides (US-8.3) */}
      {thread && (
        <>
          <div className="flex flex-wrap gap-2">
            <form action={envoyerMessageParent}>
              <input type="hidden" name="child_id" value={childId} />
              <input type="hidden" name="type" value="absence" />
              <button
                type="submit"
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm active:bg-stone-50"
              >
                🛌 Absent demain
              </button>
            </form>
            <form action={envoyerMessageParent}>
              <input type="hidden" name="child_id" value={childId} />
              <input type="hidden" name="type" value="retard" />
              <input type="hidden" name="minutes" value="15" />
              <button
                type="submit"
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm active:bg-stone-50"
              >
                ⏰ Retard +15 min
              </button>
            </form>
            <form action={envoyerMessageParent}>
              <input type="hidden" name="child_id" value={childId} />
              <input type="hidden" name="type" value="retard" />
              <input type="hidden" name="minutes" value="30" />
              <button
                type="submit"
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm active:bg-stone-50"
              >
                ⏰ Retard +30 min
              </button>
            </form>
          </div>

          <form action={envoyerMessageParent} className="flex gap-2">
            <input type="hidden" name="child_id" value={childId} />
            <input type="hidden" name="type" value="libre" />
            <input
              name="contenu"
              required
              placeholder="Votre message…"
              className="h-12 flex-1 rounded-xl border border-stone-300 bg-white px-4 text-base outline-none focus:border-stone-900"
            />
            <button
              type="submit"
              className="h-12 rounded-xl bg-blue-600 px-5 font-medium text-white active:scale-[0.98]"
            >
              Envoyer
            </button>
          </form>
        </>
      )}
    </div>
  );
}
