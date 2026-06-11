"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { valideContratPaie, type ContratPaie } from "@nido/paie-engine";
import { baremeRowsVersBaremes } from "@/lib/paie";
import { createClient } from "@/lib/supabase/server";

async function assmatIdCourant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assmat } = await supabase
    .from("assmats")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!assmat) redirect("/login");
  return { supabase, assmatId: assmat.id };
}

export async function creerContrat(formData: FormData) {
  const { supabase, assmatId } = await assmatIdCourant();

  const childId = String(formData.get("child_id"));
  const type = String(formData.get("type")) as ContratPaie["type"];
  const semainesProgrammees =
    type === "annee_complete" ? 52 : Number(formData.get("semaines_programmees"));

  const contrat: ContratPaie = {
    type,
    tauxHoraire: Number(formData.get("taux_horaire")),
    heuresParSemaine: Number(formData.get("heures_par_semaine")),
    semainesProgrammees,
    joursAccueilParSemaine: Number(formData.get("jours_accueil_par_semaine")),
    tauxMajorationPct: Number(formData.get("taux_majoration_pct") || 10),
    indemniteEntretienJour: Number(formData.get("indemnite_entretien_jour")),
    indemniteRepas: formData.get("assmat_fournit_repas") === "on"
      ? Number(formData.get("indemnite_repas") || 0)
      : null,
    optionVersementCp: String(
      formData.get("option_versement_cp") || "juin",
    ) as ContratPaie["optionVersementCp"],
    dateDebut: String(formData.get("date_debut")),
  };

  // Validation CCN côté serveur (le client l'affiche déjà en direct, mais le
  // serveur fait foi). Les avertissements (zone grise) ne bloquent pas.
  const { data: baremeRows } = await supabase
    .from("bareme_values")
    .select("code, valeur, date_effet, source_url");
  const problemes = valideContratPaie(
    contrat,
    baremeRowsVersBaremes(baremeRows ?? []),
    contrat.dateDebut,
  );
  if (problemes.some((p) => p.niveau === "bloquant")) {
    redirect(`/contrats/nouveau?enfant=${childId}&erreur=ccn`);
  }

  const { data: cree, error } = await supabase
    .from("contracts")
    .insert({
      assmat_id: assmatId,
      child_id: childId,
      type,
      date_debut: contrat.dateDebut,
      taux_horaire: contrat.tauxHoraire,
      heures_par_semaine: contrat.heuresParSemaine,
      semaines_programmees: semainesProgrammees,
      jours_accueil_par_semaine: contrat.joursAccueilParSemaine,
      taux_majoration_pct: contrat.tauxMajorationPct,
      indemnite_entretien_jour: contrat.indemniteEntretienJour,
      indemnite_repas: contrat.indemniteRepas,
      assmat_fournit_repas: contrat.indemniteRepas !== null,
      option_versement_cp: contrat.optionVersementCp,
      parent_peut_pointer: formData.get("parent_peut_pointer") === "on",
      statut: "brouillon",
    })
    .select("id")
    .single();

  if (error || !cree) {
    console.error("creerContrat:", error?.message);
    redirect(`/contrats/nouveau?enfant=${childId}&erreur=creation`);
  }

  revalidatePath("/contrats");
  redirect(`/contrats/${cree.id}`);
}

export async function majPlanning(formData: FormData) {
  const { supabase, assmatId } = await assmatIdCourant();
  const contractId = String(formData.get("contract_id"));

  // Vérifie la propriété (la RLS protège aussi, ceinture et bretelles)
  const { data: contrat } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .eq("assmat_id", assmatId)
    .single();
  if (!contrat) redirect("/contrats");

  await supabase
    .from("planned_schedules")
    .delete()
    .eq("contract_id", contractId);

  const lignes = [];
  for (let jour = 1; jour <= 7; jour++) {
    const debut = String(formData.get(`debut_${jour}`) ?? "");
    const fin = String(formData.get(`fin_${jour}`) ?? "");
    if (debut && fin && fin > debut) {
      lignes.push({
        contract_id: contractId,
        jour_semaine: jour,
        heure_debut: debut,
        heure_fin: fin,
      });
    }
  }
  if (lignes.length > 0) {
    const { error } = await supabase.from("planned_schedules").insert(lignes);
    if (error) console.error("majPlanning:", error.message);
  }

  revalidatePath(`/contrats/${contractId}`);
  redirect(`/contrats/${contractId}`);
}

export async function activerContrat(formData: FormData) {
  const { supabase, assmatId } = await assmatIdCourant();
  const contractId = String(formData.get("contract_id"));

  await supabase
    .from("contracts")
    .update({ statut: "actif" })
    .eq("id", contractId)
    .eq("assmat_id", assmatId);

  revalidatePath(`/contrats/${contractId}`);
  redirect(`/contrats/${contractId}`);
}
