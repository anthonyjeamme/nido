import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { envoyerLienMagique } from "./actions";

const MESSAGES_ERREUR: Record<string, string> = {
  email_invalide: "Veuillez saisir une adresse e-mail valide.",
  envoi: "L'envoi du lien a échoué. Veuillez réessayer dans un instant.",
  lien_invalide:
    "Ce lien de connexion est invalide ou a expiré. Demandez-en un nouveau.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ envoye?: string; erreur?: string; next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/");
  }

  const { envoye, erreur, next } = await searchParams;
  const messageErreur = erreur ? MESSAGES_ERREUR[erreur] : undefined;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Nido</h1>
        <p className="text-center text-sm text-zinc-500">
          Votre quotidien d&apos;assistante maternelle, simplifié.
        </p>
      </div>

      {envoye ? (
        <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-medium text-emerald-900">
            C&apos;est envoyé ! 📬
          </p>
          <p className="mt-2 text-sm text-emerald-800">
            Ouvrez l&apos;e-mail que nous venons de vous envoyer et cliquez sur
            le lien pour vous connecter.
          </p>
        </div>
      ) : (
        <form
          action={envoyerLienMagique}
          className="flex w-full max-w-sm flex-col gap-4"
        >
          {next && <input type="hidden" name="next" value={next} />}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Votre adresse e-mail</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="vous@exemple.fr"
              className="h-12 rounded-xl border border-zinc-300 px-4 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </label>

          {messageErreur && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {messageErreur}
            </p>
          )}

          <button
            type="submit"
            className="h-12 rounded-xl bg-zinc-900 font-medium text-white transition active:scale-[0.98]"
          >
            Recevoir mon lien de connexion
          </button>

          <p className="text-center text-xs text-zinc-500">
            Pas de mot de passe : vous recevez un lien sécurisé par e-mail.
          </p>
        </form>
      )}
    </main>
  );
}
