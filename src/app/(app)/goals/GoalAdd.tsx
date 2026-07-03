"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Fab } from "@/components/ui/Fab";
import { Label, Input, Textarea, Button } from "@/components/ui/form";
import { AssigneePicker } from "@/components/AssigneePicker";
import { cn } from "@/lib/utils";
import { addGoal } from "./actions";
import type { Profile } from "@/lib/types";

export function GoalAdd({
  profiles,
  year,
}: {
  profiles: Profile[];
  year: number;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"joint" | "individual">("joint");
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(fd: FormData) {
    start(async () => {
      await addGoal(fd);
      formRef.current?.reset();
      setKind("joint");
      setOpen(false);
    });
  }

  return (
    <>
      <Fab onClick={() => setOpen(true)} label="Add goal" />
      <Modal open={open} onClose={() => setOpen(false)} title={`New goal · ${year}`}>
        <form ref={formRef} action={onSubmit} className="space-y-4">
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="kind" value={kind} />
          <div>
            <Label htmlFor="g-title">Goal</Label>
            <Input
              id="g-title"
              name="title"
              required
              autoFocus
              placeholder="e.g. Run a half marathon"
            />
          </div>

          <div>
            <Label>Type</Label>
            <div className="flex rounded-xl bg-neutral-100 p-0.5 text-sm font-medium">
              {(["joint", "individual"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-1.5 capitalize transition",
                    kind === k
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {kind === "individual" && (
            <div>
              <Label>Whose goal?</Label>
              <AssigneePicker
                profiles={profiles}
                name="owner_id"
                includeBoth={false}
                includeUnassigned={false}
                defaultValue={profiles[0]?.id ?? ""}
              />
            </div>
          )}

          <div>
            <Label htmlFor="g-desc">Details (optional)</Label>
            <Textarea id="g-desc" name="description" placeholder="Why it matters, how you'll get there…" />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Adding…" : "Add goal"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
