"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Pencil, Trash2, Repeat, CalendarClock } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Select, Button } from "@/components/ui/form";
import { AssigneePicker } from "@/components/AssigneePicker";
import { Avatar } from "@/components/ui/Avatar";
import { RECURRENCE_OPTIONS } from "@/lib/constants";
import { completeChore, updateChore, deleteChore } from "./actions";
import type { Chore, Profile } from "@/lib/types";

function dueMeta(due: string | null) {
  if (!due) return null;
  const [y, m, d] = due.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  const label =
    diff === 0
      ? "Due today"
      : diff === 1
        ? "Due tomorrow"
        : diff < 0
          ? `${Math.abs(diff)}d overdue`
          : `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return { label, due: diff <= 0 };
}

const recurrenceLabel = (v: string) =>
  RECURRENCE_OPTIONS.find((r) => r.value === v)?.label ?? v;

export function ChoreRow({
  chore,
  profiles,
}: {
  chore: Chore;
  profiles: Profile[];
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [rotate, setRotate] = useState(chore.rotate);
  const formRef = useRef<HTMLFormElement>(null);

  const assignee = profiles.find((p) => p.id === chore.current_assignee_id);
  const doneBy = profiles.find((p) => p.id === chore.last_done_by);
  const due = dueMeta(chore.next_due);

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3.5 py-3 transition",
          pending && "opacity-60",
        )}
      >
        <button
          onClick={() => start(() => completeChore(chore.id))}
          disabled={pending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 text-neutral-400 transition hover:border-emerald-500 hover:bg-emerald-500 hover:text-white"
          aria-label="Mark done"
          title="Mark done for this cycle"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug text-neutral-900">
            {chore.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
              <Repeat className="h-3 w-3" />
              {recurrenceLabel(chore.recurrence)}
              {chore.rotate && " · rotates"}
            </span>
            {assignee && (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600">
                <Avatar
                  name={assignee.display_name}
                  color={assignee.color}
                  size="xs"
                />
                {assignee.display_name}
              </span>
            )}
            {due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  due.due
                    ? "bg-amber-50 text-amber-600"
                    : "bg-neutral-100 text-neutral-500",
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {due.label}
              </span>
            )}
          </div>
          {chore.last_done_at && (
            <p className="mt-1 text-xs text-neutral-300">
              Last done {timeAgo(chore.last_done_at)}
              {doneBy && ` by ${doneBy.display_name}`}
            </p>
          )}
        </div>

        <button
          onClick={() => setEditing(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit chore">
        <form
          ref={formRef}
          action={(fd) =>
            start(async () => {
              await updateChore(chore.id, fd);
              setEditing(false);
            })
          }
          className="space-y-4"
        >
          <div>
            <Label htmlFor={`ct-${chore.id}`}>Chore</Label>
            <Input
              id={`ct-${chore.id}`}
              name="title"
              required
              defaultValue={chore.title}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`cr-${chore.id}`}>Repeats</Label>
              <Select
                id={`cr-${chore.id}`}
                name="recurrence"
                defaultValue={chore.recurrence}
              >
                {RECURRENCE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`cd-${chore.id}`}>Next due</Label>
              <Input
                id={`cd-${chore.id}`}
                name="next_due"
                type="date"
                defaultValue={chore.next_due ?? ""}
              />
            </div>
          </div>
          <div>
            <Label>Assigned to</Label>
            <AssigneePicker
              profiles={profiles}
              includeBoth={false}
              defaultValue={chore.current_assignee_id ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`cn-${chore.id}`}>Notes</Label>
            <Textarea
              id={`cn-${chore.id}`}
              name="notes"
              defaultValue={chore.notes ?? ""}
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
                Rotate between us each time
              </span>
            </label>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending} className="flex-1">
              Save
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteChore(chore.id);
                  setEditing(false);
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
