"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, monthLabel } from "@/lib/utils";
import type { BudgetLineKind } from "@/lib/types";
import type { BudgetMonth } from "@/lib/budget";
import { BalanceChart, type BalancePoint } from "./BalanceChart";
import {
  addLine,
  deleteLine,
  renameLine,
  setAmount,
  setStartingBalance,
} from "./actions";

export type LineData = { id: string; name: string; amount: number };

type Props = {
  month: string; // YYYY-MM
  current: BudgetMonth;
  chart: BalancePoint[];
  expenseLines: LineData[];
  revenueLines: LineData[];
  startingBalance: number;
  isStartMonth: boolean;
};

function parseAmount(text: string): number {
  const n = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function displayAmount(value: number): string {
  if (!value) return "";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Inline, spreadsheet-style number input that saves on blur. */
function EditableAmount({
  value,
  onSave,
  align = "right",
}: {
  value: number;
  onSave: (n: number) => void;
  align?: "right" | "left";
}) {
  const [text, setText] = useState(value ? String(value) : "");
  const [focused, setFocused] = useState(false);
  const [pending, start] = useTransition();

  const shown = focused ? text : displayAmount(value);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-neutral-400">
        $
      </span>
      <input
        inputMode="decimal"
        value={shown}
        placeholder="0"
        onFocus={(e) => {
          setFocused(true);
          setText(value ? String(value) : "");
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          const next = parseAmount(text);
          if (next !== value) start(() => onSave(next));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={
          "w-full rounded-lg border border-transparent bg-transparent py-1.5 pl-4 pr-2 text-sm tabular-nums outline-none transition hover:border-neutral-200 focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10 " +
          (align === "right" ? "text-right" : "text-left") +
          (pending ? " opacity-60" : "")
        }
      />
    </div>
  );
}

function EditableName({
  value,
  onSave,
}: {
  value: string;
  onSave: (name: string) => void;
}) {
  const [text, setText] = useState(value);
  const [, start] = useTransition();
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const clean = text.trim();
        if (clean && clean !== value) start(() => onSave(clean));
        else if (!clean) setText(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-neutral-700 outline-none transition hover:border-neutral-200 focus:border-neutral-900 focus:bg-white focus:ring-2 focus:ring-neutral-900/10"
    />
  );
}

function LineRow({
  line,
  month,
}: {
  line: LineData;
  month: string;
}) {
  const [, start] = useTransition();
  return (
    <div className="flex items-center gap-1 border-b border-neutral-100 last:border-0">
      <div className="min-w-0 flex-1">
        <EditableName
          value={line.name}
          onSave={(name) => renameLine(line.id, name)}
        />
      </div>
      <div className="w-28 shrink-0">
        <EditableAmount
          value={line.amount}
          onSave={(n) => setAmount(line.id, month, n)}
        />
      </div>
      <button
        onClick={() => start(() => deleteLine(line.id))}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-red-50 hover:text-red-500"
        aria-label={`Delete ${line.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddLineForm({ kind }: { kind: BudgetLineKind }) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("name", clean);
    start(async () => {
      await addLine(fd);
      setName("");
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 px-2 py-2">
      <Plus className="h-4 w-4 shrink-0 text-neutral-300" />
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={kind === "expense" ? "Add expense item" : "Add revenue item"}
        className="min-w-0 flex-1 bg-transparent py-1 text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
      />
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition active:scale-95 disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}

function SectionCard({
  title,
  icon,
  total,
  totalTone,
  lines,
  kind,
  month,
}: {
  title: string;
  icon: React.ReactNode;
  total: number;
  totalTone: "expense" | "revenue";
  lines: LineData[];
  kind: BudgetLineKind;
  month: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
        </div>
        <span
          className={
            "text-sm font-semibold tabular-nums " +
            (totalTone === "revenue" ? "text-emerald-600" : "text-neutral-900")
          }
        >
          {formatCurrency(total, { cents: true })}
        </span>
      </div>

      <div className="px-2">
        {lines.length === 0 ? (
          <p className="px-2 py-3 text-xs text-neutral-400">
            No items yet — add your first below.
          </p>
        ) : (
          lines.map((line) => (
            <LineRow key={line.id} line={line} month={month} />
          ))
        )}
      </div>

      <div className="border-t border-neutral-100 bg-neutral-50/60">
        <AddLineForm kind={kind} />
      </div>
    </section>
  );
}

export function BudgetBoard({
  month,
  current,
  chart,
  expenseLines,
  revenueLines,
  startingBalance,
  isStartMonth,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Hero: remaining balance */}
      <section className="rounded-2xl bg-neutral-900 p-5 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/50">
          Total Remaining Balance
        </p>
        <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
          {formatCurrency(current.remaining, { cents: true })}
        </p>
        <p className="mt-1 text-sm text-white/60">
          After {monthLabel(month)} · revenue minus expenses on your beginning
          balance
        </p>
      </section>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-amber-500" />
            <p className="text-xs text-amber-700">Beg Balance</p>
          </div>
          {isStartMonth ? (
            <StartMonthBeg
              month={month}
              startingBalance={startingBalance}
              begBalance={current.begBalance}
            />
          ) : (
            <p className="mt-1 text-lg font-semibold tabular-nums text-neutral-900">
              {formatCurrency(current.begBalance, { cents: true })}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <p className="text-xs text-emerald-700">Total Revenue</p>
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">
            {formatCurrency(current.totalRevenue, { cents: true })}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            <p className="text-xs text-red-700">Total Expenses</p>
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums text-red-700">
            {formatCurrency(current.totalExpenses, { cents: true })}
          </p>
        </div>
      </div>

      {/* Trend chart */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-neutral-700">
          Cash flow
        </h2>
        <p className="mb-2 text-xs text-neutral-400">
          Revenue, expenses & remaining balance over time
        </p>
        <BalanceChart data={chart} />
      </section>

      {/* Expenses */}
      <SectionCard
        title="Expenses"
        icon={<TrendingDown className="h-4 w-4 text-red-500" />}
        total={current.totalExpenses}
        totalTone="expense"
        lines={expenseLines}
        kind="expense"
        month={month}
      />

      {/* Revenue */}
      <SectionCard
        title="Revenue"
        icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
        total={current.totalRevenue}
        totalTone="revenue"
        lines={revenueLines}
        kind="revenue"
        month={month}
      />
    </div>
  );
}

/** On the very first tracked month the beginning balance is user-editable. */
function StartMonthBeg({
  month,
  startingBalance,
  begBalance,
}: {
  month: string;
  startingBalance: number;
  begBalance: number;
}) {
  const [text, setText] = useState(
    startingBalance ? String(startingBalance) : "",
  );
  const [, start] = useTransition();
  return (
    <input
      inputMode="decimal"
      value={text}
      placeholder="0"
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => requestAnimationFrame(() => e.target.select())}
      onBlur={() => {
        const n = parseAmount(text);
        if (n !== begBalance) start(() => setStartingBalance(month, n));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="mt-1 w-full rounded-lg border border-transparent bg-transparent text-lg font-semibold tabular-nums text-neutral-900 outline-none transition hover:border-amber-200 focus:border-amber-400 focus:bg-white"
    />
  );
}
