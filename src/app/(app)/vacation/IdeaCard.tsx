/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2, LinkIcon, ImagePlus, X, ExternalLink } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Select, Button, inputClass } from "@/components/ui/form";
import { Avatar } from "@/components/ui/Avatar";
import { VACATION_STATUSES, VACATION_STATUS_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { vacationPhotoUrl } from "@/lib/supabase/storage";
import {
  updateIdea,
  deleteIdea,
  addLink,
  deleteLink,
  addPhoto,
  deletePhoto,
} from "./actions";
import type { Profile, VacationIdeaFull } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  idea: "bg-neutral-100 text-neutral-500",
  researching: "bg-blue-50 text-blue-600",
  planned: "bg-amber-50 text-amber-600",
  booked: "bg-emerald-50 text-emerald-600",
};

export function IdeaCard({
  idea,
  profiles,
}: {
  idea: VacationIdeaFull;
  profiles: Profile[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const editRef = useRef<HTMLFormElement>(null);
  const linkRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const creator = profiles.find((p) => p.id === idea.created_by);
  const cover = idea.vacation_photos[0];

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${idea.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("vacation-photos")
        .upload(path, file, { upsert: false });
      if (!error) {
        await addPhoto(idea.id, path);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left transition hover:border-neutral-300"
      >
        {cover && (
          <img
            src={vacationPhotoUrl(cover.storage_path)}
            alt=""
            className="h-32 w-full object-cover"
          />
        )}
        <div className="p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_STYLES[idea.status],
              )}
            >
              {VACATION_STATUS_LABELS[idea.status]}
            </span>
            {idea.rough_timing && (
              <span className="text-xs text-neutral-400">{idea.rough_timing}</span>
            )}
          </div>
          <p className="text-[15px] font-medium leading-snug text-neutral-900">
            {idea.title}
          </p>
          {idea.notes && (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
              {idea.notes}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            {idea.rough_cost != null && (
              <span className="font-medium text-neutral-600">
                ~{formatCurrency(Number(idea.rough_cost))}
              </span>
            )}
            {idea.vacation_links.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                {idea.vacation_links.length}
              </span>
            )}
            {idea.vacation_photos.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <ImagePlus className="h-3 w-3" />
                {idea.vacation_photos.length}
              </span>
            )}
            {creator && (
              <span className="ml-auto inline-flex items-center gap-1">
                <Avatar name={creator.display_name} color={creator.color} size="xs" />
              </span>
            )}
          </div>
        </div>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Trip idea">
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          {/* Edit fields */}
          <form
            ref={editRef}
            action={(fd) => start(() => updateIdea(idea.id, fd))}
            className="space-y-3"
          >
            <div>
              <Label htmlFor={`v-title-${idea.id}`}>Destination</Label>
              <Input
                id={`v-title-${idea.id}`}
                name="title"
                required
                defaultValue={idea.title}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`v-status-${idea.id}`}>Status</Label>
                <Select
                  id={`v-status-${idea.id}`}
                  name="status"
                  defaultValue={idea.status}
                >
                  {VACATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {VACATION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`v-cost-${idea.id}`}>Rough cost</Label>
                <Input
                  id={`v-cost-${idea.id}`}
                  name="rough_cost"
                  type="number"
                  min="0"
                  defaultValue={idea.rough_cost ?? ""}
                  placeholder="$"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`v-timing-${idea.id}`}>Rough timing</Label>
              <Input
                id={`v-timing-${idea.id}`}
                name="rough_timing"
                defaultValue={idea.rough_timing ?? ""}
                placeholder="e.g. Next spring, long weekend"
              />
            </div>
            <div>
              <Label htmlFor={`v-notes-${idea.id}`}>Notes</Label>
              <Textarea
                id={`v-notes-${idea.id}`}
                name="notes"
                defaultValue={idea.notes ?? ""}
                placeholder="Why we want to go, ideas, must-dos…"
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              Save details
            </Button>
          </form>

          {/* Photos */}
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Photos</p>
            <div className="grid grid-cols-3 gap-2">
              {idea.vacation_photos.map((ph) => (
                <div key={ph.id} className="group relative">
                  <img
                    src={vacationPhotoUrl(ph.storage_path)}
                    alt=""
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <button
                    onClick={() =>
                      start(() => deletePhoto(ph.id, ph.storage_path))
                    }
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition hover:border-neutral-400"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px]">{uploading ? "…" : "Add"}</span>
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
          </div>

          {/* Links */}
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Links</p>
            <div className="space-y-2">
              {idea.vacation_links.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2"
                >
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-blue-600"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{l.label || l.url}</span>
                  </a>
                  <button
                    onClick={() => start(() => deleteLink(l.id))}
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-neutral-300 hover:text-red-500"
                    aria-label="Remove link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <form
              ref={linkRef}
              action={(fd) =>
                start(async () => {
                  await addLink(idea.id, fd);
                  linkRef.current?.reset();
                })
              }
              className="mt-2 flex gap-2"
            >
              <input
                name="url"
                required
                placeholder="Paste a link (flight, hotel, article)…"
                className={cn(inputClass, "flex-1")}
              />
              <Button type="submit" variant="secondary" disabled={pending}>
                Add
              </Button>
            </form>
          </div>

          {/* Delete */}
          <div className="border-t border-neutral-100 pt-3">
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteIdea(idea.id);
                  setOpen(false);
                })
              }
              className="w-full"
            >
              <Trash2 className="h-4 w-4" /> Delete this idea
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
