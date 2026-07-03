"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GROCERY_SECTIONS } from "@/lib/constants";
import { inputClass } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingCart } from "lucide-react";
import { addGrocery, toggleGrocery, deleteGrocery, clearChecked } from "./actions";
import type { GroceryItem } from "@/lib/types";

export function GroceryBoard({ items }: { items: GroceryItem[] }) {
  const [pending, start] = useTransition();
  const [section, setSection] = useState<string>("Other");
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onAdd(fd: FormData) {
    fd.set("section", section);
    start(async () => {
      await addGrocery(fd);
      formRef.current?.reset();
      inputRef.current?.focus();
    });
  }

  const grouped = GROCERY_SECTIONS.map((s) => ({
    section: s,
    items: items
      .filter((i) => i.section === s)
      .sort((a, b) => Number(a.checked) - Number(b.checked)),
  })).filter((g) => g.items.length > 0);

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div>
      <form
        ref={formRef}
        action={onAdd}
        className="mb-4 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          name="name"
          required
          autoComplete="off"
          placeholder="Add item…"
          className={cn(inputClass, "flex-1")}
        />
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className={cn(inputClass, "w-32 shrink-0 appearance-none")}
        >
          {GROCERY_SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white transition active:scale-95 disabled:opacity-60"
          aria-label="Add"
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>

      {checkedCount > 0 && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => start(() => clearChecked())}
            className="text-sm font-medium text-neutral-400 hover:text-neutral-700"
          >
            Clear {checkedCount} checked
          </button>
        </div>
      )}

      {grouped.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="List is empty"
          description="Add what you need and check items off as you shop."
        />
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <div key={g.section}>
              <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {g.section}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                {g.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex items-center gap-3 px-3.5 py-2.5",
                      idx > 0 && "border-t border-neutral-100",
                    )}
                  >
                    <button
                      onClick={() =>
                        start(() => toggleGrocery(item.id, !item.checked))
                      }
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                        item.checked
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-neutral-300 text-transparent",
                      )}
                      aria-label="Toggle"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-[15px]",
                        item.checked
                          ? "text-neutral-300 line-through"
                          : "text-neutral-800",
                      )}
                    >
                      {item.name}
                      {item.qty && (
                        <span className="ml-1.5 text-sm text-neutral-400">
                          ×{item.qty}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => start(() => deleteGrocery(item.id))}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-neutral-100 hover:text-red-500"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
