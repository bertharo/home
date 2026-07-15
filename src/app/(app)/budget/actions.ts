"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addMonths,
  compareYearMonth,
  type Cadence,
  type CategoryKind,
} from "@/lib/budget";
import type { BudgetSettingsRow } from "@/lib/budget";
import { getMyHouseholdId } from "@/lib/auth";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

async function requireHouseholdId() {
  const householdId = await getMyHouseholdId();
  if (!householdId) throw new Error("No household");
  return householdId;
}

function refresh() {
  revalidatePath("/budget");
  revalidatePath("/");
}

const asCents = (n: number) => Math.round(Number.isFinite(n) ? n : 0);

// --------------------------------------------------------------------------
// Settings
// --------------------------------------------------------------------------

export async function saveSettings(input: {
  startingBalanceCents?: number;
  startYear?: number;
  startMonth?: number;
  horizonMonths?: number;
}) {
  const { supabase } = await ctx();
  const householdId = await requireHouseholdId();
  const { data: existing } = await supabase
    .from("budget_settings")
    .select("*")
    .maybeSingle();

  const row = {
    household_id: householdId,
    starting_balance:
      input.startingBalanceCents !== undefined
        ? asCents(input.startingBalanceCents)
        : (existing?.starting_balance ?? 0),
    start_year: input.startYear ?? existing?.start_year ?? new Date().getFullYear(),
    start_month:
      input.startMonth ?? existing?.start_month ?? new Date().getMonth() + 1,
    horizon_months: input.horizonMonths ?? existing?.horizon_months ?? 24,
    onboarded: existing?.onboarded ?? false,
  };

  await supabase
    .from("budget_settings")
    .upsert(row, { onConflict: "household_id" });
  refresh();
}

export async function setHorizon(horizonMonths: number) {
  await saveSettings({ horizonMonths });
}

// --------------------------------------------------------------------------
// Onboarding
// --------------------------------------------------------------------------

export type OnboardCategoryInput = {
  name: string;
  kind: CategoryKind;
  amountCents: number;
  cadence: Cadence;
  cadenceMonths: number[];
};

export async function completeOnboarding(input: {
  startingBalanceCents: number;
  startYear: number;
  startMonth: number;
  horizonMonths: number;
  categories: OnboardCategoryInput[];
}) {
  const { supabase, userId } = await ctx();
  const householdId = await requireHouseholdId();

  await supabase.from("budget_settings").upsert(
    {
      household_id: householdId,
      starting_balance: asCents(input.startingBalanceCents),
      start_year: input.startYear,
      start_month: input.startMonth,
      horizon_months: input.horizonMonths,
      onboarded: true,
    },
    { onConflict: "household_id" },
  );

  const clean = input.categories.filter((c) => c.name.trim());
  if (clean.length > 0) {
    const counters: Record<string, number> = { revenue: 0, expense: 0 };
    const rows = clean.map((c) => ({
      household_id: householdId,
      name: c.name.trim(),
      kind: c.kind,
      default_amount: asCents(c.amountCents),
      cadence: c.cadence,
      cadence_months: c.cadence === "specific_months" ? c.cadenceMonths : [],
      sort_order: counters[c.kind]++,
      created_by: userId,
      updated_by: userId,
    }));
    await supabase.from("budget_categories").insert(rows);
  }

  refresh();
}

/** Mark onboarding done without seeding (user chose to start from a blank grid). */
export async function skipOnboarding(input: {
  startYear: number;
  startMonth: number;
}) {
  const { supabase } = await ctx();
  const householdId = await requireHouseholdId();
  await supabase.from("budget_settings").upsert(
    {
      household_id: householdId,
      starting_balance: 0,
      start_year: input.startYear,
      start_month: input.startMonth,
      horizon_months: 24,
      onboarded: true,
    },
    { onConflict: "household_id" },
  );
  refresh();
}

// --------------------------------------------------------------------------
// Category CRUD
// --------------------------------------------------------------------------

export async function addCategory(input: {
  name: string;
  kind: CategoryKind;
  amountCents?: number;
  cadence?: Cadence;
  cadenceMonths?: number[];
}) {
  const { supabase, userId } = await ctx();
  const name = input.name.trim();
  if (!name) return;

  const { data: last } = await supabase
    .from("budget_categories")
    .select("sort_order")
    .eq("kind", input.kind)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("budget_categories").insert({
    name,
    kind: input.kind,
    default_amount: asCents(input.amountCents ?? 0),
    cadence: input.cadence ?? "monthly",
    cadence_months:
      input.cadence === "specific_months" ? (input.cadenceMonths ?? []) : [],
    sort_order: (last?.sort_order ?? -1) + 1,
    created_by: userId,
    updated_by: userId,
  });

  refresh();
}

export async function updateCategory(
  id: string,
  fields: {
    name?: string;
    defaultAmountCents?: number;
    cadence?: Cadence;
    cadenceMonths?: number[];
    active?: boolean;
  },
) {
  const { supabase, userId } = await ctx();
  const patch: Record<string, unknown> = { updated_by: userId };
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.defaultAmountCents !== undefined)
    patch.default_amount = asCents(fields.defaultAmountCents);
  if (fields.cadence !== undefined) {
    patch.cadence = fields.cadence;
    if (fields.cadence !== "specific_months") patch.cadence_months = [];
  }
  if (fields.cadenceMonths !== undefined)
    patch.cadence_months = fields.cadenceMonths;
  if (fields.active !== undefined) patch.active = fields.active;

  await supabase.from("budget_categories").update(patch).eq("id", id);
  refresh();
}

export async function deleteCategory(id: string) {
  const { supabase } = await ctx();
  await supabase.from("budget_categories").delete().eq("id", id);
  refresh();
}

export async function reorderCategory(id: string, direction: "up" | "down") {
  const { supabase } = await ctx();
  const { data: current } = await supabase
    .from("budget_categories")
    .select("id, kind, sort_order")
    .eq("id", id)
    .single();
  if (!current) return;

  const base = supabase
    .from("budget_categories")
    .select("id, sort_order")
    .eq("kind", current.kind);
  const filtered =
    direction === "up"
      ? base.lt("sort_order", current.sort_order)
      : base.gt("sort_order", current.sort_order);
  const { data: neighbor } = await filtered
    .order("sort_order", { ascending: direction === "down" })
    .limit(1)
    .maybeSingle();
  if (!neighbor) return;

  await Promise.all([
    supabase
      .from("budget_categories")
      .update({ sort_order: neighbor.sort_order })
      .eq("id", current.id),
    supabase
      .from("budget_categories")
      .update({ sort_order: current.sort_order })
      .eq("id", neighbor.id),
  ]);
  refresh();
}

// --------------------------------------------------------------------------
// Month overrides
// --------------------------------------------------------------------------

export async function setOverride(
  categoryId: string,
  year: number,
  month: number,
  amountCents: number,
) {
  const { supabase, userId } = await ctx();
  await supabase.from("budget_overrides").upsert(
    {
      category_id: categoryId,
      year,
      month,
      amount: asCents(amountCents),
      created_by: userId,
      updated_by: userId,
    },
    { onConflict: "category_id,year,month" },
  );
  refresh();
}

export async function clearOverride(
  categoryId: string,
  year: number,
  month: number,
) {
  const { supabase } = await ctx();
  await supabase
    .from("budget_overrides")
    .delete()
    .eq("category_id", categoryId)
    .eq("year", year)
    .eq("month", month);
  refresh();
}

// --------------------------------------------------------------------------
// Step change — "from this month forward, use this amount".
// Writes overrides for every month >= (fromYear, fromMonth) within the horizon,
// leaving prior months untouched (history preserved).
// --------------------------------------------------------------------------

export async function stepChangeForward(
  categoryId: string,
  fromYear: number,
  fromMonth: number,
  newAmountCents: number,
) {
  const { supabase, userId } = await ctx();

  const { data: settings } = (await supabase
    .from("budget_settings")
    .select("*")
    .maybeSingle()) as { data: BudgetSettingsRow | null };

  const startYear = settings?.start_year ?? fromYear;
  const startMonth = settings?.start_month ?? fromMonth;
  const horizon = settings?.horizon_months ?? 24;
  const from = { year: fromYear, month: fromMonth };

  const rows: {
    category_id: string;
    year: number;
    month: number;
    amount: number;
    created_by: string;
    updated_by: string;
  }[] = [];

  for (let i = 0; i < horizon; i++) {
    const ym = addMonths(startYear, startMonth, i);
    if (compareYearMonth(ym, from) >= 0) {
      rows.push({
        category_id: categoryId,
        year: ym.year,
        month: ym.month,
        amount: asCents(newAmountCents),
        created_by: userId,
        updated_by: userId,
      });
    }
  }

  if (rows.length > 0) {
    await supabase
      .from("budget_overrides")
      .upsert(rows, { onConflict: "category_id,year,month" });
  }
  refresh();
}
