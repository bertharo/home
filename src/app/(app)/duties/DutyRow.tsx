"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Select, Button } from "@/components/ui/form";
import { AssigneePicker } from "@/components/AssigneePicker";
import { Avatar } from "@/components/ui/Avatar";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { updateDuty, deleteDuty } from "./actions";
import type { PickupDuty, Profile } from "@/lib/types";

export function DutyRow({
  duty,
  profiles,
}: {
  duty: PickupDuty;
  profiles: Profile[];
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const assignee = profiles.find((p) => p.id === duty.assignee_id);

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 transition",
          pending && "opacity-60",
        )}
      >
        {assignee ? (
          <Avatar
            name={assignee.display_name}
            color={assignee.color}
            size="sm"
          />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-medium text-neutral-400">
            ?
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-900">{duty.label}</p>
          {duty.notes && (
            <p className="truncate text-xs text-neutral-400">{duty.notes}</p>
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

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit duty">
        <form
          ref={formRef}
          action={(fd) =>
            start(async () => {
              await updateDuty(duty.id, fd);
              setEditing(false);
            })
          }
          className="space-y-4"
        >
          <div>
            <Label htmlFor={`dl-${duty.id}`}>Duty</Label>
            <Input
              id={`dl-${duty.id}`}
              name="label"
              required
              defaultValue={duty.label}
            />
          </div>
          <div>
            <Label htmlFor={`dd-${duty.id}`}>Day</Label>
            <Select
              id={`dd-${duty.id}`}
              name="day_of_week"
              defaultValue={String(duty.day_of_week)}
            >
              {DAYS_OF_WEEK.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Who&apos;s covering it?</Label>
            <AssigneePicker
              profiles={profiles}
              includeBoth={false}
              defaultValue={duty.assignee_id ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`dn-${duty.id}`}>Notes</Label>
            <Textarea
              id={`dn-${duty.id}`}
              name="notes"
              defaultValue={duty.notes ?? ""}
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
                  await deleteDuty(duty.id);
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
