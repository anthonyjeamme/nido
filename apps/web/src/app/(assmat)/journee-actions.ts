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
    .select("id, agrement_capacite")
    .eq("profile_id", user.id)
    .single();
  if (!assmat) redirect("/login");
  return { supabase, userId: user.id, assmat };
}

/**
 * Pointage 1 tap (US-3.2). L'horodatage serveur est imposé par trigger ;
 * l'horodatage device (mode hors ligne) est conservé en métadonnée.
 */
export async function pointer(formData: FormData) {
  const { supabase, userId } = await contexteAssmat();

  const { error } = await supabase.from("attendance_events").insert({
    contract_id: String(formData.get("contract_id")),
    child_id: String(formData.get("child_id")),
    type: String(formData.get("type")) as "in" | "out",
    pointe_par: userId,
    horodatage_device:
      String(formData.get("horodatage_device") ?? "") || null,
  });
  if (error) console.error("pointer:", error.message);

  revalidatePath("/");
}

/** Saisie rapide d'un événement du journal (US-4.1, cible ≤ 10 s). */
export async function enregistrerEvenement(formData: FormData) {
  const { supabase, assmat } = await contexteAssmat();

  const type = String(formData.get("type")) as
    | "repas" | "sieste" | "change" | "activite" | "humeur" | "note";

  const payload: Record<string, string | number | boolean | null> = {};
  if (type === "repas") {
    payload.quantite = String(formData.get("quantite") ?? "bien");
    const commentaire = String(formData.get("commentaire") ?? "").trim();
    if (commentaire) payload.commentaire = commentaire;
  } else if (type === "sieste") {
    payload.duree_min = Number(formData.get("duree_min") || 0) || null;
  } else if (type === "change") {
    payload.selles = formData.get("selles") === "on";
  } else if (type === "activite" || type === "note" || type === "humeur") {
    payload.texte = String(formData.get("texte") ?? "").trim();
  }

  const { error } = await supabase.from("daily_log_entries").insert({
    child_id: String(formData.get("child_id")),
    assmat_id: assmat.id,
    type,
    payload,
    visible_parents: formData.get("prive") !== "on",
  });
  if (error) console.error("enregistrerEvenement:", error.message);

  revalidatePath("/");
}

/** Génère (ou régénère) le récap du soir depuis le journal du jour (US-4.3). */
export async function genererRecap(formData: FormData) {
  const { supabase } = await contexteAssmat();
  const childId = String(formData.get("child_id"));
  const date = String(formData.get("date") ?? new Date().toISOString().slice(0, 10));

  const { data: entrees } = await supabase
    .from("daily_log_entries")
    .select("type, heure, payload, visible_parents")
    .eq("child_id", childId)
    .eq("date", date)
    .is("deleted_at", null)
    .order("heure");

  const visibles = (entrees ?? []).filter((e) => e.visible_parents);
  const contenu = {
    repas: visibles.filter((e) => e.type === "repas").map((e) => e.payload),
    siestes: visibles.filter((e) => e.type === "sieste").map((e) => e.payload),
    changes: visibles.filter((e) => e.type === "change").map((e) => e.payload),
    activites: visibles.filter((e) => e.type === "activite").map((e) => e.payload),
    humeurs: visibles.filter((e) => e.type === "humeur").map((e) => e.payload),
    notes: visibles.filter((e) => e.type === "note").map((e) => e.payload),
  };

  await supabase
    .from("daily_summaries")
    .upsert(
      { child_id: childId, date, contenu, statut: "genere" },
      { onConflict: "child_id,date" },
    );

  redirect(`/recap/${childId}?date=${date}`);
}

/** Valide et envoie le récap au parent (visible côté parent dès `envoye`). */
export async function validerEtEnvoyerRecap(formData: FormData) {
  const { supabase } = await contexteAssmat();
  const childId = String(formData.get("child_id"));
  const date = String(formData.get("date"));
  const mot = String(formData.get("mot_du_jour") ?? "").trim();

  const { data: recap } = await supabase
    .from("daily_summaries")
    .select("id, contenu")
    .eq("child_id", childId)
    .eq("date", date)
    .single();
  if (!recap) redirect("/");

  const contenu = {
    ...(recap.contenu as Record<string, unknown>),
    mot_du_jour: mot || undefined,
  };

  await supabase
    .from("daily_summaries")
    .update({ contenu, statut: "envoye", envoye_le: new Date().toISOString() })
    .eq("id", recap.id);

  revalidatePath("/");
  redirect("/");
}
