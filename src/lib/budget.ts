import type {
  Transaction,
  RecurringTransaction,
  Recurrence,
} from "@/lib/types";
import { monthKey, shiftMonth } from "@/lib/utils";

/** Convert a recurring amount to its monthly-equivalent value. */
export function monthlyEquivalent(amount: number, recurrence: Recurrence) {
  switch (recurrence) {
    case "daily":
      return (amount * 365) / 12;
    case "weekly":
      return (amount * 52) / 12;
    case "biweekly":
      return (amount * 26) / 12;
    case "monthly":
      return amount;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

export type MonthSummary = {
  income: number;
  expense: number;
  savings: number; // portion of expense flagged as Savings/Investing
  net: number;
  byCategory: Record<string, number>; // expense totals per category
};

const SAVINGS_CATEGORIES = new Set(["Savings", "Investing"]);

export function summarizeMonth(
  transactions: Transaction[],
  month: string,
): MonthSummary {
  let income = 0;
  let expense = 0;
  let savings = 0;
  const byCategory: Record<string, number> = {};

  for (const t of transactions) {
    if (t.txn_date.slice(0, 7) !== month) continue;
    const amt = Number(t.amount);
    if (t.type === "income") {
      income += amt;
    } else {
      expense += amt;
      byCategory[t.category] = (byCategory[t.category] ?? 0) + amt;
      if (SAVINGS_CATEGORIES.has(t.category)) savings += amt;
    }
  }

  return { income, expense, savings, net: income - expense, byCategory };
}

/** Total expense per month, for the given list of month keys. */
export function expenseByMonth(
  transactions: Transaction[],
  months: string[],
): { month: string; expense: number; income: number }[] {
  return months.map((m) => {
    const s = summarizeMonth(transactions, m);
    return { month: m, expense: s.expense, income: s.income };
  });
}

export type Forecast = {
  total: number;
  recurringTotal: number;
  variableTotal: number;
  variableByCategory: { category: string; avg: number }[];
  basedOnMonths: string[];
};

/**
 * Project next month's spend:
 *   recurring monthly-equivalent expenses
 *   + trailing 3-month average for variable (non-recurring) categories.
 * Categories that already have a recurring entry are excluded from the
 * variable average to avoid double counting.
 */
export function buildForecast(
  transactions: Transaction[],
  recurring: RecurringTransaction[],
  currentMonth: string,
): Forecast {
  const recurringExpenses = recurring.filter(
    (r) => r.type === "expense" && r.active,
  );
  const recurringTotal = recurringExpenses.reduce(
    (sum, r) => sum + monthlyEquivalent(Number(r.amount), r.recurrence),
    0,
  );
  const recurringCategories = new Set(recurringExpenses.map((r) => r.category));

  const trailing = [1, 2, 3].map((n) => shiftMonth(currentMonth, -n + 1));
  // trailing = [currentMonth, prev, prev2] -> last 3 months incl current

  const perCategoryTotals: Record<string, number> = {};
  for (const m of trailing) {
    const s = summarizeMonth(transactions, m);
    for (const [cat, amt] of Object.entries(s.byCategory)) {
      if (recurringCategories.has(cat)) continue;
      perCategoryTotals[cat] = (perCategoryTotals[cat] ?? 0) + amt;
    }
  }

  const variableByCategory = Object.entries(perCategoryTotals)
    .map(([category, total]) => ({ category, avg: total / trailing.length }))
    .filter((c) => c.avg > 0)
    .sort((a, b) => b.avg - a.avg);

  const variableTotal = variableByCategory.reduce((s, c) => s + c.avg, 0);

  return {
    total: recurringTotal + variableTotal,
    recurringTotal,
    variableTotal,
    variableByCategory,
    basedOnMonths: trailing,
  };
}

/** The last N month keys ending at (and including) `month`, oldest first. */
export function trailingMonths(month: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(month, -i));
  return out;
}

export const currentMonthKey = () => monthKey();
