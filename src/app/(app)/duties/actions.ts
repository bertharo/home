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

export async function addDuty(formData: FormData) {
  const { supabase, userId } = await ctx();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;
  const day_of_week = Number(formData.get("day_of_week") ?? 1);
  const assignee = formData.get("assignee") as string | null;
  const assignee_id = assignee && assignee !== "both" ? assignee : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await supabase.from("pickup_duties").insert({
    label,
    day_of_week,
    assignee_id,
    notes,
    created_by: userId,
  });

  revalidatePath("/duties");
}

export async function updateDuty(id: string, formData: FormData) {
  const { supabase } = await ctx();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;
  const day_of_week = Number(formData.get("day_of_week") ?? 1);
  const assignee = formData.get("assignee") as string | null;
  const assignee_id = assignee && assignee !== "both" ? assignee : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await supabase
    .from("pickup_duties")
    .update({ label, day_of_week, assignee_id, notes })
    .eq("id", id);

  revalidatePath("/duties");
}

export async function deleteDuty(id: string) {
  const { supabase } = await ctx();
  await supabase.from("pickup_duties").delete().eq("id", id);
  revalidatePath("/duties");
}
