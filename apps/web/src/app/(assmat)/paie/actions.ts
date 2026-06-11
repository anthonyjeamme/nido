"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  agregePointages,
  genereBulletin,
  ENGINE_VERSION,
  type AbsenceMois,
  type CalculLine,
} from "@nido/paie-engine";
import { baremeRowsVersBaremes, contratRowVersContratPaie } from "@/lib/paie";
import { createClient } from "@/lib/supabase/server";

function lignesVersJson(lignes: CalculLine[], section: string, depart = 0) {
  return lignes.map((l, i) => ({
    code: l.code,
    label: l.label,
    montant: l.montant,
    formule: l.formule,
    inputs: l.inputs,
    ref_code: l.ref.code,
    ref_source: l.ref.source,
    ref_url: l.ref.url ?? null,
    section,
    ordre: depart + i,
  }));
}

/**
 * Génère le bulletin du mois : pointages + absences → moteur de paie →
 * écriture atomique via la RPC `enregistre_bulletin` (journalisée).
 */
export async function genererBulletinMensuel(formData: FormData) {
  const supabase = await createClient();
  const contractId = String(formData.get("contract_id"));
  const mois = String(formData.get("mois")); // "YYYY-MM"

  const debutMois = `${mois}-01`;
  const moisSuivant = new Date(`${debutMois}T00:00:00Z`);
  moisSuivant.setUTCMonth(moisSuivant.getUTCMonth() + 1);
  const finMois = moisSuivant.toISOString().slice(0, 10);

  const [{ data: contratRow }, { data: baremeRows }, { data: pointages }, { data: absencesRows }] =
    await Promise.all([
      supabase.from("contracts").select("*").eq("id", contractId).single(),
      supabase.from("bareme_values").select("code, valeur, date_effet, source_url"),
      supabase
        .from("attendance_events")
        .select("type, horodatage")
        .eq("contract_id", contractId)
        .gte("horodatage", `${debutMois}T00:00:00Z`)
        .lt("horodatage", `${finMois}T00:00:00Z`)
        .order("horodatage"),
      supabase
        .from("absences")
        .select("type, heures, jours")
        .eq("contract_id", contractId)
        .gte("date_debut", debutMois)
        .lt("date_debut", finMois)
        .is("deleted_at", null),
    ]);

  if (!contratRow) redirect("/paie");

  const contrat = contratRowVersContratPaie(contratRow);
  const baremes = baremeRowsVersBaremes(baremeRows ?? []);
  const agregat = agregePointages(
    (pointages ?? []).map((p) => ({ type: p.type, horodatage: p.horodatage })),
  );

  const absences: AbsenceMois[] = (absencesRows ?? [])
    .filter((a) => a.type !== "ferie")
    .map((a) => ({
      type: (a.type === "assmat_maladie" || a.type === "sans_solde"
        ? "assmat"
        : a.type) as AbsenceMois["type"],
      heures: Number(a.heures),
      jours: Number(a.jours),
    }));

  const joursCpPris = absences
    .filter((a) => a.type === "cp")
    .reduce((somme, a) => somme + a.jours, 0);

  const bulletin = genereBulletin(
    contrat,
    {
      mois,
      semaines: agregat.semaines,
      joursPresenceReelle: agregat.joursPresenceReelle,
      repasFournis: contratRow.assmat_fournit_repas
        ? agregat.joursPresenceReelle
        : 0,
      absences,
      joursCpPris,
    },
    baremes,
  );

  const lignes = [
    ...lignesVersJson(bulletin.lignes, "salaire"),
    ...lignesVersJson(bulletin.indemnites, "indemnites", bulletin.lignes.length),
  ];

  const { error } = await supabase.rpc("enregistre_bulletin", {
    p_contract_id: contractId,
    p_mois: debutMois,
    p_net_total: bulletin.netTotal,
    p_total_indemnites: bulletin.totalIndemnites,
    p_total_du: bulletin.totalDu,
    p_engine_version: ENGINE_VERSION,
    p_anomalies: agregat.anomalies,
    p_lignes: lignes,
    p_declaration: {
      heures_normales: bulletin.champsPajemploi.heuresNormales,
      jours_activite: bulletin.champsPajemploi.joursActivite,
      jours_cp: bulletin.champsPajemploi.joursCongesPayes,
      heures_complementaires: bulletin.champsPajemploi.heuresComplementaires,
      heures_majorees: bulletin.champsPajemploi.heuresMajorees,
      salaire_net_total: bulletin.champsPajemploi.salaireNetTotal,
      indemnites_entretien: bulletin.champsPajemploi.indemnitesEntretien,
    },
  });
  if (error) {
    console.error("enregistre_bulletin:", error.message);
    redirect(`/paie?erreur=generation`);
  }

  revalidatePath("/paie");
  redirect(`/paie/${contractId}/${mois}`);
}

export async function validerBulletin(formData: FormData) {
  const supabase = await createClient();
  const payslipId = String(formData.get("payslip_id"));
  const retour = String(formData.get("retour"));

  const { error } = await supabase.rpc("valide_bulletin", {
    p_payslip_id: payslipId,
  });
  if (error) console.error("valide_bulletin:", error.message);

  revalidatePath(retour);
  redirect(retour);
}

export async function marquerDeclare(formData: FormData) {
  const supabase = await createClient();
  const declarationId = String(formData.get("declaration_id"));
  const retour = String(formData.get("retour"));

  const { error } = await supabase
    .from("pajemploi_declarations")
    .update({ statut: "declare" })
    .eq("id", declarationId);
  if (error) console.error("marquerDeclare:", error.message);

  revalidatePath(retour);
  redirect(retour);
}

export async function declarerAbsence(formData: FormData) {
  const supabase = await createClient();
  const contractId = String(formData.get("contract_id"));

  const { error } = await supabase.from("absences").insert({
    contract_id: contractId,
    type: String(formData.get("type")) as
      | "enfant_convenance" | "enfant_maladie_certificat" | "assmat_maladie"
      | "cp" | "sans_solde" | "ferie",
    date_debut: String(formData.get("date_debut")),
    date_fin: String(formData.get("date_fin") || formData.get("date_debut")),
    heures: Number(formData.get("heures") || 0),
    jours: Number(formData.get("jours") || 0),
    qualification_confirmee: true,
  });
  if (error) console.error("declarerAbsence:", error.message);

  revalidatePath("/paie");
  redirect("/paie");
}
