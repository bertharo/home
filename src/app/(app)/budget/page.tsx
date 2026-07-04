import { createClient } from "@/lib/supabase/server";
import { monthKey, monthLabel } from "@/lib/utils";
import { buildBudgetView } from "@/lib/budget";
import { PageHeader } from "@/components/ui/PageHeader";
import { MonthSwitcher } from "./MonthSwitcher";
import { BudgetBoard, type LineData } from "./BudgetBoard";
import type { BalancePoint } from "./BalanceChart";
import type { BudgetLine, BudgetAmount, BudgetMeta } from "@/lib/types";

export const metadata = { title: "Budget" };

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : monthKey();

  const supabase = await createClient();

  const [{ data: lineData }, { data: amountData }, { data: metaData }] =
    await Promise.all([
      supabase
        .from("budget_lines")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase.from("budget_amounts").select("*"),
      supabase.from("budget_meta").select("*").maybeSingle(),
    ]);

  const lines = (lineData ?? []) as BudgetLine[];
  const amounts = (amountData ?? []) as BudgetAmount[];
  const meta = (metaData ?? null) as BudgetMeta | null;

  const { current, series, startMonth } = buildBudgetView(
    amounts,
    lines,
    meta,
    month,
    6,
  );

  const chart: BalancePoint[] = series.map((s) => ({
    month: s.month,
    label: monthLabel(s.month).split(" ")[0].slice(0, 3),
    revenue: s.totalRevenue,
    expenses: s.totalExpenses,
    remaining: s.remaining,
  }));

  // Attach the current month's amount to each line.
  const amountFor = new Map<string, number>();
  for (const a of amounts) {
    if (a.month.slice(0, 7) === month) {
      amountFor.set(a.line_id, Number(a.amount));
    }
  }

  const toLineData = (l: BudgetLine): LineData => ({
    id: l.id,
    name: l.name,
    amount: amountFor.get(l.id) ?? 0,
  });

  const expenseLines = lines
    .filter((l) => l.kind === "expense")
    .map(toLineData);
  const revenueLines = lines
    .filter((l) => l.kind === "revenue")
    .map(toLineData);

  return (
    <div>
      <PageHeader
        title="Budget"
        subtitle="Monthly cash flow — tap any number to edit."
      />
      <MonthSwitcher month={month} />
      <BudgetBoard
        month={month}
        current={current}
        chart={chart}
        expenseLines={expenseLines}
        revenueLines={revenueLines}
        startingBalance={Number(meta?.starting_balance ?? 0)}
        isStartMonth={month === startMonth}
      />
    </div>
  );
}
