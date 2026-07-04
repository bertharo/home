"use client";

import { useState, useTransition } from "react";
import { Settings2, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { parseMoneyToCents } from "@/lib/utils";
import type { Cadence } from "@/lib/budget";
import type { CategoryRow, Column } from "./BudgetView";
import {
  updateCategory,
  deleteCategory,
  reorderCategory,
  stepChangeForward,
} from "./actions";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function CategorySettings({
  row,
  columns,
}: {
  row: CategoryRow;
  columns: Column[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-600"
        aria-label={`Edit ${row.name}`}
      >
        <Settings2 className="h-3.5 w-3.5" />
      </button>
      {open && (
        <SettingsModal row={row} columns={columns} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function SettingsModal({
  row,
  columns,
  onClose,
}: {
  row: CategoryRow;
  columns: Column[];
  onClose: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [amount, setAmount] = useState(
    row.defaultAmount ? String(row.defaultAmount / 100) : "",
  );
  const [cadence, setCadence] = useState<Cadence>(row.cadence);
  const [months, setMonths] = useState<number[]>(row.cadenceMonths);
  const [active, setActive] = useState(row.active);

  const [stepFrom, setStepFrom] = useState(columns[0]?.key ?? "");
  const [stepAmount, setStepAmount] = useState("");

  const [pending, start] = useTransition();

  function toggleMonth(m: number) {
    setMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b),
    );
  }

  function save() {
    start(async () => {
      await updateCategory(row.id, {
        name,
        defaultAmountCents: parseMoneyToCents(amount),
        cadence,
        cadenceMonths: cadence === "specific_months" ? months : [],
        active,
      });
      onClose();
    });
  }

  function applyStepChange() {
    const col = columns.find((c) => c.key === stepFrom);
    if (!col) return;
    start(async () => {
      await stepChangeForward(
        row.id,
        col.year,
        col.month,
        parseMoneyToCents(stepAmount),
      );
      onClose();
    });
  }

  function remove() {
    if (!confirm(`Delete "${row.name}"? This removes its history.`)) return;
    start(async () => {
      await deleteCategory(row.id);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">
            Edit {row.kind === "expense" ? "expense" : "revenue"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            />
          </Field>

          <Field label="Default amount">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-400">
                $
              </span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-7 pr-3 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
              />
            </div>
          </Field>

          <Field label="Cadence">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["monthly", "Every month"],
                  ["specific_months", "Specific months"],
                  ["none", "Manual only"],
                ] as [Cadence, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setCadence(value)}
                  className={
                    "rounded-lg border px-3 py-1.5 text-sm transition " +
                    (cadence === value
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-400")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {cadence === "specific_months" && (
            <Field label="Which months">
              <div className="grid grid-cols-6 gap-1.5">
                {MONTHS.map((m, i) => {
                  const num = i + 1;
                  const on = months.includes(num);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleMonth(num)}
                      className={
                        "rounded-lg border py-1.5 text-xs transition " +
                        (on
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 text-neutral-600 hover:border-neutral-400")
                      }
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          <label className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2.5">
            <span className="text-sm text-neutral-700">Active</span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4"
            />
          </label>

          {/* Step change */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <p className="text-sm font-medium text-neutral-800">
              Step change
            </p>
            <p className="mb-2 text-xs text-neutral-500">
              Set a new amount from a month forward (e.g. a raise, or winding a
              cost down). Past months stay as they are.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={stepFrom}
                onChange={(e) => setStepFrom(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-sm"
              >
                {columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {MONTHS[c.month - 1]} {c.year}
                  </option>
                ))}
              </select>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-neutral-400">
                  $
                </span>
                <input
                  inputMode="decimal"
                  value={stepAmount}
                  onChange={(e) => setStepAmount(e.target.value)}
                  placeholder="New amount"
                  className="w-32 rounded-lg border border-neutral-200 bg-white py-1.5 pl-6 pr-2 text-sm"
                />
              </div>
              <button
                onClick={applyStepChange}
                disabled={pending || !stepAmount.trim()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Reorder + delete */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => start(() => reorderCategory(row.id, "up"))}
              disabled={pending}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:border-neutral-400"
            >
              <ArrowUp className="h-4 w-4" /> Up
            </button>
            <button
              onClick={() => start(() => reorderCategory(row.id, "down"))}
              disabled={pending}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:border-neutral-400"
            >
              <ArrowDown className="h-4 w-4" /> Down
            </button>
            <button
              onClick={remove}
              disabled={pending}
              className="ml-auto flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>

        <button
          onClick={save}
          disabled={pending}
          className="mt-5 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-neutral-700">{label}</p>
      {children}
    </div>
  );
}
