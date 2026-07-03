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

export async function addGrocery(formData: FormData) {
  const { supabase, userId } = await ctx();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const section = String(formData.get("section") ?? "Other") || "Other";
  const qty = String(formData.get("qty") ?? "").trim() || null;

  await supabase
    .from("grocery_items")
    .insert({ name, section, qty, created_by: userId });

  revalidatePath("/grocery");
}

export async function toggleGrocery(id: string, checked: boolean) {
  const { supabase } = await ctx();
  await supabase.from("grocery_items").update({ checked }).eq("id", id);
  revalidatePath("/grocery");
}

export async function deleteGrocery(id: string) {
  const { supabase } = await ctx();
  await supabase.from("grocery_items").delete().eq("id", id);
  revalidatePath("/grocery");
}

export async function clearChecked() {
  const { supabase } = await ctx();
  await supabase.from("grocery_items").delete().eq("checked", true);
  revalidatePath("/grocery");
}
