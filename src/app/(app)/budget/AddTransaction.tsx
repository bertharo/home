"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Fab } from "@/components/ui/Fab";
import { Label, Input, Select, Button } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { addTransaction } from "./actions";

export function AddTransaction({ month }: { month: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const defaultDate = `${month}-15`;

  function onSubmit(fd: FormData) {
    start(async () => {
      await addTransaction(fd);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <Fab onClick={() => setOpen(true)} label="Add transaction" />
      <Modal open={open} onClose={() => setOpen(false)} title="Add transaction">
        <form ref={formRef} action={onSubmit} className="space-y-4">
          <input type="hidden" name="type" value={type} />
          <div className="flex rounded-xl bg-neutral-100 p-0.5 text-sm font-medium">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 capitalize transition",
                  type === t
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                autoFocus
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="txn_date">Date</Label>
              <Input
                id="txn_date"
                name="txn_date"
                type="date"
                defaultValue={defaultDate}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Note (optional)</Label>
            <Input id="description" name="description" placeholder="e.g. Costco run" />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : "Save transaction"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
