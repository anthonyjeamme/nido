import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Lien d'invitation parent (US Lot 5) : rattache le compte connecté au
 * tuteur, bascule le profil en rôle parent, puis ouvre l'espace parent.
 * La RPC est idempotente pour le même compte.
 */
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invitation/${token}`)}`);
  }

  const { error } = await supabase.rpc("reclame_invitation", {
    p_token: token,
  });

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">Invitation invalide</h1>
        <p className="max-w-sm text-center text-sm text-zinc-600">
          {error.message.includes("déjà été utilisée")
            ? "Cette invitation a déjà été utilisée par un autre compte. Demandez un nouveau lien à votre assistante maternelle."
            : "Ce lien d'invitation est introuvable ou a expiré. Demandez un nouveau lien à votre assistante maternelle."}
        </p>
        <Link href="/" className="text-sm underline">
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  redirect("/parent");
}
