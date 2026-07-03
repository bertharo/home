"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth, monthKey } from "@/lib/utils";

export function MonthSwitcher({ month }: { month: string }) {
  const router = useRouter();
  const isCurrent = month === monthKey();

  return (
    <div className="mb-4 flex items-center justify-between">
      <button
        onClick={() => router.push(`/budget?m=${shiftMonth(month, -1)}`)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="text-center">
        <p className="text-base font-semibold text-neutral-900">
          {monthLabel(month)}
        </p>
        {!isCurrent && (
          <button
            onClick={() => router.push(`/budget?m=${monthKey()}`)}
            className="text-xs font-medium text-neutral-400 hover:text-neutral-700"
          >
            Back to this month
          </button>
        )}
      </div>
      <button
        onClick={() => router.push(`/budget?m=${shiftMonth(month, 1)}`)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
