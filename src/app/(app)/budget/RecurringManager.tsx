"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, Power } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { monthlyEquivalent } from "@/lib/budget";
import { Label, Input, Select, Button } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/EmptyState";
import { Repeat } from "lucide-react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, RECURRENCE_OPTIONS } from "@/lib/constants";
import {
  addRecurring,
  toggleRecurring,
  deleteRecurring,
  logRecurringNow,
} from "./actions";
import type { RecurringTransaction } from "@/lib/types";

const recurrenceOpts = RECURRENCE_OPTIONS.filter((r) => r.value !== "none");

export function RecurringManager({
  items,
}: {
  items: RecurringTransaction[];
}) {
  const [pending, start] = useTransition();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const monthlyOut = items
    .filter((r) => r.type === "expense" && r.active)
    .reduce((s, r) => s + monthlyEquivalent(Number(r.amount), r.recurrence), 0);
  const monthlyIn = items
    .filter((r) => r.type === "income" && r.active)
    .reduce((s, r) => s + monthlyEquivalent(Number(r.amount), r.recurrence), 0);

  function onAdd(fd: FormData) {
    start(async () => {
      await addRecurring(fd);
      formRef.current?.reset();
      setShowForm(false);
    });
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-3.5">
          <p className="text-xs text-neutral-400">Recurring / mo in</p>
          <p className="mt-0.5 text-lg font-semibold text-emerald-600">
            {formatCurrency(monthlyIn)}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-3.5">
          <p className="text-xs text-neutral-400">Recurring / mo out</p>
          <p className="mt-0.5 text-lg font-semibold text-neutral-900">
            {formatCurrency(monthlyOut)}
          </p>
        </div>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
        >
          <Plus className="h-4 w-4" /> Add recurring item
        </button>
      ) : (
        <form
          ref={formRef}
          action={onAdd}
          className="mb-4 space-y-3 rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <input type="hidden" name="type" value={type} />
          <div className="flex rounded-xl bg-neutral-100 p-0.5 text-sm font-medium">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 capitalize transition",
                  type === t ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="r-amount">Amount</Label>
              <Input
                id="r-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="r-recurrence">Frequency</Label>
              <Select id="r-recurrence" name="recurrence" defaultValue="monthly">
                {recurrenceOpts.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="r-category">Category</Label>
            <Select id="r-category" name="category">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="r-desc">Note (optional)</Label>
            <Input id="r-desc" name="description" placeholder="e.g. Netflix, Rent" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="flex-1">
              Add
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring items"
          description="Add rent, subscriptions, salary, etc. They power your forecast."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {items.map((r, idx) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 px-3.5 py-3",
                idx > 0 && "border-t border-neutral-100",
                !r.active && "opacity-50",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800">
                  {r.description || r.category}
                </p>
                <p className="text-xs text-neutral-400">
                  {r.category} ·{" "}
                  {recurrenceOpts.find((o) => o.value === r.recurrence)?.label}
                  {" · "}
                  {formatCurrency(monthlyEquivalent(Number(r.amount), r.recurrence))}/mo
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm font-semibold tabular-nums",
                  r.type === "income" ? "text-emerald-600" : "text-neutral-900",
                )}
              >
                {formatCurrency(Number(r.amount))}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => start(() => logRecurringNow(r.id))}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                  title="Log this as a transaction today"
                >
                  Log
                </button>
                <button
                  onClick={() => start(() => toggleRecurring(r.id, !r.active))}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-neutral-100",
                    r.active ? "text-emerald-500" : "text-neutral-300",
                  )}
                  title={r.active ? "Pause" : "Resume"}
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => start(() => deleteRecurring(r.id))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-neutral-100 hover:text-red-500"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
