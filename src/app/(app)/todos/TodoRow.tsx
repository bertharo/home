"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Pencil, Trash2, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Button } from "@/components/ui/form";
import { AssigneePicker } from "@/components/AssigneePicker";
import { Avatar } from "@/components/ui/Avatar";
import { toggleTodo, updateTodo, deleteTodo } from "./actions";
import type { Profile, Todo } from "@/lib/types";

function dueMeta(due: string | null) {
  if (!due) return null;
  const [y, m, d] = due.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  const label =
    diff === 0
      ? "Today"
      : diff === 1
        ? "Tomorrow"
        : diff === -1
          ? "Yesterday"
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label, overdue: diff < 0 };
}

export function TodoRow({
  todo,
  profiles,
}: {
  todo: Todo;
  profiles: Profile[];
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const done = todo.status === "done";
  const assignee = profiles.find((p) => p.id === todo.assignee_id);
  const creator = profiles.find((p) => p.id === todo.created_by);
  const due = dueMeta(todo.due_date);

  const assigneeDefault = todo.for_both
    ? "both"
    : (todo.assignee_id ?? "");

  function onToggle() {
    start(() => toggleTodo(todo.id, !done));
  }

  function onSave(fd: FormData) {
    start(async () => {
      await updateTodo(todo.id, fd);
      setEditing(false);
    });
  }

  function onDelete() {
    start(async () => {
      await deleteTodo(todo.id);
      setEditing(false);
    });
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white px-3.5 py-3 transition",
          pending && "opacity-60",
        )}
      >
        <button
          onClick={onToggle}
          disabled={pending}
          aria-label={done ? "Mark not done" : "Mark done"}
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition",
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-neutral-300 text-transparent hover:border-neutral-400",
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[15px] leading-snug text-neutral-900",
              done && "text-neutral-400 line-through",
            )}
          >
            {todo.title}
          </p>
          {todo.notes && (
            <p className="mt-0.5 line-clamp-2 text-sm text-neutral-400">
              {todo.notes}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {todo.for_both ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                Both
              </span>
            ) : assignee ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600">
                <Avatar
                  name={assignee.display_name}
                  color={assignee.color}
                  size="xs"
                />
                {assignee.display_name}
              </span>
            ) : null}
            {due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  due.overdue && !done
                    ? "bg-red-50 text-red-600"
                    : "bg-neutral-100 text-neutral-500",
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {due.label}
              </span>
            )}
            {creator && (
              <span className="text-xs text-neutral-300">
                by {creator.display_name}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => setEditing(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit to-do">
        <form ref={formRef} action={onSave} className="space-y-4">
          <div>
            <Label htmlFor={`t-${todo.id}`}>Title</Label>
            <Input
              id={`t-${todo.id}`}
              name="title"
              required
              defaultValue={todo.title}
            />
          </div>
          <div>
            <Label>Assign to</Label>
            <AssigneePicker profiles={profiles} defaultValue={assigneeDefault} />
          </div>
          <div>
            <Label htmlFor={`d-${todo.id}`}>Due date</Label>
            <Input
              id={`d-${todo.id}`}
              name="due_date"
              type="date"
              defaultValue={todo.due_date ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`n-${todo.id}`}>Notes</Label>
            <Textarea
              id={`n-${todo.id}`}
              name="notes"
              defaultValue={todo.notes ?? ""}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending} className="flex-1">
              Save
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onDelete}
              disabled={pending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
