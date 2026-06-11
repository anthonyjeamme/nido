import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesParentPage() {
  const supabase = await createClient();

  const { data: enfants } = await supabase
    .from("children")
    .select("id, prenom")
    .is("deleted_at", null)
    .order("prenom");

  if (!enfants?.length) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
          Aucun enfant rattaché à votre compte.
        </p>
      </div>
    );
  }

  if (enfants.length === 1) {
    redirect(`/parent/messages/${enfants[0]!.id}`);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Messages</h1>
      <ul className="flex flex-col gap-2">
        {enfants.map((enfant) => (
          <li key={enfant.id}>
            <Link
              href={`/parent/messages/${enfant.id}`}
              className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 active:bg-zinc-50"
            >
              <span className="font-medium">Au sujet de {enfant.prenom}</span>
              <span className="text-zinc-300">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
