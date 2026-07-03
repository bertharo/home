"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addGoal(formData: FormData) {
  const { supabase, userId } = await ctx();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const kind = (String(formData.get("kind") ?? "joint") || "joint") as
    | "individual"
    | "joint";
  const ownerRaw = formData.get("owner_id") as string | null;
  const owner_id = kind === "individual" && ownerRaw ? ownerRaw : null;
  const year = Number(formData.get("year") ?? new Date().getFullYear());

  await supabase.from("goals").insert({
    title,
    description,
    kind,
    owner_id,
    year,
    created_by: userId,
  });

  revalidatePath("/goals");
  revalidatePath("/");
}

export async function updateGoal(id: string, formData: FormData) {
  const { supabase } = await ctx();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const description = String(formData.get("description") ?? "").trim() || null;
  const kind = (String(formData.get("kind") ?? "joint") || "joint") as
    | "individual"
    | "joint";
  const ownerRaw = formData.get("owner_id") as string | null;
  const owner_id = kind === "individual" && ownerRaw ? ownerRaw : null;
  const status = String(formData.get("status") ?? "not_started");
  const progress_note = String(formData.get("progress_note") ?? "").trim() || null;

  await supabase
    .from("goals")
    .update({ title, description, kind, owner_id, status, progress_note })
    .eq("id", id);

  revalidatePath("/goals");
  revalidatePath("/");
}

/** Quick status change without opening the full editor. */
export async function setGoalStatus(id: string, status: string) {
  const { supabase } = await ctx();
  await supabase.from("goals").update({ status }).eq("id", id);
  revalidatePath("/goals");
  revalidatePath("/");
}

export async function deleteGoal(id: string) {
  const { supabase } = await ctx();
  await supabase.from("goals").delete().eq("id", id);
  revalidatePath("/goals");
  revalidatePath("/");
}
