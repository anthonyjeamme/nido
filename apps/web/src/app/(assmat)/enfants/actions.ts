"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function assmatIdCourant() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("assmatIdCourant: pas d'utilisateur", userError?.message);
    redirect("/login");
  }

  const { data: assmat, error: assmatError } = await supabase
    .from("assmats")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!assmat) {
    console.error("assmatIdCourant: pas d'assmat", assmatError?.message);
    redirect("/login");
  }
  return { supabase, assmatId: assmat.id };
}

export async function creerEnfant(formData: FormData) {
  const { supabase, assmatId } = await assmatIdCourant();

  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const dateNaissance = String(formData.get("date_naissance") ?? "");
  if (!prenom || !nom || !dateNaissance) {
    redirect("/enfants/nouveau?erreur=champs");
  }

  const { data: enfant, error } = await supabase
    .from("children")
    .insert({
      assmat_id: assmatId,
      prenom,
      nom,
      date_naissance: dateNaissance,
    })
    .select("id")
    .single();

  if (error || !enfant) {
    console.error("creerEnfant:", error?.message);
    redirect("/enfants/nouveau?erreur=creation");
  }

  // Fiche santé vide prête à compléter
  await supabase.from("child_health").insert({ child_id: enfant.id });

  // Tuteur principal si renseigné
  const tuteurPrenom = String(formData.get("tuteur_prenom") ?? "").trim();
  const tuteurNom = String(formData.get("tuteur_nom") ?? "").trim();
  const tuteurEmail = String(formData.get("tuteur_email") ?? "").trim();
  if (tuteurPrenom && tuteurNom) {
    await supabase.from("child_guardians").insert({
      child_id: enfant.id,
      prenom: tuteurPrenom,
      nom: tuteurNom,
      email: tuteurEmail || null,
      est_employeur: true,
    });
  }

  revalidatePath("/enfants");
  redirect(`/enfants/${enfant.id}`);
}

export async function ajouterTuteur(formData: FormData) {
  const { supabase } = await assmatIdCourant();
  const childId = String(formData.get("child_id"));

  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  if (!prenom || !nom) redirect(`/enfants/${childId}?erreur=champs`);

  const { error } = await supabase.from("child_guardians").insert({
    child_id: childId,
    prenom,
    nom,
    email: String(formData.get("email") ?? "").trim() || null,
    telephone: String(formData.get("telephone") ?? "").trim() || null,
    est_employeur: formData.get("est_employeur") === "on",
  });
  if (error) console.error("ajouterTuteur:", error.message);

  revalidatePath(`/enfants/${childId}`);
  redirect(`/enfants/${childId}`);
}

export async function basculerAutorisation(formData: FormData) {
  const { supabase } = await assmatIdCourant();
  const childId = String(formData.get("child_id"));
  const type = String(formData.get("type")) as
    | "sortie"
    | "transport"
    | "photo"
    | "medicament"
    | "autre";
  const niveau = String(formData.get("niveau") ?? "") || null;
  const actif = formData.get("actif") === "true";

  const { data: existante } = await supabase
    .from("authorizations")
    .select("id")
    .eq("child_id", childId)
    .eq("type", type)
    .is("deleted_at", null)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (existante) {
    await supabase
      .from("authorizations")
      .update({
        actif,
        niveau,
        signe_par: actif ? user!.id : null,
        signe_le: actif ? new Date().toISOString() : null,
      })
      .eq("id", existante.id);
  } else {
    await supabase.from("authorizations").insert({
      child_id: childId,
      type,
      niveau,
      actif,
      signe_par: actif ? user!.id : null,
      signe_le: actif ? new Date().toISOString() : null,
    });
  }

  revalidatePath(`/enfants/${childId}`);
}

export async function majSante(formData: FormData) {
  const { supabase } = await assmatIdCourant();
  const childId = String(formData.get("child_id"));

  const allergies = String(formData.get("allergies") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  await supabase
    .from("child_health")
    .upsert({ child_id: childId, allergies })
    .eq("child_id", childId);

  revalidatePath(`/enfants/${childId}`);
  redirect(`/enfants/${childId}`);
}
