"use client";

import { useTransition } from "react";
import {
  Wallet,
  TrendingUp,
  Activity,
  Flag,
  PieChart,
  Timer,
} from "lucide-react";
import { formatCents } from "@/lib/utils";
import type { Cadence } from "@/lib/budget";
import { setHorizon } from "./actions";
import { BudgetCharts } from "./BudgetCharts";
import { BudgetGrid } from "./BudgetGrid";
import { BudgetSettings } from "./BudgetSettings";

export type Cell = { amount: number; overridden: boolean };

export type CategoryRow = {
  id: string;
  name: string;
  kind: "revenue" | "expense";
  defaultAmount: number;
  cadence: Cadence;
  cadenceMonths: number[];
  active: boolean;
  cells: Cell[];
};

export type Column = {
  key: string;
  year: number;
  month: number;
  label: string;
  isYearStart: boolean;
  isCurrent: boolean;
  beginning: number;
  revenue: number;
  expenses: number;
  remaining: number;
  net: number;
  isProjection: boolean;
};

export type Kpis = {
  currentBalance: number;
  averageMonthlyNet: number;
  projectedEndBalance: number;
  largestExpenseName: string | null;
  largestExpenseTotal: number;
  monthsOfRunway: number | null;
};

const HORIZONS = [
  { label: "1 yr", months: 12 },
  { label: "3 yr", months: 36 },
  { label: "5 yr", months: 60 },
];

export function BudgetView({
  columns,
  expenseRows,
  revenueRows,
  kpis,
  horizonMonths,
  startingBalance,
  startYear,
  startMonth,
}: {
  columns: Column[];
  expenseRows: CategoryRow[];
  revenueRows: CategoryRow[];
  kpis: Kpis;
  horizonMonths: number;
  startingBalance: number;
  startYear: number;
  startMonth: number;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BudgetSettings
          startingBalance={startingBalance}
          startYear={startYear}
          startMonth={startMonth}
          horizonMonths={horizonMonths}
        />
        <div className="flex rounded-xl border border-neutral-200 bg-white p-0.5">
          {HORIZONS.map((h) => {
            const active = h.months === horizonMonths;
            return (
              <button
                key={h.months}
                disabled={pending}
                onClick={() => start(() => setHorizon(h.months))}
                className={
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition " +
                  (active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:text-neutral-900")
                }
              >
                {h.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Current balance"
          value={formatCents(kpis.currentBalance)}
          tone="neutral"
        />
        <KpiCard
          icon={<Activity className="h-4 w-4" />}
          label="Avg monthly net"
          value={formatCents(kpis.averageMonthlyNet)}
          tone={kpis.averageMonthlyNet >= 0 ? "emerald" : "red"}
          signed
          rawValue={kpis.averageMonthlyNet}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Projected end balance"
          value={formatCents(kpis.projectedEndBalance)}
          tone={kpis.projectedEndBalance >= 0 ? "emerald" : "red"}
        />
        <KpiCard
          icon={<Timer className="h-4 w-4" />}
          label="Months of runway"
          value={
            kpis.monthsOfRunway === null
              ? "—"
              : kpis.monthsOfRunway > 999
                ? "999+"
                : kpis.monthsOfRunway.toFixed(1)
          }
          tone="blue"
        />
        <KpiCard
          icon={<PieChart className="h-4 w-4" />}
          label="Largest expense"
          value={kpis.largestExpenseName ?? "—"}
          sub={
            kpis.largestExpenseName
              ? `${formatCents(kpis.largestExpenseTotal)} over horizon`
              : undefined
          }
          tone="amber"
        />
        <KpiCard
          icon={<Flag className="h-4 w-4" />}
          label="Starting balance"
          value={formatCents(startingBalance)}
          tone="neutral"
        />
      </div>

      {/* Charts */}
      <BudgetCharts
        columns={columns}
        expenseRows={expenseRows}
        revenueRows={revenueRows}
      />

      {/* Grid */}
      <BudgetGrid
        columns={columns}
        expenseRows={expenseRows}
        revenueRows={revenueRows}
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
  signed,
  rawValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "neutral" | "emerald" | "red" | "blue" | "amber";
  signed?: boolean;
  rawValue?: number;
}) {
  const color = {
    neutral: "text-neutral-900",
    emerald: "text-emerald-600",
    red: "text-red-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
  }[tone];
  const iconColor = {
    neutral: "text-neutral-400",
    emerald: "text-emerald-400",
    red: "text-red-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
  }[tone];
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3.5">
      <div className={"flex items-center gap-1.5 " + iconColor}>
        {icon}
        <p className="text-xs text-neutral-400">{label}</p>
      </div>
      <p className={`mt-1 truncate text-lg font-semibold tabular-nums ${color}`}>
        {signed && rawValue !== undefined && rawValue > 0 ? "+" : ""}
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}
