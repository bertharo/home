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

export async function addTransaction(formData: FormData) {
  const { supabase, userId } = await ctx();
  const type = (String(formData.get("type") ?? "expense") ||
    "expense") as "income" | "expense";
  const amount = Number(formData.get("amount") ?? 0);
  if (!amount || amount <= 0) return;
  const category = String(formData.get("category") ?? "Other") || "Other";
  const description = String(formData.get("description") ?? "").trim() || null;
  const txn_date =
    String(formData.get("txn_date") ?? "") ||
    new Date().toISOString().slice(0, 10);

  await supabase.from("transactions").insert({
    type,
    amount,
    category,
    description,
    txn_date,
    created_by: userId,
  });

  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteTransaction(id: string) {
  const { supabase } = await ctx();
  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function addRecurring(formData: FormData) {
  const { supabase, userId } = await ctx();
  const type = (String(formData.get("type") ?? "expense") ||
    "expense") as "income" | "expense";
  const amount = Number(formData.get("amount") ?? 0);
  if (!amount || amount <= 0) return;
  const category = String(formData.get("category") ?? "Other") || "Other";
  const description = String(formData.get("description") ?? "").trim() || null;
  const recurrence = (String(formData.get("recurrence") ?? "monthly") ||
    "monthly") as Recurrence;
  const dayRaw = formData.get("day_of_month");
  const day_of_month = dayRaw ? Number(dayRaw) : null;

  await supabase.from("recurring_transactions").insert({
    type,
    amount,
    category,
    description,
    recurrence,
    day_of_month,
    created_by: userId,
  });

  revalidatePath("/budget");
  revalidatePath("/");
}

export async function toggleRecurring(id: string, active: boolean) {
  const { supabase } = await ctx();
  await supabase.from("recurring_transactions").update({ active }).eq("id", id);
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteRecurring(id: string) {
  const { supabase } = await ctx();
  await supabase.from("recurring_transactions").delete().eq("id", id);
  revalidatePath("/budget");
  revalidatePath("/");
}

/** Post this recurring item as an actual transaction for a given month. */
export async function logRecurringNow(id: string) {
  const { supabase, userId } = await ctx();
  const { data: r } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (!r) return;

  await supabase.from("transactions").insert({
    type: r.type,
    amount: r.amount,
    category: r.category,
    description: r.description,
    txn_date: new Date().toISOString().slice(0, 10),
    created_by: userId,
  });

  revalidatePath("/budget");
  revalidatePath("/");
}

export async function setCategoryBudget(formData: FormData) {
  const { supabase, userId } = await ctx();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const kind = (String(formData.get("kind") ?? "variable") ||
    "variable") as "fixed" | "variable" | "savings" | "income";
  const monthly_budget = Number(formData.get("monthly_budget") ?? 0);

  await supabase.from("budget_categories").upsert(
    { name, kind, monthly_budget, created_by: userId },
    { onConflict: "name" },
  );

  revalidatePath("/budget");
}

export async function deleteCategoryBudget(id: string) {
  const { supabase } = await ctx();
  await supabase.from("budget_categories").delete().eq("id", id);
  revalidatePath("/budget");
}
