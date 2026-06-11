"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"] as const;

async function contexteAssmat() {
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

export async function enregistrerMenu(formData: FormData) {
  const { supabase, assmatId } = await contexteAssmat();
  const semaine = String(formData.get("semaine"));
  const publier = formData.get("publier") === "on";

  const entrees: Record<string, { midi: string; gouter: string }> = {};
  for (const jour of JOURS) {
    entrees[jour] = {
      midi: String(formData.get(`${jour}_midi`) ?? "").trim(),
      gouter: String(formData.get(`${jour}_gouter`) ?? "").trim(),
    };
  }

  const { error } = await supabase
    .from("menus")
    .upsert(
      { assmat_id: assmatId, semaine, entrees, publie: publier },
      { onConflict: "assmat_id,semaine" },
    );
  if (error) console.error("enregistrerMenu:", error.message);

  revalidatePath("/menus");
  redirect(`/menus?semaine=${semaine}`);
}
