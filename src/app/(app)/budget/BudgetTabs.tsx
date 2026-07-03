"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function BudgetTabs({
  overview,
  recurring,
  budgets,
}: {
  overview: React.ReactNode;
  recurring: React.ReactNode;
  budgets: React.ReactNode;
}) {
  const [tab, setTab] = useState<"overview" | "recurring" | "budgets">(
    "overview",
  );

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "recurring", label: "Recurring" },
    { key: "budgets", label: "Budgets" },
  ] as const;

  return (
    <div>
      <div className="mb-4 flex rounded-xl bg-neutral-100 p-0.5 text-sm font-medium">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 transition",
              tab === t.key
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={tab === "overview" ? "" : "hidden"}>{overview}</div>
      <div className={tab === "recurring" ? "" : "hidden"}>{recurring}</div>
      <div className={tab === "budgets" ? "" : "hidden"}>{budgets}</div>
    </div>
  );
}
