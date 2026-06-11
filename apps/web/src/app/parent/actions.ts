"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Pointage par le parent (uniquement si le contrat l'autorise — RLS). */
export async function pointerParent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("attendance_events").insert({
    contract_id: String(formData.get("contract_id")),
    child_id: String(formData.get("child_id")),
    type: String(formData.get("type")) as "in" | "out",
    pointe_par: user.id,
  });
  if (error) console.error("pointerParent:", error.message);

  revalidatePath("/parent");
}

/** Infos du matin (US-5.4) : symptôme signalé avant l'arrivée. */
export async function signalerSymptome(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const texte = String(formData.get("texte") ?? "").trim();
  if (!texte) redirect("/parent");

  const { error } = await supabase.from("health_events").insert({
    child_id: String(formData.get("child_id")),
    type: "symptome",
    payload: { texte },
    declare_par: user.id,
  });
  if (error) console.error("signalerSymptome:", error.message);

  revalidatePath("/parent");
  redirect("/parent");
}

/** « J'ai réapprovisionné » (US-6.3) : appliqué après confirmation de l'assmat. */
export async function signalerReappro(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("supply_movements").insert({
    supply_id: String(formData.get("supply_id")),
    delta: Number(formData.get("delta") || 0),
    source: "reappro_parent",
    confirme: false,
    note: "Annoncé par le parent",
  });
  if (error) console.error("signalerReappro:", error.message);

  revalidatePath("/parent");
  redirect("/parent");
}

/** Message du parent (libre ou structuré : absence, retard, rdv). */
export async function envoyerMessageParent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const childId = String(formData.get("child_id"));
  const type = String(formData.get("type") || "libre") as
    | "libre" | "absence" | "retard" | "rdv";

  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("child_id", childId)
    .single();
  if (!thread) redirect("/parent/messages");

  let contenu = String(formData.get("contenu") ?? "").trim();
  const payload: Record<string, string> = {};

  if (type === "absence") {
    const date =
      String(formData.get("date") ?? "") ||
      new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    payload.date = date;
    contenu = contenu || `Mon enfant sera absent le ${new Date(date).toLocaleDateString("fr-FR")}.`;
  } else if (type === "retard") {
    const minutes = String(formData.get("minutes") ?? "15");
    payload.minutes = minutes;
    contenu = contenu || `J'aurai ${minutes} minutes de retard ce soir.`;
  }
  if (!contenu) redirect(`/parent/messages/${childId}`);

  const { error } = await supabase.from("messages").insert({
    thread_id: thread.id,
    auteur: user.id,
    contenu,
    type,
    payload,
  });
  if (error) console.error("envoyerMessageParent:", error.message);

  revalidatePath(`/parent/messages/${childId}`);
  redirect(`/parent/messages/${childId}`);
}
