"use client";

import { useTransition } from "react";
import { Trash2, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { deleteTransaction } from "./actions";
import type { Profile, Transaction } from "@/lib/types";

export function TransactionRow({
  txn,
  profiles,
}: {
  txn: Transaction;
  profiles: Profile[];
}) {
  const [pending, start] = useTransition();
  const income = txn.type === "income";
  const creator = profiles.find((p) => p.id === txn.created_by);
  const date = new Date(txn.txn_date + "T00:00:00");

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3.5 py-2.5",
        pending && "opacity-50",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          income ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-500",
        )}
      >
        {income ? (
          <ArrowDownRight className="h-4 w-4" />
        ) : (
          <ArrowUpRight className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-800">
          {txn.description || txn.category}
        </p>
        <p className="text-xs text-neutral-400">
          {txn.category} · {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {creator && ` · ${creator.display_name}`}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          income ? "text-emerald-600" : "text-neutral-900",
        )}
      >
        {income ? "+" : "−"}
        {formatCurrency(Number(txn.amount), { cents: true })}
      </span>
      <button
        onClick={() => start(() => deleteTransaction(txn.id))}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-100 hover:text-red-500"
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
