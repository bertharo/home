"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Fab } from "@/components/ui/Fab";
import { Label, Input, Textarea, Select, Button } from "@/components/ui/form";
import { AssigneePicker } from "@/components/AssigneePicker";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { addDuty } from "./actions";
import type { Profile } from "@/lib/types";

export function DutyAdd({ profiles }: { profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(fd: FormData) {
    start(async () => {
      await addDuty(fd);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <Fab onClick={() => setOpen(true)} label="Add duty" />
      <Modal open={open} onClose={() => setOpen(false)} title="New pickup / duty">
        <form ref={formRef} action={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="label">What&apos;s the duty?</Label>
            <Input
              id="label"
              name="label"
              required
              autoFocus
              placeholder="e.g. School pickup, Dog walk"
            />
          </div>
          <div>
            <Label htmlFor="day_of_week">Day</Label>
            <Select id="day_of_week" name="day_of_week" defaultValue="1">
              {DAYS_OF_WEEK.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Who&apos;s covering it?</Label>
            <AssigneePicker profiles={profiles} includeBoth={false} />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Time, location, details…"
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Adding…" : "Add duty"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
