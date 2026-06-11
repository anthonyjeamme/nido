"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function contexte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

/** Ajoute un traitement — l'ordonnance jointe est OBLIGATOIRE (CA M2/M5). */
export async function ajouterMedicament(formData: FormData) {
  const { supabase, userId } = await contexte();
  const childId = String(formData.get("child_id"));

  const fichier = formData.get("ordonnance") as File | null;
  if (!fichier || fichier.size === 0) {
    redirect(`/enfants/${childId}?erreur=ordonnance`);
  }

  const chemin = `${userId}/ordonnance-${childId}-${Date.now()}-${fichier.name}`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(chemin, fichier);
  if (uploadError) {
    console.error("upload ordonnance:", uploadError.message);
    redirect(`/enfants/${childId}?erreur=ordonnance`);
  }

  const { error } = await supabase.from("medications").insert({
    child_id: childId,
    nom: String(formData.get("nom")),
    posologie: String(formData.get("posologie")),
    ordonnance_path: chemin,
    date_debut: String(formData.get("date_debut")),
    date_fin: String(formData.get("date_fin") || "") || null,
  });
  if (error) console.error("ajouterMedicament:", error.message);

  revalidatePath(`/enfants/${childId}`);
  redirect(`/enfants/${childId}`);
}

/** Fièvre : événement santé infalsifiable, notifié au parent (US-5.1). */
export async function declarerFievre(formData: FormData) {
  const { supabase, userId } = await contexte();
  const childId = String(formData.get("child_id"));

  const { error } = await supabase.from("health_events").insert({
    child_id: childId,
    type: "fievre",
    payload: {
      temp: Number(formData.get("temp")),
      action: String(formData.get("action") || "surveillance"),
    },
    declare_par: userId,
  });
  if (error) console.error("declarerFievre:", error.message);

  revalidatePath("/");
}

/** Administration d'un médicament : ordonnance + autorisation vérifiées serveur. */
export async function administrerMedicament(formData: FormData) {
  const { supabase, userId } = await contexte();
  const childId = String(formData.get("child_id"));

  const { error } = await supabase.from("health_events").insert({
    child_id: childId,
    type: "medicament",
    payload: {
      medication_id: String(formData.get("medication_id")),
      dose: String(formData.get("dose") || "1 prise"),
    },
    declare_par: userId,
  });
  if (error) {
    console.error("administrerMedicament:", error.message);
    redirect(`/enfants/${childId}?erreur=administration`);
  }

  revalidatePath(`/enfants/${childId}`);
  redirect(`/enfants/${childId}`);
}

/** Crée ou ajuste le stock de couches (US-6.1/6.2). */
export async function majStockCouches(formData: FormData) {
  const { supabase } = await contexte();
  const childId = String(formData.get("child_id"));
  const quantite = Number(formData.get("quantite"));
  const seuil = Number(formData.get("seuil_alerte") || 8);

  const { data: existant } = await supabase
    .from("supplies")
    .select("id, quantite")
    .eq("child_id", childId)
    .eq("type", "couches")
    .maybeSingle();

  if (existant) {
    await supabase
      .from("supplies")
      .update({ seuil_alerte: seuil })
      .eq("id", existant.id);
    const delta = quantite - existant.quantite;
    if (delta !== 0) {
      await supabase.from("supply_movements").insert({
        supply_id: existant.id,
        delta,
        source: "ajustement",
        note: "Recomptage par l'assistante maternelle",
      });
    }
  } else {
    await supabase.from("supplies").insert({
      child_id: childId,
      type: "couches",
      label: "Couches",
      quantite,
      seuil_alerte: seuil,
    });
  }

  revalidatePath(`/enfants/${childId}`);
  redirect(`/enfants/${childId}`);
}

/** Confirme un réapprovisionnement annoncé par le parent (US-6.3). */
export async function confirmerReappro(formData: FormData) {
  const { supabase } = await contexte();
  const mouvementId = String(formData.get("mouvement_id"));
  const retour = String(formData.get("retour") || "/");

  await supabase
    .from("supply_movements")
    .update({ confirme: true })
    .eq("id", mouvementId);

  revalidatePath(retour);
  redirect(retour);
}
