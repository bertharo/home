"use client";

import { useRef, useState, useTransition } from "react";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Fab } from "@/components/ui/Fab";
import { Label, Input, Textarea, Select, Button } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/EmptyState";
import { VACATION_STATUSES, VACATION_STATUS_LABELS } from "@/lib/constants";
import { IdeaCard } from "./IdeaCard";
import { addIdea } from "./actions";
import type { Profile, VacationIdeaFull } from "@/lib/types";

export function VacationBoard({
  ideas,
  profiles,
}: {
  ideas: VacationIdeaFull[];
  profiles: Profile[];
}) {
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const filtered =
    filter === "all" ? ideas : ideas.filter((i) => i.status === filter);

  function onSubmit(fd: FormData) {
    start(async () => {
      await addIdea(fd);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  const filters = [
    { key: "all", label: "All" },
    ...VACATION_STATUSES.map((s) => ({
      key: s,
      label: VACATION_STATUS_LABELS[s],
    })),
  ];

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

      {filtered.length === 0 ? (
        <EmptyState
          icon={Plane}
          title={ideas.length === 0 ? "No trip ideas yet" : "Nothing here"}
          description={
            ideas.length === 0
              ? "Add somewhere you'd love to go before it gets lost in your texts."
              : "No ideas match this filter."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} profiles={profiles} />
          ))}
        </div>
      )}

      <Fab onClick={() => setOpen(true)} label="Add trip idea" />
      <Modal open={open} onClose={() => setOpen(false)} title="New trip idea">
        <form ref={formRef} action={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="i-title">Where to?</Label>
            <Input
              id="i-title"
              name="title"
              required
              autoFocus
              placeholder="e.g. Kyoto, Japan"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="i-status">Status</Label>
              <Select id="i-status" name="status" defaultValue="idea">
                {VACATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {VACATION_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="i-cost">Rough cost</Label>
              <Input
                id="i-cost"
                name="rough_cost"
                type="number"
                min="0"
                placeholder="$"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="i-timing">Rough timing</Label>
            <Input
              id="i-timing"
              name="rough_timing"
              placeholder="e.g. Next spring, long weekend"
            />
          </div>
          <div>
            <Label htmlFor="i-notes">Notes</Label>
            <Textarea
              id="i-notes"
              name="notes"
              placeholder="Why we want to go, ideas, must-dos…"
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Adding…" : "Add idea"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
