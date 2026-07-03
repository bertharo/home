"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Fab } from "@/components/ui/Fab";
import { Label, Input, Select, Button } from "@/components/ui/form";
import { AssigneePicker } from "@/components/AssigneePicker";
import { RECURRENCE_OPTIONS } from "@/lib/constants";
import { addChore } from "./actions";
import type { Profile } from "@/lib/types";

export function ChoreAdd({ profiles }: { profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  const [rotate, setRotate] = useState(profiles.length > 1);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(fd: FormData) {
    start(async () => {
      await addChore(fd);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <Fab onClick={() => setOpen(true)} label="Add chore" />
      <Modal open={open} onClose={() => setOpen(false)} title="New chore">
        <form ref={formRef} action={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Chore</Label>
            <Input
              id="title"
              name="title"
              required
              autoFocus
              placeholder="e.g. Take out the trash"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="recurrence">Repeats</Label>
              <Select id="recurrence" name="recurrence" defaultValue="weekly">
                {RECURRENCE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="next_due">First due</Label>
              <Input id="next_due" name="next_due" type="date" />
            </div>
          </div>
          <div>
            <Label>Assigned to</Label>
            <AssigneePicker
              profiles={profiles}
              includeBoth={false}
              includeUnassigned
            />
          </div>
          {profiles.length > 1 && (
            <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3">
              <input
                type="checkbox"
                name="rotate"
                checked={rotate}
                onChange={(e) => setRotate(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              <span className="text-sm text-neutral-700">
                Rotate between us each time it&apos;s done
              </span>
            </label>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Adding…" : "Add chore"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
