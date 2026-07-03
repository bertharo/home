"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Trash2, Clock } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Select, Button } from "@/components/ui/form";
import { AssigneePicker } from "@/components/AssigneePicker";
import { Avatar } from "@/components/ui/Avatar";
import { GOAL_STATUSES, GOAL_STATUS_LABELS } from "@/lib/constants";
import { updateGoal, deleteGoal } from "./actions";
import type { Goal, Profile } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  not_started: "bg-neutral-100 text-neutral-500",
  in_progress: "bg-blue-50 text-blue-600",
  on_hold: "bg-amber-50 text-amber-600",
  done: "bg-emerald-50 text-emerald-600",
};

function isStale(goal: Goal) {
  if (goal.status === "done") return false;
  const days = (Date.now() - new Date(goal.updated_at).getTime()) / 86_400_000;
  return days > 30;
}

export function GoalCard({
  goal,
  profiles,
}: {
  goal: Goal;
  profiles: Profile[];
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<"joint" | "individual">(goal.kind);
  const formRef = useRef<HTMLFormElement>(null);
  const owner = profiles.find((p) => p.id === goal.owner_id);
  const stale = isStale(goal);

  return (
    <>
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  STATUS_STYLES[goal.status],
                )}
              >
                {GOAL_STATUS_LABELS[goal.status]}
              </span>
              {goal.kind === "individual" && owner ? (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
                  <Avatar name={owner.display_name} color={owner.color} size="xs" />
                  {owner.display_name}
                </span>
              ) : (
                <span className="text-xs text-neutral-400">Joint</span>
              )}
            </div>
            <p className="text-[15px] font-medium leading-snug text-neutral-900">
              {goal.title}
            </p>
            {goal.description && (
              <p className="mt-1 text-sm text-neutral-500">{goal.description}</p>
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

        {goal.progress_note && (
          <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            {goal.progress_note}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          <Clock className="h-3 w-3 text-neutral-300" />
          <span className={stale ? "text-amber-500" : "text-neutral-300"}>
            Updated {timeAgo(goal.updated_at)}
            {stale && " · time for a check-in?"}
          </span>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Update goal">
        <form
          ref={formRef}
          action={(fd) =>
            start(async () => {
              await updateGoal(goal.id, fd);
              setEditing(false);
            })
          }
          className="space-y-4"
        >
          <input type="hidden" name="kind" value={kind} />
          <div>
            <Label htmlFor={`g-title-${goal.id}`}>Goal</Label>
            <Input
              id={`g-title-${goal.id}`}
              name="title"
              required
              defaultValue={goal.title}
            />
          </div>
          <div>
            <Label htmlFor={`g-status-${goal.id}`}>Status</Label>
            <Select
              id={`g-status-${goal.id}`}
              name="status"
              defaultValue={goal.status}
            >
              {GOAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {GOAL_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor={`g-note-${goal.id}`}>Progress note</Label>
            <Textarea
              id={`g-note-${goal.id}`}
              name="progress_note"
              defaultValue={goal.progress_note ?? ""}
              placeholder="Where things stand…"
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
                    kind === k ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500",
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
                defaultValue={goal.owner_id ?? profiles[0]?.id ?? ""}
              />
            </div>
          )}
          <div>
            <Label htmlFor={`g-desc-${goal.id}`}>Details</Label>
            <Textarea
              id={`g-desc-${goal.id}`}
              name="description"
              defaultValue={goal.description ?? ""}
            />
          </div>
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
                  await deleteGoal(goal.id);
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
