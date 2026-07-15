"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createEventForUser,
  createFamilyEvent,
  HOUSEHOLD_EVENTS_TAG,
} from "@/lib/google";

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function createCalendarEvent(formData: FormData) {
  const userId = await currentUserId();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Title required" };

  const allDay = formData.get("allDay") === "on";
  const location = String(formData.get("location") ?? "").trim() || null;
  const shared = formData.get("shared") === "on";
  const timeZone =
    String(formData.get("tz") ?? "") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  let start: string;
  let end: string;

  if (allDay) {
    const date = String(formData.get("date") ?? "");
    if (!date) return { ok: false, error: "Date required" };
    start = date;
    // Google all-day end date is exclusive; add one day.
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    end = d.toISOString().slice(0, 10);
  } else {
    start = String(formData.get("start") ?? "");
    end = String(formData.get("end") ?? "");
    if (!start || !end) return { ok: false, error: "Start and end required" };
  }

  const payload = { title, start, end, allDay, timeZone, location };

  try {
    if (shared) {
      await createFamilyEvent(payload);
    } else {
      await createEventForUser(userId, payload);
    }
  } catch {
    return { ok: false, error: "Could not create event on Google Calendar." };
  }

  updateTag(HOUSEHOLD_EVENTS_TAG);
  revalidatePath("/calendar");
  revalidatePath("/");
  return { ok: true };
}

export async function disconnectGoogle() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("google_accounts").delete().eq("user_id", user.id);
  updateTag(HOUSEHOLD_EVENTS_TAG);
  revalidatePath("/calendar");
}
