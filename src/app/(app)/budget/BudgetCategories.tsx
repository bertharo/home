"use client";

import { useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Label, Input, Select, Button } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/EmptyState";
import { Wallet } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { setCategoryBudget, deleteCategoryBudget } from "./actions";
import type { BudgetCategory } from "@/lib/types";

export function BudgetCategories({ items }: { items: BudgetCategory[] }) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSet(fd: FormData) {
    start(async () => {
      await setCategoryBudget(fd);
      formRef.current?.reset();
    });
  }

  const total = items.reduce((s, c) => s + Number(c.monthly_budget), 0);

  return (
    <div>
      <form
        ref={formRef}
        action={onSet}
        className="mb-4 space-y-3 rounded-2xl border border-neutral-200 bg-white p-4"
      >
        <p className="text-sm font-medium text-neutral-700">
          Set a monthly budget
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="b-name">Category</Label>
            <Select id="b-name" name="name">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="b-amount">Monthly limit</Label>
            <Input
              id="b-amount"
              name="monthly_budget"
              type="number"
              step="1"
              min="0"
              required
              placeholder="0"
            />
          </div>
        </div>
        <input type="hidden" name="kind" value="variable" />
        <Button type="submit" disabled={pending} className="w-full">
          Save budget
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No budgets set"
          description="Set monthly limits per category to track spending against them."
        />
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Budgets
            </span>
            <span className="text-xs text-neutral-400">
              {formatCurrency(total)}/mo total
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {items.map((c, idx) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3",
                  idx > 0 && "border-t border-neutral-100",
                )}
              >
                <span className="flex-1 text-sm font-medium text-neutral-800">
                  {c.name}
                </span>
                <span className="text-sm font-semibold tabular-nums text-neutral-900">
                  {formatCurrency(Number(c.monthly_budget))}
                </span>
                <button
                  onClick={() => start(() => deleteCategoryBudget(c.id))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-neutral-100 hover:text-red-500"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
