"use client";

import { useState, useTransition } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarRange,
  Plus,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { parseMoneyToCents, formatCents } from "@/lib/utils";
import type { Cadence, CategoryKind } from "@/lib/budget";
import { completeOnboarding, skipOnboarding } from "./actions";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type Item = {
  key: string;
  name: string;
  kind: CategoryKind;
  amountCents: number;
  cadence: Cadence;
  cadenceMonths: number[];
};

const REVENUE_SUGGESTIONS = ["My salary", "Partner salary", "Bonus / stock", "Other income"];
const EXPENSE_SUGGESTIONS = [
  "Mortgage / Rent",
  "Utilities",
  "Credit card",
  "Insurance",
  "Subscriptions",
  "Groceries",
  "Property tax",
];

let counter = 0;
const nextKey = () => `it-${counter++}`;

export function BudgetOnboarding({
  defaultYear,
  defaultMonth,
}: {
  defaultYear: number;
  defaultMonth: number;
}) {
  const [step, setStep] = useState(0);
  const [startingBalance, setStartingBalance] = useState("");
  const [startYear, setStartYear] = useState(defaultYear);
  const [startMonth, setStartMonth] = useState(defaultMonth);
  const [items, setItems] = useState<Item[]>([]);
  const [horizon, setHorizon] = useState(24);
  const [pending, start] = useTransition();

  const revenue = items.filter((i) => i.kind === "revenue");
  const expenses = items.filter((i) => i.kind === "expense");

  function addItem(item: Omit<Item, "key">) {
    setItems((prev) => [...prev, { ...item, key: nextKey() }]);
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function finish() {
    start(async () => {
      await completeOnboarding({
        startingBalanceCents: parseMoneyToCents(startingBalance),
        startYear,
        startMonth,
        horizonMonths: horizon,
        categories: items.map((i) => ({
          name: i.name,
          kind: i.kind,
          amountCents: i.amountCents,
          cadence: i.cadence,
          cadenceMonths: i.cadenceMonths,
        })),
      });
    });
  }

  return (
    <div className="mx-auto max-w-md">
      <StepDots step={step} total={4} />

      {step === 0 && (
        <Card
          icon={<Wallet className="h-6 w-6" />}
          title="How much cash do you have on hand?"
          subtitle="This is your starting balance — the forecast builds forward from here."
        >
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-neutral-400">
              $
            </span>
            <input
              autoFocus
              inputMode="decimal"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-2xl border border-neutral-300 bg-white py-4 pl-9 pr-4 text-2xl font-semibold tabular-nums outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-sm font-medium text-neutral-700">
              Forecast starts
            </p>
            <div className="flex gap-2">
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="w-28 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm"
              >
                {[defaultYear - 1, defaultYear, defaultYear + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <NavRow
            onNext={() => setStep(1)}
            onSkip={() =>
              start(() => skipOnboarding({ startYear, startMonth }))
            }
            skipDisabled={pending}
          />
        </Card>
      )}

      {step === 1 && (
        <Card
          icon={<TrendingUp className="h-6 w-6 text-emerald-500" />}
          title="What income comes in?"
          subtitle="Add each source. Most are monthly; things like a bonus can hit specific months."
        >
          <ItemEditor
            kind="revenue"
            suggestions={REVENUE_SUGGESTIONS}
            items={revenue}
            onAdd={addItem}
            onRemove={removeItem}
          />
          <NavRow
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        </Card>
      )}

      {step === 2 && (
        <Card
          icon={<TrendingDown className="h-6 w-6 text-red-500" />}
          title="What are your regular expenses?"
          subtitle="Property tax and similar bills can be set to specific months."
        >
          <ItemEditor
            kind="expense"
            suggestions={EXPENSE_SUGGESTIONS}
            items={expenses}
            onAdd={addItem}
            onRemove={removeItem}
          />
          <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </Card>
      )}

      {step === 3 && (
        <Card
          icon={<CalendarRange className="h-6 w-6 text-blue-500" />}
          title="How far do you want to forecast?"
          subtitle="You can change this anytime."
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "1 year", months: 12 },
              { label: "2 years", months: 24 },
              { label: "5 years", months: 60 },
            ].map((h) => (
              <button
                key={h.months}
                onClick={() => setHorizon(h.months)}
                className={
                  "rounded-xl border px-3 py-4 text-sm font-medium transition " +
                  (horizon === h.months
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400")
                }
              >
                {h.label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
            <p className="font-medium text-neutral-800">Ready to generate</p>
            <ul className="mt-1 space-y-0.5 text-neutral-500">
              <li>Starting balance: {formatCents(parseMoneyToCents(startingBalance))}</li>
              <li>{revenue.length} revenue · {expenses.length} expense categories</li>
              <li>
                From {MONTHS[startMonth - 1]} {startYear}, {horizon} months out
              </li>
            </ul>
          </div>

          <button
            onClick={finish}
            disabled={pending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition active:scale-[0.99] disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            Generate my forecast
          </button>
          <button
            onClick={() => setStep(2)}
            className="mt-2 w-full text-center text-sm text-neutral-400 hover:text-neutral-700"
          >
            Back
          </button>
        </Card>
      )}
    </div>
  );
}

function ItemEditor({
  kind,
  suggestions,
  items,
  onAdd,
  onRemove,
}: {
  kind: CategoryKind;
  suggestions: string[];
  items: Item[];
  onAdd: (item: Omit<Item, "key">) => void;
  onRemove: (key: string) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [months, setMonths] = useState<number[]>([]);

  function toggleMonth(m: number) {
    setMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b),
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    onAdd({
      name: clean,
      kind,
      amountCents: parseMoneyToCents(amount),
      cadence,
      cadenceMonths: cadence === "specific_months" ? months : [],
    });
    setName("");
    setAmount("");
    setCadence("monthly");
    setMonths([]);
  }

  const usedNames = new Set(items.map((i) => i.name.toLowerCase()));

  return (
    <div>
      {items.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {items.map((i) => (
            <li
              key={i.key}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-800">
                  {i.name}
                </p>
                <p className="text-xs text-neutral-400">
                  {formatCents(i.amountCents)}
                  {i.cadence === "specific_months"
                    ? ` · ${i.cadenceMonths.map((m) => MONTHS[m - 1]).join(", ")}`
                    : i.cadence === "none"
                      ? " · manual"
                      : " · monthly"}
                </p>
              </div>
              <button
                onClick={() => onRemove(i.key)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-300 hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !usedNames.has(s.toLowerCase()))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setName(s);
                  if (s.toLowerCase().includes("property tax")) {
                    setCadence("specific_months");
                    setMonths([4, 9]);
                  }
                }}
                className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 hover:border-neutral-400"
              >
                + {s}
              </button>
            ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <div className="relative w-28">
            <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-neutral-400">
              $
            </span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-6 pr-2 text-right text-sm outline-none focus:border-neutral-900"
            />
          </div>
        </div>

        <div className="mt-2 flex gap-1.5">
          {(
            [
              ["monthly", "Monthly"],
              ["specific_months", "Specific months"],
            ] as [Cadence, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCadence(value)}
              className={
                "rounded-lg border px-2.5 py-1 text-xs transition " +
                (cadence === value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-600")
              }
            >
              {label}
            </button>
          ))}
        </div>

        {cadence === "specific_months" && (
          <div className="mt-2 grid grid-cols-6 gap-1">
            {MONTHS.map((m, i) => {
              const num = i + 1;
              const on = months.includes(num);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMonth(num)}
                  className={
                    "rounded-md border py-1 text-[11px] transition " +
                    (on
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-600")
                  }
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-neutral-800 ring-1 ring-neutral-300 transition hover:ring-neutral-900 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Add {kind === "revenue" ? "income" : "expense"}
        </button>
      </form>
    </div>
  );
}

function Card({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700">
        {icon}
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
        {title}
      </h2>
      <p className="mb-5 mt-1 text-sm text-neutral-500">{subtitle}</p>
      {children}
    </div>
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-4 flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={
            "h-1.5 rounded-full transition-all " +
            (i === step
              ? "w-6 bg-neutral-900"
              : i < step
                ? "w-1.5 bg-neutral-900"
                : "w-1.5 bg-neutral-200")
          }
        />
      ))}
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  onSkip,
  skipDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  skipDisabled?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center gap-2">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      )}
      {onSkip && (
        <button
          onClick={onSkip}
          disabled={skipDisabled}
          className="rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400 hover:text-neutral-700 disabled:opacity-50"
        >
          Skip setup
        </button>
      )}
      <button
        onClick={onNext}
        className="ml-auto flex items-center gap-1 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition active:scale-[0.99]"
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
