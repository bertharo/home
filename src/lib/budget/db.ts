import type {
  BudgetCategory,
  BudgetSettings,
  Cadence,
  CategoryKind,
  MonthOverride,
} from "./engine";

// --------------------------------------------------------------------------
// Postgres row shapes (snake_case). Money columns are bigint cents.
// --------------------------------------------------------------------------

export interface BudgetSettingsRow {
  id: boolean;
  starting_balance: number | string;
  start_year: number;
  start_month: number;
  horizon_months: number;
  onboarded: boolean;
  updated_at: string;
}

export interface BudgetCategoryRow {
  id: string;
  name: string;
  kind: CategoryKind;
  default_amount: number | string;
  cadence: Cadence;
  cadence_months: number[] | null;
  active: boolean;
  sort_order: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetOverrideRow {
  id: string;
  category_id: string;
  year: number;
  month: number;
  amount: number | string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------------------------------------
// Mappers: DB rows -> engine domain types.
// bigint can arrive as a string from PostgREST; coerce defensively.
// --------------------------------------------------------------------------

const cents = (v: number | string): number => Math.round(Number(v));

export function toCategory(row: BudgetCategoryRow): BudgetCategory {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    defaultAmount: cents(row.default_amount),
    cadence: row.cadence,
    cadenceMonths: row.cadence_months ?? [],
    active: row.active,
    sortOrder: row.sort_order,
  };
}

export function toOverride(row: BudgetOverrideRow): MonthOverride {
  return {
    categoryId: row.category_id,
    year: row.year,
    month: row.month,
    amount: cents(row.amount),
  };
}

export function toSettings(row: BudgetSettingsRow): BudgetSettings {
  return {
    startingBalance: cents(row.starting_balance),
    startYear: row.start_year,
    startMonth: row.start_month,
    horizonMonths: row.horizon_months,
  };
}

/** Sensible defaults when the settings row doesn't exist yet. */
export function defaultSettings(now: Date = new Date()): BudgetSettings {
  return {
    startingBalance: 0,
    startYear: now.getFullYear(),
    startMonth: now.getMonth() + 1,
    horizonMonths: 24,
  };
}
