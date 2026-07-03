"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Recurrence } from "@/lib/types";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

/** Advance a YYYY-MM-DD date by one recurrence interval. */
function nextDueDate(from: Date, recurrence: Recurrence): string | null {
  const d = new Date(from);
  switch (recurrence) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return d.toISOString().slice(0, 10);
}

export async function addChore(formData: FormData) {
  const { supabase, userId } = await ctx();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const notes = String(formData.get("notes") ?? "").trim() || null;
  const recurrence = (String(formData.get("recurrence") ?? "weekly") ||
    "weekly") as Recurrence;
  const rotate = formData.get("rotate") === "on";
  const assignee = formData.get("assignee") as string | null;
  const current_assignee_id = assignee && assignee !== "both" ? assignee : null;
  const next_due =
    String(formData.get("next_due") ?? "") ||
    new Date().toISOString().slice(0, 10);

  await supabase.from("chores").insert({
    title,
    notes,
    recurrence,
    rotate,
    current_assignee_id,
    next_due,
    created_by: userId,
  });

  revalidatePath("/chores");
  revalidatePath("/");
}

export async function completeChore(id: string) {
  const { supabase, userId } = await ctx();

  const { data: chore } = await supabase
    .from("chores")
    .select("*")
    .eq("id", id)
    .single();
  if (!chore) return;

  const now = new Date();
  const next_due =
    chore.recurrence === "none" ? null : nextDueDate(now, chore.recurrence);

  // Rotate to the other household member if enabled.
  let current_assignee_id = chore.current_assignee_id;
  if (chore.rotate) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .order("created_at", { ascending: true });
    if (profiles && profiles.length > 1) {
      const other = profiles.find((p) => p.id !== chore.current_assignee_id);
      current_assignee_id = other?.id ?? current_assignee_id;
    }
  }

  await supabase
    .from("chores")
    .update({
      last_done_at: now.toISOString(),
      last_done_by: userId,
      next_due,
      current_assignee_id,
    })
    .eq("id", id);

  revalidatePath("/chores");
  revalidatePath("/");
}

export async function updateChore(id: string, formData: FormData) {
  const { supabase } = await ctx();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const recurrence = (String(formData.get("recurrence") ?? "weekly") ||
    "weekly") as Recurrence;
  const rotate = formData.get("rotate") === "on";
  const assignee = formData.get("assignee") as string | null;
  const current_assignee_id = assignee && assignee !== "both" ? assignee : null;
  const next_due = String(formData.get("next_due") ?? "") || null;

  await supabase
    .from("chores")
    .update({ title, notes, recurrence, rotate, current_assignee_id, next_due })
    .eq("id", id);

  revalidatePath("/chores");
  revalidatePath("/");
}

export async function deleteChore(id: string) {
  const { supabase } = await ctx();
  await supabase.from("chores").delete().eq("id", id);
  revalidatePath("/chores");
  revalidatePath("/");
}
