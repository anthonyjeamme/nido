"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function contexteAssmat() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assmat } = await supabase
    .from("assmats")
    .select("id, reglages_visibilite")
    .eq("profile_id", user.id)
    .single();
  if (!assmat) redirect("/login");
  return { supabase, userId: user.id, assmat };
}

export async function envoyerMessageAssmat(formData: FormData) {
  const { supabase, userId } = await contexteAssmat();
  const childId = String(formData.get("child_id"));
  const contenu = String(formData.get("contenu") ?? "").trim();
  if (!contenu) redirect(`/messages/${childId}`);

  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("child_id", childId)
    .single();
  if (!thread) redirect("/messages");

  const { error } = await supabase.from("messages").insert({
    thread_id: thread.id,
    auteur: userId,
    contenu,
  });
  if (error) console.error("envoyerMessageAssmat:", error.message);

  revalidatePath(`/messages/${childId}`);
  redirect(`/messages/${childId}`);
}

/**
 * Confirme un message structuré (US-8.3) : une absence annoncée par le
 * parent crée l'événement d'absence correspondant après confirmation.
 */
export async function confirmerMessageStructure(formData: FormData) {
  const { supabase } = await contexteAssmat();
  const messageId = String(formData.get("message_id"));
  const childId = String(formData.get("child_id"));

  const { data: message } = await supabase
    .from("messages")
    .select("id, type, payload")
    .eq("id", messageId)
    .single();
  if (!message) redirect(`/messages/${childId}`);

  if (message.type === "absence") {
    const payload = message.payload as { date?: string };
    const date = payload.date ?? new Date().toISOString().slice(0, 10);

    const { data: contrat } = await supabase
      .from("contracts")
      .select("id, heures_par_semaine, jours_accueil_par_semaine")
      .eq("child_id", childId)
      .eq("statut", "actif")
      .is("deleted_at", null)
      .maybeSingle();

    if (contrat) {
      const heuresParJour =
        Number(contrat.heures_par_semaine) /
        Number(contrat.jours_accueil_par_semaine);
      await supabase.from("absences").insert({
        contract_id: contrat.id,
        type: "enfant_convenance",
        date_debut: date,
        date_fin: date,
        heures: Math.round(heuresParJour * 2) / 2,
        jours: 1,
        qualification_confirmee: true,
        note: "Annoncée par le parent via la messagerie",
      });
    }
  }

  await supabase
    .from("messages")
    .update({ traite_le: new Date().toISOString() })
    .eq("id", messageId);

  revalidatePath(`/messages/${childId}`);
  redirect(`/messages/${childId}`);
}

/** Réglage des horaires de disponibilité de la messagerie (US-8.2). */
export async function reglerPlageDispo(formData: FormData) {
  const { supabase, assmat } = await contexteAssmat();
  const debut = String(formData.get("debut") ?? "");
  const fin = String(formData.get("fin") ?? "");

  const reglages = {
    ...((assmat.reglages_visibilite as Record<string, unknown>) ?? {}),
    plage_dispo: debut && fin ? { debut, fin } : null,
  };

  await supabase
    .from("assmats")
    .update({ reglages_visibilite: reglages })
    .eq("id", assmat.id);

  revalidatePath("/messages");
  redirect("/messages");
}
