import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { confirmerMessageStructure, envoyerMessageAssmat } from "../actions";

export default async function FilAssmatPage({
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

  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("child_id", childId)
    .single();

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
        <Link href="/messages" className="text-sm text-zinc-500">
          ‹ Messages
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Famille de {enfant.prenom}</h1>
      </div>

      <ul className="flex flex-col gap-2">
        {(messages ?? []).map((message) => {
          const deMoi = message.auteur === user!.id;
          return (
            <li
              key={message.id}
              className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                deMoi
                  ? "self-end bg-zinc-900 text-white"
                  : "self-start border border-zinc-200 bg-white"
              }`}
            >
              <p>{message.contenu}</p>
              <p className={`mt-1 text-xs ${deMoi ? "text-zinc-400" : "text-zinc-400"}`}>
                {new Date(message.created_at).toLocaleString("fr-FR", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
              {!deMoi && message.type !== "libre" && !message.traite_le && (
                <form action={confirmerMessageStructure} className="mt-2">
                  <input type="hidden" name="message_id" value={message.id} />
                  <input type="hidden" name="child_id" value={childId} />
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 active:scale-[0.98]"
                  >
                    {message.type === "absence"
                      ? "Confirmer l'absence (créera l'événement de paie)"
                      : "Bien noté ✓"}
                  </button>
                </form>
              )}
              {message.traite_le && message.type !== "libre" && (
                <p className="mt-1 text-xs text-emerald-600">✓ Confirmé</p>
              )}
            </li>
          );
        })}
      </ul>

      <form action={envoyerMessageAssmat} className="flex gap-2">
        <input type="hidden" name="child_id" value={childId} />
        <input
          name="contenu"
          required
          placeholder="Votre message…"
          className="h-12 flex-1 rounded-xl border border-zinc-300 px-4 text-base outline-none focus:border-zinc-900"
        />
        <button
          type="submit"
          className="h-12 rounded-xl bg-zinc-900 px-5 font-medium text-white active:scale-[0.98]"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
