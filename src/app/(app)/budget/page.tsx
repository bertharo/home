import { createClient } from "@/lib/supabase/server";
import {
  computeForecast,
  computeKpis,
  buildOverrideMap,
  resolveAmount,
  hasOverride,
  toCategory,
  toOverride,
  toSettings,
  defaultSettings,
  type BudgetCategory,
} from "@/lib/budget";
import type {
  BudgetCategoryRow,
  BudgetOverrideRow,
  BudgetSettingsRow,
} from "@/lib/budget";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateKey, parseDateKey } from "@/lib/timezone";
import { BudgetOnboarding } from "./BudgetOnboarding";
import { BudgetView, type Column, type CategoryRow } from "./BudgetView";

export const metadata = { title: "Budget" };

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default async function BudgetPage() {
  const supabase = await createClient();

  const [
    { data: settingsData },
    { data: categoryData },
    { data: overrideData },
  ] = await Promise.all([
    supabase.from("budget_settings").select("*").maybeSingle(),
    supabase
      .from("budget_categories")
      .select("*")
      .order("kind", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("budget_overrides").select("*"),
  ]);

  const settingsRow = (settingsData ?? null) as BudgetSettingsRow | null;
  const categoryRows = (categoryData ?? []) as BudgetCategoryRow[];
  const overrideRows = (overrideData ?? []) as BudgetOverrideRow[];

  const nowYM = parseDateKey(formatDateKey());

  // First run (or explicitly not onboarded) -> wizard.
  if (!settingsRow || !settingsRow.onboarded) {
    return (
      <div>
        <PageHeader
          title="Budget"
          subtitle="Let's set up your forecast."
        />
        <BudgetOnboarding
          defaultYear={nowYM.year}
          defaultMonth={nowYM.month}
        />
      </div>
    );
  }

  const settings = toSettings(settingsRow) ?? defaultSettings();
  const categories: BudgetCategory[] = categoryRows.map(toCategory);
  const overrides = overrideRows.map(toOverride);

  const forecast = computeForecast(categories, overrides, settings, {
    now: nowYM,
  });
  const kpis = computeKpis(forecast, { now: nowYM });
  const overrideMap = buildOverrideMap(overrides);

  const columns: Column[] = forecast.map((c) => ({
    key: c.key,
    year: c.year,
    month: c.month,
    label: MONTH_ABBR[c.month - 1],
    isYearStart: c.month === 1 || c.index === 0,
    isCurrent: c.year === nowYM.year && c.month === nowYM.month,
    beginning: c.beginningBalance,
    revenue: c.totalRevenue,
    expenses: c.totalExpenses,
    remaining: c.remainingBalance,
    net: c.netCashFlow,
    isProjection: c.isProjection,
  }));

  const toRow = (cat: BudgetCategory): CategoryRow => ({
    id: cat.id,
    name: cat.name,
    kind: cat.kind,
    defaultAmount: cat.defaultAmount,
    cadence: cat.cadence,
    cadenceMonths: cat.cadenceMonths,
    active: cat.active,
    cells: forecast.map((col) => ({
      amount: resolveAmount(cat, col.year, col.month, overrideMap),
      overridden: hasOverride(overrideMap, cat.id, col.year, col.month),
    })),
  });

  const expenseRows = categories.filter((c) => c.kind === "expense").map(toRow);
  const revenueRows = categories.filter((c) => c.kind === "revenue").map(toRow);

  const largestExpenseName =
    categories.find((c) => c.id === kpis.largestExpenseCategoryId)?.name ??
    null;

  return (
    <div>
      <PageHeader title="Budget" subtitle="Running cash-flow forecast." />
      <BudgetView
        columns={columns}
        expenseRows={expenseRows}
        revenueRows={revenueRows}
        kpis={{
          currentBalance: kpis.currentBalance,
          averageMonthlyNet: kpis.averageMonthlyNet,
          projectedEndBalance: kpis.projectedEndBalance,
          largestExpenseName,
          largestExpenseTotal: kpis.largestExpenseCategoryTotal,
          monthsOfRunway: kpis.monthsOfRunway,
        }}
        horizonMonths={settings.horizonMonths}
        startingBalance={settings.startingBalance}
        startYear={settings.startYear}
        startMonth={settings.startMonth}
      />
    </div>
  );
}
