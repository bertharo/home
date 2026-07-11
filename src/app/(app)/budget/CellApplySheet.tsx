"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { formatCents, monthLabel } from "@/lib/utils";
import type { CategoryRow, Column } from "./BudgetView";
import {
  setOverride,
  stepChangeForward,
  updateCategory,
} from "./actions";

export type ApplyScope = "month" | "forward" | "default";

export function CellApplySheet({
  row,
  col,
  amountCents,
  onClose,
}: {
  row: CategoryRow;
  col: Column;
  amountCents: number;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();

  function apply(scope: ApplyScope) {
    start(async () => {
      if (scope === "month") {
        await setOverride(row.id, col.year, col.month, amountCents);
      } else if (scope === "forward") {
        await stepChangeForward(row.id, col.year, col.month, amountCents);
      } else {
        await updateCategory(row.id, { defaultAmountCents: amountCents });
      }
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Apply {formatCents(amountCents, { cents: true })}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              {row.name} · {monthLabel(col.key)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          <ScopeButton
            title="This month only"
            description="Override just this month — other months keep their values."
            onClick={() => apply("month")}
            disabled={pending}
          />
          <ScopeButton
            title="Copy forward"
            description={`Set ${formatCents(amountCents)} from ${monthLabel(col.key)} through the end of your forecast.`}
            onClick={() => apply("forward")}
            disabled={pending}
            primary
          />
          <ScopeButton
            title="Update default"
            description="Change the category's baseline. Months you've manually overridden stay as-is."
            onClick={() => apply("default")}
            disabled={pending}
          />
        </div>
      </div>
    </div>
  );
}

function ScopeButton({
  title,
  description,
  onClick,
  disabled,
  primary,
}: {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "w-full rounded-xl border px-4 py-3 text-left transition disabled:opacity-50 " +
        (primary
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white hover:border-neutral-400")
      }
    >
      <p className="text-sm font-medium">{title}</p>
      <p
        className={
          "mt-0.5 text-xs " + (primary ? "text-white/70" : "text-neutral-500")
        }
      >
        {description}
      </p>
    </button>
  );
}
