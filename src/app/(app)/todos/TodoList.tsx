"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { TodoRow } from "./TodoRow";
import type { Profile, Todo } from "@/lib/types";

export function TodoList({
  todos,
  profiles,
  meId,
}: {
  todos: Todo[];
  profiles: Profile[];
  meId: string | null;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [showDone, setShowDone] = useState(false);

  const filters = useMemo(() => {
    const base = [{ key: "all", label: "All" }];
    profiles.forEach((p) =>
      base.push({
        key: p.id,
        label: p.id === meId ? "Mine" : p.display_name,
      }),
    );
    if (profiles.length > 1) base.push({ key: "both", label: "Both" });
    return base;
  }, [profiles, meId]);

  const filtered = useMemo(() => {
    return todos.filter((t) => {
      if (filter === "all") return true;
      if (filter === "both") return t.for_both;
      return t.assignee_id === filter || t.for_both;
    });
  }, [todos, filter]);

  const open = filtered.filter((t) => t.status === "open");
  const done = filtered.filter((t) => t.status === "done");

  open.sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              filter === f.key
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-500 ring-1 ring-neutral-200 hover:text-neutral-800",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {open.length === 0 && done.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nothing here yet"
          description="Add your first to-do with the + button."
        />
      ) : (
        <div className="space-y-2">
          {open.map((t) => (
            <TodoRow key={t.id} todo={t} profiles={profiles} />
          ))}
          {open.length === 0 && (
            <EmptyState
              icon={CheckSquare}
              title="All clear"
              description="No open to-dos for this filter."
            />
          )}
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="mb-2 text-sm font-medium text-neutral-400"
          >
            {showDone ? "Hide" : "Show"} completed ({done.length})
          </button>
          {showDone && (
            <div className="space-y-2">
              {done.map((t) => (
                <TodoRow key={t.id} todo={t} profiles={profiles} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
