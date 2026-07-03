"use client";

import { useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Button } from "@/components/ui/form";
import { createCalendarEvent } from "./actions";
import type { Profile } from "@/lib/types";

export function EventAdd({
  open,
  onClose,
  defaultDate,
  canWrite,
  profiles,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: Date;
  canWrite: boolean;
  profiles: Profile[];
}) {
  const [allDay, setAllDay] = useState(false);
  const [shared, setShared] = useState(profiles.length > 1);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const dateVal = format(defaultDate, "yyyy-MM-dd");
  const startVal = `${dateVal}T09:00`;
  const endVal = `${dateVal}T10:00`;

  function onSubmit(fd: FormData) {
    setError(null);
    // Read the timezone in the event handler (not during render).
    fd.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);
    start(async () => {
      const res = await createCalendarEvent(fd);
      if (res?.ok) {
        formRef.current?.reset();
        onClose();
      } else {
        setError(res?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="New event">
      {!canWrite ? (
        <p className="text-sm text-neutral-500">
          Connect a Google Calendar first (banner above) to add events.
        </p>
      ) : (
        <form ref={formRef} action={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              name="title"
              required
              autoFocus
              placeholder="e.g. Dinner with friends"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3">
            <input
              type="checkbox"
              name="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">All day</span>
          </label>

          {allDay ? (
            <div>
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" name="date" type="date" defaultValue={dateVal} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ev-start">Starts</Label>
                <Input
                  id="ev-start"
                  name="start"
                  type="datetime-local"
                  defaultValue={startVal}
                />
              </div>
              <div>
                <Label htmlFor="ev-end">Ends</Label>
                <Input
                  id="ev-end"
                  name="end"
                  type="datetime-local"
                  defaultValue={endVal}
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="ev-loc">Location (optional)</Label>
            <Input id="ev-loc" name="location" placeholder="Where?" />
          </div>

          {profiles.length > 1 && (
            <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3">
              <input
                type="checkbox"
                name="shared"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              <span className="text-sm text-neutral-700">
                Family event — add to both calendars
              </span>
            </label>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Adding…" : "Add event"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
