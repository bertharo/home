import type { BudgetLine, BudgetAmount, BudgetMeta } from "@/lib/types";
import { shiftMonth, monthKey } from "@/lib/utils";

/**
 * One month of the cash-flow model.
 *   remaining = begBalance + totalRevenue - totalExpenses
 *   next month's begBalance = this month's remaining
 */
export type BudgetMonth = {
  month: string; // YYYY-MM
  begBalance: number;
  totalRevenue: number;
  totalExpenses: number;
  remaining: number;
};

type Totals = { revenue: number; expenses: number };

/** Sum amounts into { revenue, expenses } per "YYYY-MM". */
function totalsByMonth(
  amounts: BudgetAmount[],
  lines: BudgetLine[],
): Map<string, Totals> {
  const kindById = new Map(lines.map((l) => [l.id, l.kind]));
  const map = new Map<string, Totals>();
  for (const a of amounts) {
    const kind = kindById.get(a.line_id);
    if (!kind) continue;
    const mk = a.month.slice(0, 7);
    const cur = map.get(mk) ?? { revenue: 0, expenses: 0 };
    if (kind === "revenue") cur.revenue += Number(a.amount);
    else cur.expenses += Number(a.amount);
    map.set(mk, cur);
  }
  return map;
}

/** Inclusive list of "YYYY-MM" keys from `from` to `to` (oldest first). */
function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  // Safety cap: never loop more than ~50 years of months.
  for (let i = 0; i < 600 && cursor <= to; i++) {
    out.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }
  return out;
}

/**
 * Build the running cash-flow series ending at `targetMonth`, plus the
 * `targetMonth` snapshot. Balances accumulate from the opening balance set in
 * `meta` (defaulting to the target month with a zero opening balance).
 */
export function buildBudgetView(
  amounts: BudgetAmount[],
  lines: BudgetLine[],
  meta: BudgetMeta | null,
  targetMonth: string,
  trailing = 6,
): { current: BudgetMonth; series: BudgetMonth[]; startMonth: string } {
  const totals = totalsByMonth(amounts, lines);
  const startingBalance = Number(meta?.starting_balance ?? 0);
  const startMonth = meta?.start_month
    ? meta.start_month.slice(0, 7)
    : targetMonth;

  // Compute from the earliest of (start month, first trailing month we want to
  // display) so every month in the trend has a running balance.
  const firstTrailing = shiftMonth(targetMonth, -(trailing - 1));
  const from = startMonth < firstTrailing ? startMonth : firstTrailing;
  const to = targetMonth < startMonth ? startMonth : targetMonth;

  const byMonth = new Map<string, BudgetMonth>();
  let running = startingBalance;
  for (const m of monthRange(from, to)) {
    const t = totals.get(m) ?? { revenue: 0, expenses: 0 };
    const begBalance = running;
    const remaining = begBalance + t.revenue - t.expenses;
    byMonth.set(m, {
      month: m,
      begBalance,
      totalRevenue: t.revenue,
      totalExpenses: t.expenses,
      remaining,
    });
    running = remaining;
  }

  const zero = (m: string): BudgetMonth => ({
    month: m,
    begBalance: startingBalance,
    totalRevenue: 0,
    totalExpenses: 0,
    remaining: startingBalance,
  });

  const current = byMonth.get(targetMonth) ?? zero(targetMonth);

  const series: BudgetMonth[] = [];
  for (let i = trailing - 1; i >= 0; i--) {
    const m = shiftMonth(targetMonth, -i);
    series.push(byMonth.get(m) ?? zero(m));
  }

  return { current, series, startMonth };
}

export const currentMonthKey = () => monthKey();
