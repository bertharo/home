"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Fab } from "@/components/ui/Fab";
import { Label, Input, Textarea, Button } from "@/components/ui/form";
import { AssigneePicker } from "@/components/AssigneePicker";
import { createTodo } from "./actions";
import type { Profile } from "@/lib/types";

export function TodoAdd({ profiles }: { profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(fd: FormData) {
    start(async () => {
      await createTodo(fd);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <>
      <Fab onClick={() => setOpen(true)} label="Add to-do" />
      <Modal open={open} onClose={() => setOpen(false)} title="New to-do">
        <form ref={formRef} action={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">What needs doing?</Label>
            <Input
              id="title"
              name="title"
              required
              autoFocus
              placeholder="e.g. Book dentist appointment"
            />
          </div>
          <div>
            <Label>Assign to</Label>
            <AssigneePicker profiles={profiles} />
          </div>
          <div>
            <Label htmlFor="due_date">Due date (optional)</Label>
            <Input id="due_date" name="due_date" type="date" />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" placeholder="Any details…" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Adding…" : "Add to-do"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
