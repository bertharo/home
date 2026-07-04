import { describe, it, expect } from "vitest";
import {
  computeForecast,
  computeKpis,
  toCents,
  addMonths,
  type BudgetCategory,
  type MonthOverride,
  type BudgetSettings,
} from "./engine";

/**
 * Reproduces the first three months of the real spreadsheet, exercising every
 * cadence path:
 *   - monthly flat        (Mortgage, Leo OMES, Julie, Bert)
 *   - specific_months     (Property Taxes, Apr & Sep)
 *   - monthly + override  (Est Credit Card, March = 15,088)
 *   - monthly + override  (Sylvie, Jan = 1,000 vs 1,300 default)
 *   - none + overrides     (Bert Stock, Other — one-off events)
 */
function cat(partial: Partial<BudgetCategory> & Pick<BudgetCategory, "id" | "name" | "kind">): BudgetCategory {
  return {
    defaultAmount: 0,
    cadence: "monthly",
    cadenceMonths: [],
    active: true,
    sortOrder: 0,
    ...partial,
  };
}

const categories: BudgetCategory[] = [
  // Expenses
  cat({ id: "mortgage", name: "Mortgage", kind: "expense", defaultAmount: toCents(4200) }),
  cat({
    id: "property-taxes",
    name: "Property Taxes",
    kind: "expense",
    defaultAmount: toCents(9512.71),
    cadence: "specific_months",
    cadenceMonths: [4, 9],
  }),
  cat({ id: "credit-card", name: "Est Credit Card", kind: "expense", defaultAmount: toCents(8000) }),
  cat({ id: "leo", name: "Leo OMES", kind: "expense", defaultAmount: toCents(3000) }),
  cat({ id: "sylvie", name: "Sylvie", kind: "expense", defaultAmount: toCents(1300) }),
  // Revenue
  cat({ id: "bert", name: "Bert", kind: "revenue", defaultAmount: toCents(10500) }),
  cat({ id: "fsa", name: "FSA Payback", kind: "revenue", cadence: "none" }),
  cat({ id: "bert-stock", name: "Bert Stock", kind: "revenue", cadence: "none" }),
  cat({ id: "julie", name: "Julie", kind: "revenue", defaultAmount: toCents(7000) }),
  cat({ id: "other", name: "Other", kind: "revenue", cadence: "none" }),
];

const overrides: MonthOverride[] = [
  { categoryId: "sylvie", year: 2026, month: 1, amount: toCents(1000) },
  { categoryId: "credit-card", year: 2026, month: 3, amount: toCents(15088) },
  { categoryId: "bert-stock", year: 2026, month: 1, amount: toCents(5000) },
  { categoryId: "bert-stock", year: 2026, month: 3, amount: toCents(5000) },
  { categoryId: "other", year: 2026, month: 3, amount: toCents(7200) },
];

const settings: BudgetSettings = {
  startingBalance: toCents(68987.29),
  startYear: 2026,
  startMonth: 1,
  horizonMonths: 12,
};

describe("computeForecast — running balance chain", () => {
  const cols = computeForecast(categories, overrides, settings);

  it("January matches the spreadsheet", () => {
    const jan = cols[0];
    expect(jan.beginningBalance).toBe(toCents(68987.29));
    expect(jan.totalRevenue).toBe(toCents(22500));
    expect(jan.totalExpenses).toBe(toCents(16200));
    expect(jan.remainingBalance).toBe(toCents(75287.29));
  });

  it("February begins where January ended, then chains", () => {
    const feb = cols[1];
    expect(feb.beginningBalance).toBe(toCents(75287.29));
    expect(feb.totalRevenue).toBe(toCents(17500));
    expect(feb.totalExpenses).toBe(toCents(16500));
    expect(feb.remainingBalance).toBe(toCents(76287.29));
  });

  it("March applies overrides (credit card, other, bert stock)", () => {
    const mar = cols[2];
    expect(mar.beginningBalance).toBe(toCents(76287.29));
    expect(mar.totalRevenue).toBe(toCents(29700));
    expect(mar.totalExpenses).toBe(toCents(23588));
    expect(mar.remainingBalance).toBe(toCents(82399.29));
  });

  it("resolves specific-month categories only on their months", () => {
    const apr = cols.find((c) => c.month === 4)!;
    expect(apr.expenseByCategory["property-taxes"]).toBe(toCents(9512.71));
    const may = cols.find((c) => c.month === 5)!;
    expect(may.expenseByCategory["property-taxes"]).toBe(0);
  });
});

describe("multi-year chaining", () => {
  it("chains across the year boundary", () => {
    const twoYears: BudgetSettings = { ...settings, horizonMonths: 15 };
    const cols = computeForecast(categories, overrides, twoYears);
    const dec = cols[11];
    const nextJan = cols[12];
    expect(dec.year).toBe(2026);
    expect(dec.month).toBe(12);
    expect(nextJan.year).toBe(2027);
    expect(nextJan.month).toBe(1);
    // The chain must continue unbroken into the next year.
    expect(nextJan.beginningBalance).toBe(dec.remainingBalance);
  });

  it("recurring categories repeat into future years", () => {
    const cols = computeForecast(categories, overrides, { ...settings, horizonMonths: 24 });
    const nextApr = cols.find((c) => c.year === 2027 && c.month === 4)!;
    expect(nextApr.expenseByCategory["property-taxes"]).toBe(toCents(9512.71));
  });

  it("stays exact over a 60-month chain (integer cents, no drift)", () => {
    const cols = computeForecast(categories, overrides, { ...settings, horizonMonths: 60 });
    for (const c of cols) {
      expect(Number.isInteger(c.remainingBalance)).toBe(true);
      expect(Number.isInteger(c.totalRevenue)).toBe(true);
      expect(Number.isInteger(c.totalExpenses)).toBe(true);
    }
  });
});

describe("addMonths", () => {
  it("rolls forward across years", () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, 13)).toEqual({ year: 2027, month: 2 });
    expect(addMonths(2026, 6, 60)).toEqual({ year: 2031, month: 6 });
  });
});

describe("computeKpis", () => {
  it("computes end balance and runway", () => {
    const cols = computeForecast(categories, overrides, settings, {
      now: { year: 2026, month: 1 },
    });
    const kpis = computeKpis(cols, { now: { year: 2026, month: 1 } });
    expect(kpis.projectedEndBalance).toBe(cols[cols.length - 1].remainingBalance);
    expect(kpis.currentBalance).toBe(cols[0].remainingBalance);
    expect(kpis.monthsOfRunway).not.toBeNull();
  });
});
