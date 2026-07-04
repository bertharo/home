"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BudgetLineKind } from "@/lib/types";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

/** Normalize a "YYYY-MM" key to the first-of-month date string Postgres wants. */
function monthDate(month: string) {
  return `${month.slice(0, 7)}-01`;
}

export async function addLine(formData: FormData) {
  const { supabase, userId } = await ctx();
  const kind = (String(formData.get("kind") ?? "expense") ||
    "expense") as BudgetLineKind;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const { data: last } = await supabase
    .from("budget_lines")
    .select("sort_order")
    .eq("kind", kind)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (last?.sort_order ?? 0) + 1;

  await supabase
    .from("budget_lines")
    .insert({ kind, name, sort_order, created_by: userId });

  revalidatePath("/budget");
  revalidatePath("/");
}

export async function renameLine(id: string, name: string) {
  const { supabase } = await ctx();
  const clean = name.trim();
  if (!clean) return;
  await supabase.from("budget_lines").update({ name: clean }).eq("id", id);
  revalidatePath("/budget");
}

export async function deleteLine(id: string) {
  const { supabase } = await ctx();
  await supabase.from("budget_lines").delete().eq("id", id);
  revalidatePath("/budget");
  revalidatePath("/");
}

/** Upsert a single line's amount for a given month ("YYYY-MM"). */
export async function setAmount(lineId: string, month: string, amount: number) {
  const { supabase } = await ctx();
  const value = Number.isFinite(amount) ? amount : 0;

  await supabase.from("budget_amounts").upsert(
    { line_id: lineId, month: monthDate(month), amount: value },
    { onConflict: "line_id,month" },
  );

  revalidatePath("/budget");
  revalidatePath("/");
}

/** Set the opening balance and the month the cash flow starts accumulating. */
export async function setStartingBalance(month: string, balance: number) {
  const { supabase } = await ctx();
  const value = Number.isFinite(balance) ? balance : 0;

  await supabase.from("budget_meta").upsert(
    { id: true, start_month: monthDate(month), starting_balance: value },
    { onConflict: "id" },
  );

  revalidatePath("/budget");
  revalidatePath("/");
}
