"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCents, compactCents, monthLabel } from "@/lib/utils";
import type { CategoryRow, Column } from "./BudgetView";

const PALETTE = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#ec4899", "#14b8a6", "#a855f7", "#84cc16", "#f97316",
];
const OTHER_COLOR = "#d4d4d4";

function xLabel(col: Column): string {
  if (col.isYearStart) {
    return `${col.label} '${String(col.year).slice(2)}`;
  }
  return col.label;
}

/** Y-axis range: include zero when relevant, add padding so the line isn't flattened. */
function balanceDomain(data: { remaining: number }[]): [number, number] {
  if (data.length === 0) return [0, 1];
  let min = data[0].remaining;
  let max = data[0].remaining;
  for (const d of data) {
    min = Math.min(min, d.remaining);
    max = Math.max(max, d.remaining);
  }
  const span = max - min || Math.abs(max) * 0.1 || 100_000;
  const pad = span * 0.08;
  const floor = min >= 0 && min > span * 0.25 ? min - pad : Math.min(0, min - pad);
  return [floor, max + pad];
}

function BalanceTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TrajectoryPoint }[];
}) {
  if (!active || !payload?.[0]?.payload) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-neutral-900">
        {monthLabel(p.key)}
        {p.isProjection && (
          <span className="ml-1.5 font-normal text-neutral-400">projected</span>
        )}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-neutral-900">
        {formatCents(p.remaining, { cents: true })}
      </p>
      <p className="mt-0.5 text-neutral-500">
        {formatCents(p.revenue, { cents: true })} in ·{" "}
        {formatCents(p.expenses, { cents: true })} out
      </p>
      <p
        className={
          "mt-0.5 tabular-nums " +
          (p.net >= 0 ? "text-emerald-600" : "text-red-600")
        }
      >
        {p.net >= 0 ? "+" : ""}
        {formatCents(p.net, { cents: true })} net
      </p>
    </div>
  );
}

type TrajectoryPoint = {
  key: string;
  label: string;
  remaining: number;
  revenue: number;
  expenses: number;
  net: number;
  isProjection: boolean;
};

function buildComposition(
  rows: CategoryRow[],
  columns: Column[],
  topN = 6,
): { data: Record<string, number | string>[]; keys: string[] } {
  const totals = rows
    .map((r) => ({ r, total: r.cells.reduce((s, c) => s + c.amount, 0) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);

  const top = totals.slice(0, topN).map((x) => x.r);
  const topIds = new Set(top.map((r) => r.id));
  const keys = top.map((r) => r.name);
  const hasOther = totals.length > topN;
  if (hasOther) keys.push("Other");

  const data = columns.map((col, i) => {
    const obj: Record<string, number | string> = { label: xLabel(col) };
    let other = 0;
    for (const r of rows) {
      const amt = r.cells[i]?.amount ?? 0;
      if (topIds.has(r.id)) obj[r.name] = amt;
      else other += amt;
    }
    if (hasOther) obj["Other"] = other;
    return obj;
  });

  return { data, keys };
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e5e5e5",
  fontSize: 12,
} as const;

export function BudgetCharts({
  columns,
  expenseRows,
  revenueRows,
}: {
  columns: Column[];
  expenseRows: CategoryRow[];
  revenueRows: CategoryRow[];
}) {
  const tickInterval = columns.length <= 14 ? 0 : Math.floor(columns.length / 12);

  const trajectory = useMemo((): TrajectoryPoint[] => {
    const points = columns.map((c) => ({
      key: c.key,
      label: xLabel(c),
      remaining: c.remaining,
      revenue: c.revenue,
      expenses: c.expenses,
      net: c.net,
      isProjection: c.isProjection,
    }));
    return points;
  }, [columns]);

  const yDomain = useMemo(() => balanceDomain(trajectory), [trajectory]);

  const cashflow = useMemo(
    () =>
      columns.map((c) => ({
        label: xLabel(c),
        Revenue: c.revenue,
        Expenses: c.expenses,
        Net: c.net,
      })),
    [columns],
  );

  const expense = useMemo(
    () => buildComposition(expenseRows, columns),
    [expenseRows, columns],
  );
  const revenue = useMemo(
    () => buildComposition(revenueRows, columns),
    [revenueRows, columns],
  );

  return (
    <div className="space-y-4">
      {/* Balance trajectory — the headline chart */}
      <ChartCard
        title="Balance trajectory"
        subtitle="Projected remaining balance across the horizon"
      >
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#171717" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#171717" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="#a3a3a3"
                interval={tickInterval}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="#a3a3a3"
                width={52}
                domain={yDomain}
                tickFormatter={(v) => compactCents(Number(v))}
              />
              <Tooltip content={<BalanceTooltip />} />
              <Area
                type="linear"
                dataKey="remaining"
                stroke="#171717"
                strokeWidth={2}
                fill="url(#balFill)"
                dot={false}
                activeDot={{ r: 3, fill: "#171717" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Monthly cash flow */}
      <ChartCard
        title="Monthly cash flow"
        subtitle="Revenue vs. expenses, with net overlaid"
      >
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cashflow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="#a3a3a3"
                interval={tickInterval}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="#a3a3a3"
                width={52}
                tickFormatter={(v) => compactCents(Number(v))}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, n) => [formatCents(Number(v)), String(n)]}
              />
              <Bar dataKey="Revenue" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="Expenses" fill="#fca5a5" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Line type="linear" dataKey="Net" stroke="#171717" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-4 md:grid-cols-2">
        <CompositionChart
          title="Expense composition"
          subtitle="Where the money goes"
          data={expense.data}
          keys={expense.keys}
          tickInterval={tickInterval}
        />
        <CompositionChart
          title="Revenue composition"
          subtitle="Where the money comes from"
          data={revenue.data}
          keys={revenue.keys}
          tickInterval={tickInterval}
        />
      </div>
    </div>
  );
}

function CompositionChart({
  title,
  subtitle,
  data,
  keys,
  tickInterval,
}: {
  title: string;
  subtitle: string;
  data: Record<string, number | string>[];
  keys: string[];
  tickInterval: number;
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      {keys.length === 0 ? (
        <p className="py-10 text-center text-xs text-neutral-400">
          No categories yet.
        </p>
      ) : (
        <>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="#a3a3a3"
                  interval={tickInterval}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="#a3a3a3"
                  width={52}
                  tickFormatter={(v) => compactCents(Number(v))}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, n) => [formatCents(Number(v)), String(n)]}
                />
                {keys.map((k, i) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    stackId="a"
                    fill={k === "Other" ? OTHER_COLOR : PALETTE[i % PALETTE.length]}
                    maxBarSize={22}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {keys.map((k, i) => (
              <span key={k} className="flex items-center gap-1 text-xs text-neutral-500">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: k === "Other" ? OTHER_COLOR : PALETTE[i % PALETTE.length],
                  }}
                />
                {k}
              </span>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
      <p className="mb-2 text-xs text-neutral-400">{subtitle}</p>
      {children}
    </section>
  );
}
