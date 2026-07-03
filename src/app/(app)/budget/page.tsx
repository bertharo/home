import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/auth";
import {
  formatCurrency,
  monthKey,
  monthLabel,
  shiftMonth,
} from "@/lib/utils";
import {
  summarizeMonth,
  buildForecast,
  trailingMonths,
  expenseByMonth,
} from "@/lib/budget";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Receipt, TrendingUp, Sparkles } from "lucide-react";
import { MonthSwitcher } from "./MonthSwitcher";
import { BudgetTabs } from "./BudgetTabs";
import { TrendChart } from "./TrendChart";
import { AddTransaction } from "./AddTransaction";
import { TransactionRow } from "./TransactionRow";
import { RecurringManager } from "./RecurringManager";
import { BudgetCategories } from "./BudgetCategories";
import type {
  Transaction,
  RecurringTransaction,
  BudgetCategory,
} from "@/lib/types";

export const metadata = { title: "Budget" };

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : monthKey();

  const supabase = await createClient();
  const profiles = await getProfiles();

  const windowStart = `${shiftMonth(month, -5)}-01`;

  const [{ data: txnData }, { data: recData }, { data: catData }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .gte("txn_date", windowStart)
        .order("txn_date", { ascending: false }),
      supabase
        .from("recurring_transactions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("budget_categories")
        .select("*")
        .order("monthly_budget", { ascending: false }),
    ]);

  const transactions = (txnData ?? []) as Transaction[];
  const recurring = (recData ?? []) as RecurringTransaction[];
  const categories = (catData ?? []) as BudgetCategory[];

  const summary = summarizeMonth(transactions, month);
  const forecast = buildForecast(transactions, recurring, month);
  const nextMonth = shiftMonth(month, 1);

  const trend = expenseByMonth(transactions, trailingMonths(month, 6)).map(
    (p) => ({
      ...p,
      label: monthLabel(p.month).split(" ")[0].slice(0, 3),
    }),
  );

  const budgetMap = new Map(categories.map((c) => [c.name, Number(c.monthly_budget)]));
  const categoryNames = new Set<string>([
    ...Object.keys(summary.byCategory),
    ...categories.map((c) => c.name),
  ]);
  const categoryRows = [...categoryNames]
    .map((name) => ({
      name,
      spent: summary.byCategory[name] ?? 0,
      budget: budgetMap.get(name) ?? 0,
    }))
    .filter((r) => r.spent > 0 || r.budget > 0)
    .sort((a, b) => b.spent - a.spent);

  const maxSpent = Math.max(1, ...categoryRows.map((r) => r.spent));
  const monthTxns = transactions.filter(
    (t) => t.txn_date.slice(0, 7) === month,
  );

  const overview = (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Income" value={summary.income} tone="emerald" />
        <SummaryCard label="Spent" value={summary.expense} tone="neutral" />
        <SummaryCard
          label="Net"
          value={summary.net}
          tone={summary.net >= 0 ? "emerald" : "red"}
          signed
        />
        <SummaryCard label="Savings & investing" value={summary.savings} tone="blue" />
      </div>

      {/* Trend */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-neutral-700">
            Spending trend
          </h2>
        </div>
        <p className="mb-2 text-xs text-neutral-400">Total expenses, last 6 months</p>
        <TrendChart data={trend} activeMonth={month} />
      </section>

      {/* Category spend vs budget */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-neutral-700">
          By category
        </h2>
        {categoryRows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No spending yet"
            description="Add a transaction with the + button to see category breakdowns."
          />
        ) : (
          <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
            {categoryRows.map((row) => {
              const hasBudget = row.budget > 0;
              const pct = hasBudget
                ? Math.min(100, (row.spent / row.budget) * 100)
                : (row.spent / maxSpent) * 100;
              const over = hasBudget && row.spent > row.budget;
              return (
                <div key={row.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-neutral-700">
                      {row.name}
                    </span>
                    <span className="tabular-nums text-neutral-500">
                      {formatCurrency(row.spent)}
                      {hasBudget && (
                        <span className="text-neutral-300">
                          {" "}
                          / {formatCurrency(row.budget)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={
                        "h-full rounded-full " +
                        (over
                          ? "bg-red-500"
                          : hasBudget
                            ? "bg-neutral-900"
                            : "bg-neutral-300")
                      }
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {over && (
                    <p className="mt-0.5 text-xs text-red-500">
                      {formatCurrency(row.spent - row.budget)} over budget
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Forecast */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-neutral-800">
            {monthLabel(nextMonth)} projection
          </h2>
        </div>
        <p className="text-3xl font-semibold tracking-tight text-neutral-900">
          {formatCurrency(forecast.total)}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {formatCurrency(forecast.recurringTotal)} recurring +{" "}
          {formatCurrency(forecast.variableTotal)} projected variable
        </p>
        <p className="mt-2 text-xs leading-relaxed text-neutral-400">
          This is a projection, not a guarantee — recurring items plus your
          trailing 3-month average for variable categories. Actual spend will
          vary.
        </p>
        {forecast.variableByCategory.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {forecast.variableByCategory.slice(0, 6).map((c) => (
              <span
                key={c.category}
                className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500 ring-1 ring-blue-100"
              >
                {c.category} ~{formatCurrency(c.avg)}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Recent transactions */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-neutral-700">
          {monthLabel(month)} transactions
        </h2>
        {monthTxns.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions this month"
            description="Tap + to add income or an expense."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {monthTxns.map((t) => (
              <TransactionRow key={t.id} txn={t} profiles={profiles} />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div>
      <PageHeader title="Budget" subtitle="Manual entry — quick and honest." />
      <MonthSwitcher month={month} />
      <BudgetTabs
        overview={overview}
        recurring={<RecurringManager items={recurring} />}
        budgets={<BudgetCategories items={categories} />}
      />
      <AddTransaction month={month} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  signed,
}: {
  label: string;
  value: number;
  tone: "emerald" | "neutral" | "red" | "blue";
  signed?: boolean;
}) {
  const color = {
    emerald: "text-emerald-600",
    neutral: "text-neutral-900",
    red: "text-red-600",
    blue: "text-blue-600",
  }[tone];
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3.5">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${color}`}>
        {signed && value >= 0 ? "+" : ""}
        {formatCurrency(value)}
      </p>
    </div>
  );
}
