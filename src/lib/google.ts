import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CalendarEvent, Profile } from "@/lib/types";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "openid",
  "email",
];

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      !process.env.GOOGLE_CLIENT_ID.startsWith("placeholder"),
  );
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${siteUrl()}/api/google/callback`,
  );
}

/**
 * Build an authorized OAuth2 client for a given user's stored tokens.
 * Persists refreshed access tokens back to the DB. Returns null if the user
 * hasn't connected Google.
 */
async function authedClientFor(userId: string) {
  const admin = createAdminClient();
  const { data: account } = await admin
    .from("google_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!account) return null;

  const client = oauthClient();
  client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: new Date(account.expiry).getTime(),
  });

  // Persist rotated tokens so we don't repeatedly refresh.
  client.on("tokens", async (tokens) => {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (tokens.access_token) update.access_token = tokens.access_token;
    if (tokens.refresh_token) update.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date)
      update.expiry = new Date(tokens.expiry_date).toISOString();
    await admin.from("google_accounts").update(update).eq("user_id", userId);
  });

  return { client, account };
}

/** Which household members have connected Google. */
export async function connectedUserIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("google_accounts").select("user_id");
  return (data ?? []).map((r) => r.user_id as string);
}

/**
 * Fetch and merge calendar events for every connected household member
 * within [timeMin, timeMax]. Color-coded by owner profile.
 */
export async function fetchHouseholdEvents(
  profiles: Profile[],
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  if (!googleConfigured()) return [];

  const results: CalendarEvent[] = [];

  await Promise.all(
    profiles.map(async (profile) => {
      const authed = await authedClientFor(profile.id);
      if (!authed) return;

      try {
        const calendar = google.calendar({
          version: "v3",
          auth: authed.client,
        });
        const res = await calendar.events.list({
          calendarId: authed.account.calendar_id || "primary",
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 250,
        });

        for (const ev of res.data.items ?? []) {
          if (ev.status === "cancelled") continue;
          const start = ev.start?.dateTime ?? ev.start?.date;
          const end = ev.end?.dateTime ?? ev.end?.date;
          if (!start || !end) continue;

          results.push({
            id: `${profile.id}:${ev.id}`,
            title: ev.summary ?? "(no title)",
            start,
            end,
            allDay: Boolean(ev.start?.date),
            ownerId: profile.id,
            ownerColor: profile.color,
            ownerName: profile.display_name,
            location: ev.location ?? null,
            isFamily: Boolean(
              ev.extendedProperties?.private?.homeHubFamily === "1",
            ),
          });
        }
      } catch {
        // A single member's fetch failing shouldn't break the whole view.
      }
    }),
  );

  return results;
}

type NewEvent = {
  title: string;
  start: string; // "YYYY-MM-DDTHH:mm" (local) or ISO
  end: string;
  allDay: boolean;
  timeZone?: string;
  location?: string | null;
  description?: string | null;
};

/** Create an event on a single user's calendar. */
export async function createEventForUser(userId: string, ev: NewEvent) {
  const authed = await authedClientFor(userId);
  if (!authed) return;

  const calendar = google.calendar({ version: "v3", auth: authed.client });
  const tz = ev.timeZone || "UTC";
  const body = ev.allDay
    ? {
        summary: ev.title,
        location: ev.location ?? undefined,
        description: ev.description ?? undefined,
        start: { date: ev.start.slice(0, 10) },
        end: { date: ev.end.slice(0, 10) },
      }
    : {
        summary: ev.title,
        location: ev.location ?? undefined,
        description: ev.description ?? undefined,
        start: { dateTime: ev.start, timeZone: tz },
        end: { dateTime: ev.end, timeZone: tz },
      };

  await calendar.events.insert({
    calendarId: authed.account.calendar_id || "primary",
    requestBody: {
      ...body,
      extendedProperties: { private: { homeHubFamily: "1" } },
    },
  });
}

/** Create a "family event" on every connected member's calendar. */
export async function createFamilyEvent(ev: NewEvent) {
  const ids = await connectedUserIds();
  await Promise.all(ids.map((id) => createEventForUser(id, ev)));
}
