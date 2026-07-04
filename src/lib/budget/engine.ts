/**
 * Budget compute engine.
 *
 * Pure, deterministic, and framework-free so it can be unit-tested in
 * isolation. Every monetary value is an INTEGER number of cents — never a
 * floating-point dollar amount — so a 60-month running-balance chain never
 * accumulates rounding drift.
 *
 * The model is a running cash-balance forecast:
 *   Total Revenue (m)   = sum of revenue categories resolved for month m
 *   Total Expenses (m)  = sum of expense categories resolved for month m
 *   Beginning Balance   = starting balance for the first month, otherwise the
 *                         previous month's Remaining Balance
 *   Remaining Balance   = Beginning Balance + Total Revenue - Total Expenses
 */

export type Cadence = "monthly" | "specific_months" | "none";
export type CategoryKind = "revenue" | "expense";

export interface BudgetCategory {
  id: string;
  name: string;
  kind: CategoryKind;
  /** Normal monthly value, in cents. */
  defaultAmount: number;
  cadence: Cadence;
  /** For `specific_months`: 1-based month numbers, e.g. [4, 9] = Apr & Sep. */
  cadenceMonths: number[];
  active: boolean;
  sortOrder: number;
}

export interface MonthOverride {
  categoryId: string;
  year: number;
  month: number; // 1-12
  /** Amount in cents. Supersedes the category default for this month. */
  amount: number;
}

export interface BudgetSettings {
  /** Cash on hand entering the first month, in cents. */
  startingBalance: number;
  startYear: number;
  startMonth: number; // 1-12
  horizonMonths: number;
}

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

export interface MonthColumn {
  index: number;
  year: number;
  month: number; // 1-12
  key: string; // "YYYY-MM"
  beginningBalance: number; // cents
  totalRevenue: number; // cents
  totalExpenses: number; // cents
  remainingBalance: number; // cents
  netCashFlow: number; // cents (revenue - expenses)
  isProjection: boolean;
  /** categoryId -> resolved cents for this month (revenue categories). */
  revenueByCategory: Record<string, number>;
  /** categoryId -> resolved cents for this month (expense categories). */
  expenseByCategory: Record<string, number>;
}

// --------------------------------------------------------------------------
// Money helpers — keep everything in integer cents.
// --------------------------------------------------------------------------

/** Dollars (possibly fractional) -> integer cents. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Integer cents -> dollars (may be fractional). */
export function toDollars(cents: number): number {
  return cents / 100;
}

// --------------------------------------------------------------------------
// Month arithmetic — chains correctly across year boundaries.
// --------------------------------------------------------------------------

/** Add `delta` months to a (year, month), rolling across years. */
export function addMonths(year: number, month: number, delta: number): YearMonth {
  const zeroBased = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(zeroBased / 12),
    month: (((zeroBased % 12) + 12) % 12) + 1,
  };
}

/** Compare two (year, month) pairs: -1, 0, 1. */
export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  return 0;
}

export function monthKeyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// --------------------------------------------------------------------------
// Resolver — a category's value for a specific month.
// --------------------------------------------------------------------------

function overrideKey(categoryId: string, year: number, month: number): string {
  return `${categoryId}:${year}:${month}`;
}

export function buildOverrideMap(
  overrides: MonthOverride[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const o of overrides) {
    map.set(overrideKey(o.categoryId, o.year, o.month), o.amount);
  }
  return map;
}

/**
 * Resolve a category's amount (cents) for (year, month):
 *   1. An explicit override always wins (even a $0 override).
 *   2. Inactive categories resolve to 0 (history preserved via overrides).
 *   3. `monthly` -> defaultAmount every month.
 *   4. `specific_months` -> defaultAmount only in its months, else 0.
 *   5. `none` -> 0.
 */
export function resolveAmount(
  cat: BudgetCategory,
  year: number,
  month: number,
  overrideMap: Map<string, number>,
): number {
  const ov = overrideMap.get(overrideKey(cat.id, year, month));
  if (ov !== undefined) return ov;
  if (!cat.active) return 0;
  switch (cat.cadence) {
    case "monthly":
      return cat.defaultAmount;
    case "specific_months":
      return cat.cadenceMonths.includes(month) ? cat.defaultAmount : 0;
    case "none":
    default:
      return 0;
  }
}

/** Is this month an override for this category? (for UI marking) */
export function hasOverride(
  overrideMap: Map<string, number>,
  categoryId: string,
  year: number,
  month: number,
): boolean {
  return overrideMap.has(overrideKey(categoryId, year, month));
}

// --------------------------------------------------------------------------
// Forecast — the running-balance chain.
// --------------------------------------------------------------------------

export function computeForecast(
  categories: BudgetCategory[],
  overrides: MonthOverride[],
  settings: BudgetSettings,
  opts?: { now?: YearMonth },
): MonthColumn[] {
  const overrideMap = buildOverrideMap(overrides);
  const now = opts?.now ?? null;
  const columns: MonthColumn[] = [];

  let beginning = settings.startingBalance;
  const horizon = Math.max(1, Math.floor(settings.horizonMonths));

  for (let i = 0; i < horizon; i++) {
    const { year, month } = addMonths(
      settings.startYear,
      settings.startMonth,
      i,
    );

    let totalRevenue = 0;
    let totalExpenses = 0;
    const revenueByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};

    for (const cat of categories) {
      const amount = resolveAmount(cat, year, month, overrideMap);
      if (cat.kind === "revenue") {
        totalRevenue += amount;
        revenueByCategory[cat.id] = amount;
      } else {
        totalExpenses += amount;
        expenseByCategory[cat.id] = amount;
      }
    }

    const remaining = beginning + totalRevenue - totalExpenses;
    const isProjection = now
      ? compareYearMonth({ year, month }, now) > 0
      : false;

    columns.push({
      index: i,
      year,
      month,
      key: monthKeyOf(year, month),
      beginningBalance: beginning,
      totalRevenue,
      totalExpenses,
      remainingBalance: remaining,
      netCashFlow: totalRevenue - totalExpenses,
      isProjection,
      revenueByCategory,
      expenseByCategory,
    });

    beginning = remaining;
  }

  return columns;
}

// --------------------------------------------------------------------------
// KPIs derived from the forecast.
// --------------------------------------------------------------------------

export interface BudgetKpis {
  currentBalance: number; // cents
  averageMonthlyNet: number; // cents
  projectedEndBalance: number; // cents
  largestExpenseCategoryId: string | null;
  largestExpenseCategoryTotal: number; // cents (over the horizon)
  averageMonthlyExpenses: number; // cents
  monthsOfRunway: number | null;
}

export function computeKpis(
  columns: MonthColumn[],
  opts?: { now?: YearMonth },
): BudgetKpis {
  if (columns.length === 0) {
    return {
      currentBalance: 0,
      averageMonthlyNet: 0,
      projectedEndBalance: 0,
      largestExpenseCategoryId: null,
      largestExpenseCategoryTotal: 0,
      averageMonthlyExpenses: 0,
      monthsOfRunway: null,
    };
  }

  const now = opts?.now ?? null;

  const totalNet = columns.reduce((s, c) => s + c.netCashFlow, 0);
  const totalExpenses = columns.reduce((s, c) => s + c.totalExpenses, 0);
  const averageMonthlyNet = Math.round(totalNet / columns.length);
  const averageMonthlyExpenses = Math.round(totalExpenses / columns.length);

  // Current balance: remaining of the current month if it's in range,
  // otherwise the last non-projection month, otherwise the first column's
  // beginning balance.
  let currentBalance = columns[0].beginningBalance;
  if (now) {
    const nowCol = columns.find((c) => c.year === now.year && c.month === now.month);
    if (nowCol) {
      currentBalance = nowCol.remainingBalance;
    } else {
      const actuals = columns.filter((c) => !c.isProjection);
      currentBalance = actuals.length
        ? actuals[actuals.length - 1].remainingBalance
        : columns[0].beginningBalance;
    }
  }

  const projectedEndBalance = columns[columns.length - 1].remainingBalance;

  const byCategory = new Map<string, number>();
  for (const col of columns) {
    for (const [id, amt] of Object.entries(col.expenseByCategory)) {
      byCategory.set(id, (byCategory.get(id) ?? 0) + amt);
    }
  }
  let largestExpenseCategoryId: string | null = null;
  let largestExpenseCategoryTotal = 0;
  for (const [id, total] of byCategory) {
    if (total > largestExpenseCategoryTotal) {
      largestExpenseCategoryTotal = total;
      largestExpenseCategoryId = id;
    }
  }

  const monthsOfRunway =
    averageMonthlyExpenses > 0
      ? currentBalance / averageMonthlyExpenses
      : null;

  return {
    currentBalance,
    averageMonthlyNet,
    projectedEndBalance,
    largestExpenseCategoryId,
    largestExpenseCategoryTotal,
    averageMonthlyExpenses,
    monthsOfRunway,
  };
}

// --------------------------------------------------------------------------
// Step change — "change amount from this month forward".
// --------------------------------------------------------------------------

/**
 * Month keys (as YearMonth) from `from` (inclusive) to the end of the horizon.
 * Used to write forward overrides for a step change.
 */
export function monthsFromForward(
  settings: BudgetSettings,
  from: YearMonth,
): YearMonth[] {
  const out: YearMonth[] = [];
  for (let i = 0; i < settings.horizonMonths; i++) {
    const ym = addMonths(settings.startYear, settings.startMonth, i);
    if (compareYearMonth(ym, from) >= 0) out.push(ym);
  }
  return out;
}
