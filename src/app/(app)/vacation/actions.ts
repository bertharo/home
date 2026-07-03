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

export async function addIdea(formData: FormData) {
  const { supabase, userId } = await ctx();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const costRaw = formData.get("rough_cost");
  const rough_cost = costRaw ? Number(costRaw) : null;
  const rough_timing = String(formData.get("rough_timing") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "idea") || "idea";

  await supabase.from("vacation_ideas").insert({
    title,
    notes,
    rough_cost,
    rough_timing,
    status,
    created_by: userId,
  });

  revalidatePath("/vacation");
}

export async function updateIdea(id: string, formData: FormData) {
  const { supabase } = await ctx();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const costRaw = formData.get("rough_cost");
  const rough_cost = costRaw ? Number(costRaw) : null;
  const rough_timing = String(formData.get("rough_timing") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "idea") || "idea";

  await supabase
    .from("vacation_ideas")
    .update({ title, notes, rough_cost, rough_timing, status })
    .eq("id", id);

  revalidatePath("/vacation");
}

export async function setIdeaStatus(id: string, status: string) {
  const { supabase } = await ctx();
  await supabase.from("vacation_ideas").update({ status }).eq("id", id);
  revalidatePath("/vacation");
}

export async function deleteIdea(id: string) {
  const { supabase } = await ctx();
  // Remove associated photos from storage first.
  const { data: photos } = await supabase
    .from("vacation_photos")
    .select("storage_path")
    .eq("idea_id", id);
  if (photos && photos.length > 0) {
    await supabase.storage
      .from("vacation-photos")
      .remove(photos.map((p) => p.storage_path));
  }
  await supabase.from("vacation_ideas").delete().eq("id", id);
  revalidatePath("/vacation");
}

export async function addLink(ideaId: string, formData: FormData) {
  const { supabase } = await ctx();
  let url = String(formData.get("url") ?? "").trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const label = String(formData.get("label") ?? "").trim() || null;

  await supabase
    .from("vacation_links")
    .insert({ idea_id: ideaId, url, label });
  revalidatePath("/vacation");
}

export async function deleteLink(id: string) {
  const { supabase } = await ctx();
  await supabase.from("vacation_links").delete().eq("id", id);
  revalidatePath("/vacation");
}

/** Record a photo row after the client uploaded the file to storage. */
export async function addPhoto(ideaId: string, storagePath: string) {
  const { supabase } = await ctx();
  await supabase
    .from("vacation_photos")
    .insert({ idea_id: ideaId, storage_path: storagePath });
  revalidatePath("/vacation");
}

export async function deletePhoto(id: string, storagePath: string) {
  const { supabase } = await ctx();
  await supabase.storage.from("vacation-photos").remove([storagePath]);
  await supabase.from("vacation_photos").delete().eq("id", id);
  revalidatePath("/vacation");
}
