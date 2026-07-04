"use client";

import { useState, useTransition } from "react";
import { Settings2, X } from "lucide-react";
import { parseMoneyToCents } from "@/lib/utils";
import { saveSettings } from "./actions";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const HORIZONS = [
  { label: "1 year", months: 12 },
  { label: "2 years", months: 24 },
  { label: "3 years", months: 36 },
  { label: "5 years", months: 60 },
];

export function BudgetSettings({
  startingBalance,
  startYear,
  startMonth,
  horizonMonths,
}: {
  startingBalance: number;
  startYear: number;
  startMonth: number;
  horizonMonths: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-400"
      >
        <Settings2 className="h-4 w-4" /> Settings
      </button>
      {open && (
        <Modal
          startingBalance={startingBalance}
          startYear={startYear}
          startMonth={startMonth}
          horizonMonths={horizonMonths}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Modal({
  startingBalance,
  startYear,
  startMonth,
  horizonMonths,
  onClose,
}: {
  startingBalance: number;
  startYear: number;
  startMonth: number;
  horizonMonths: number;
  onClose: () => void;
}) {
  const [balance, setBalance] = useState(
    startingBalance ? String(startingBalance / 100) : "",
  );
  const [year, setYear] = useState(startYear);
  const [month, setMonth] = useState(startMonth);
  const [horizon, setHorizon] = useState(horizonMonths);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      await saveSettings({
        startingBalanceCents: parseMoneyToCents(balance),
        startYear: year,
        startMonth: month,
        horizonMonths: horizon,
      });
      onClose();
    });
  }

  const years = [startYear - 2, startYear - 1, startYear, startYear + 1, startYear + 2];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900">
            Budget settings
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-700">
              Starting balance
            </p>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-neutral-400">
                $
              </span>
              <input
                inputMode="decimal"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-2xl border border-neutral-300 bg-white py-3.5 pl-9 pr-4 text-xl font-semibold tabular-nums outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
              />
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Cash on hand entering the first month — the whole forecast chains
              forward from here.
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-700">
              Forecast starts
            </p>
            <div className="flex gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-28 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-700">
              Forecast horizon
            </p>
            <div className="grid grid-cols-4 gap-2">
              {HORIZONS.map((h) => (
                <button
                  key={h.months}
                  onClick={() => setHorizon(h.months)}
                  className={
                    "rounded-xl border px-2 py-3 text-xs font-medium transition " +
                    (horizon === h.months
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-400")
                  }
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={pending}
          className="mt-5 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          Save settings
        </button>
      </div>
    </div>
  );
}
