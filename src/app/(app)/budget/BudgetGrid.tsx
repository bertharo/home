"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { formatCents, parseMoneyToCents } from "@/lib/utils";
import type { CategoryRow, Column } from "./BudgetView";
import { CategorySettings } from "./CategorySettings";
import {
  addCategory,
  setOverride,
  clearOverride,
  updateCategory,
} from "./actions";

const LABEL_COL = "sticky left-0 z-10 w-44 min-w-44 max-w-44";
const VALUE_COL = "min-w-[7rem] w-28";

function defaultResolved(row: CategoryRow, month: number): number {
  switch (row.cadence) {
    case "monthly":
      return row.defaultAmount;
    case "specific_months":
      return row.cadenceMonths.includes(month) ? row.defaultAmount : 0;
    default:
      return 0;
  }
}

export function BudgetGrid({
  columns,
  expenseRows,
  revenueRows,
}: {
  columns: Column[];
  expenseRows: CategoryRow[];
  revenueRows: CategoryRow[];
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-700">Forecast grid</h2>
        <p className="text-xs text-neutral-400">
          Tap a cell to set that month. Overridden cells show a dot — tap the dot
          to reset to the category default.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-right text-xs">
          <thead>
            <tr className="border-b border-neutral-200">
              <th
                className={`${LABEL_COL} bg-white px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-400`}
              >
                Category
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${VALUE_COL} px-2 py-2 font-medium ${
                    col.isCurrent
                      ? "bg-neutral-900 text-white"
                      : col.isProjection
                        ? "text-neutral-400"
                        : "text-neutral-600"
                  }`}
                >
                  <div>{col.label}</div>
                  {col.isYearStart && (
                    <div className="text-[10px] font-normal opacity-70">
                      {col.year}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <SectionHeader label="Expenses" span={columns.length} />
            {expenseRows.map((row) => (
              <CategoryTr key={row.id} row={row} columns={columns} />
            ))}
            <AddCategoryRow kind="expense" span={columns.length} />
            <TotalsTr
              label="Total Expenses"
              columns={columns}
              pick={(c) => c.expenses}
              className="bg-red-50 font-semibold text-red-700"
            />

            <TotalsTr
              label="Beg Balance"
              columns={columns}
              pick={(c) => c.beginning}
              className="bg-amber-50 font-semibold text-amber-800"
            />

            <SectionHeader label="Revenue" span={columns.length} />
            {revenueRows.map((row) => (
              <CategoryTr key={row.id} row={row} columns={columns} />
            ))}
            <AddCategoryRow kind="revenue" span={columns.length} />
            <TotalsTr
              label="Total Revenue"
              columns={columns}
              pick={(c) => c.revenue}
              className="bg-emerald-50 font-semibold text-emerald-700"
            />

            <TotalsTr
              label="Total Remaining Balance"
              columns={columns}
              pick={(c) => c.remaining}
              className="bg-blue-50 font-bold text-blue-800"
              signed
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SectionHeader({ label, span }: { label: string; span: number }) {
  return (
    <tr>
      <td
        colSpan={span + 1}
        className="sticky left-0 bg-neutral-50 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
      >
        {label}
      </td>
    </tr>
  );
}

function CategoryTr({
  row,
  columns,
}: {
  row: CategoryRow;
  columns: Column[];
}) {
  return (
    <tr className="border-b border-neutral-100">
      <td className={`${LABEL_COL} bg-white px-3 py-1 text-left`}>
        <div className="flex items-center gap-1">
          <InlineName row={row} />
          <CategorySettings row={row} columns={columns} />
        </div>
      </td>
      {columns.map((col, i) => (
        <GridCell key={col.key} row={row} col={col} cellIndex={i} />
      ))}
    </tr>
  );
}

function InlineName({ row }: { row: CategoryRow }) {
  const [name, setName] = useState(row.name);
  const [, start] = useTransition();
  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={() => {
        const clean = name.trim();
        if (clean && clean !== row.name)
          start(() => updateCategory(row.id, { name: clean }));
        else if (!clean) setName(row.name);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={
        "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-left text-xs outline-none transition hover:border-neutral-200 focus:border-neutral-900 focus:bg-white " +
        (row.active ? "text-neutral-700" : "text-neutral-400 line-through")
      }
    />
  );
}

function GridCell({
  row,
  col,
  cellIndex,
}: {
  row: CategoryRow;
  col: Column;
  cellIndex: number;
}) {
  const cell = row.cells[cellIndex];
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [, start] = useTransition();

  const def = defaultResolved(row, col.month);

  function commit() {
    setEditing(false);
    const next = parseMoneyToCents(text);
    if (next === cell.amount) return;
    if (next === def) {
      if (cell.overridden)
        start(() => clearOverride(row.id, col.year, col.month));
      return;
    }
    start(() => setOverride(row.id, col.year, col.month, next));
  }

  const bg = col.isCurrent
    ? "bg-neutral-50"
    : col.isProjection
      ? "bg-white"
      : "bg-white";

  if (editing) {
    return (
      <td className={`${VALUE_COL} ${bg} p-0`}>
        <input
          autoFocus
          inputMode="decimal"
          defaultValue={cell.amount ? String(cell.amount / 100) : ""}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setText("");
              setEditing(false);
            }
          }}
          className="w-full bg-white px-2 py-1.5 text-right text-xs tabular-nums outline-none ring-2 ring-inset ring-neutral-900"
        />
      </td>
    );
  }

  return (
    <td className={`${VALUE_COL} ${bg}`}>
      <div className="relative">
        <button
          onClick={() => {
            setText(cell.amount ? String(cell.amount / 100) : "");
            setEditing(true);
          }}
          className={
            "w-full px-2 py-1.5 text-right text-xs tabular-nums transition hover:bg-neutral-100 " +
            (cell.amount ? "text-neutral-700" : "text-neutral-300")
          }
        >
          {cell.amount ? formatCents(cell.amount, { cents: true }) : "—"}
        </button>
        {cell.overridden && (
          <button
            onClick={() =>
              start(() => clearOverride(row.id, col.year, col.month))
            }
            title="Reset to default"
            className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-blue-500"
            aria-label="Reset to default"
          />
        )}
      </div>
    </td>
  );
}

function TotalsTr({
  label,
  columns,
  pick,
  className,
  signed,
}: {
  label: string;
  columns: Column[];
  pick: (c: Column) => number;
  className?: string;
  signed?: boolean;
}) {
  return (
    <tr className={`border-b border-neutral-100 ${className ?? ""}`}>
      <td
        className={`${LABEL_COL} px-3 py-1.5 text-left ${className ?? "bg-white"}`}
      >
        {label}
      </td>
      {columns.map((col) => {
        const v = pick(col);
        return (
          <td
            key={col.key}
            className={`${VALUE_COL} px-2 py-1.5 tabular-nums ${
              signed && v < 0 ? "text-red-600" : ""
            }`}
          >
            {formatCents(v, { cents: true })}
          </td>
        );
      })}
    </tr>
  );
}

function AddCategoryRow({
  kind,
  span,
}: {
  kind: "expense" | "revenue";
  span: number;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    start(async () => {
      await addCategory({
        name: clean,
        kind,
        amountCents: parseMoneyToCents(amount),
        cadence: "monthly",
      });
      setName("");
      setAmount("");
    });
  }

  return (
    <tr className="border-b border-neutral-100">
      <td colSpan={span + 1} className="sticky left-0 bg-white px-3 py-1.5">
        <form onSubmit={submit} className="flex items-center gap-2">
          <Plus className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Add ${kind} category`}
            className="min-w-0 flex-1 bg-transparent py-0.5 text-left text-xs text-neutral-700 outline-none placeholder:text-neutral-400"
          />
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-1.5 flex items-center text-[10px] text-neutral-400">
              $
            </span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-24 rounded-md border border-neutral-200 py-0.5 pl-4 pr-1.5 text-right text-xs outline-none focus:border-neutral-900"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="shrink-0 rounded-md bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-40"
          >
            Add
          </button>
        </form>
      </td>
    </tr>
  );
}
