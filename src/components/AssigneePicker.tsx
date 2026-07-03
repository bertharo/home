"use client";

import { useState } from "react";
import { cn, initials } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type Props = {
  profiles: Profile[];
  name?: string;
  defaultValue?: string; // "" | profileId | "both"
  includeBoth?: boolean;
  includeUnassigned?: boolean;
};

export function AssigneePicker({
  profiles,
  name = "assignee",
  defaultValue = "",
  includeBoth = true,
  includeUnassigned = true,
}: Props) {
  const [value, setValue] = useState(defaultValue);

  const options: { key: string; label: string; color?: string }[] = [];
  if (includeUnassigned)
    options.push({ key: "", label: "Anyone", color: undefined });
  profiles.forEach((p) =>
    options.push({ key: p.id, label: p.display_name, color: p.color }),
  );
  if (includeBoth && profiles.length > 1)
    options.push({ key: "both", label: "Both", color: undefined });

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key || "anyone"}
              type="button"
              onClick={() => setValue(opt.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300",
              )}
            >
              {opt.color && (
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white",
                  )}
                  style={{ backgroundColor: opt.color }}
                >
                  {initials(opt.label)}
                </span>
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
