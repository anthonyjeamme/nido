"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function envoyerLienMagique(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email || !email.includes("@")) {
    redirect("/login?erreur=email_invalide");
  }

  // Destination après connexion (ex. lien d'invitation parent) : conservée
  // en cookie car le lien e-mail ne transporte pas de paramètres custom.
  const next = String(formData.get("next") ?? "");
  if (next.startsWith("/")) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("nido_next", next, {
      httpOnly: true,
      maxAge: 60 * 60,
      path: "/",
    });
  }

  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    console.error("signInWithOtp:", error.message);
    redirect("/login?erreur=envoi");
  }

  redirect("/login?envoye=1");
}
