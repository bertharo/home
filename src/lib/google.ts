import { unstable_cache } from "next/cache";
import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSiteUrl } from "@/lib/env";
import type { CalendarEvent, Profile } from "@/lib/types";

/**
 * Cache tag for household calendar events. Bust it (revalidateTag) whenever a
 * member connects/disconnects Google or creates an event so changes appear
 * immediately instead of waiting out the TTL.
 */
export type CalendarSyncError = {
  profileId: string;
  displayName: string;
};

export type HouseholdEventsResult = {
  events: CalendarEvent[];
  syncErrors: CalendarSyncError[];
};

export const HOUSEHOLD_EVENTS_TAG = "household-events";
const EVENTS_CACHE_TTL_SECONDS = 60;
const CALENDAR_SYNC_FAILED = "calendar-sync-failed";

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
  return resolveSiteUrl("http://localhost:3000");
}

export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${siteUrl()}/api/google/callback`,
  );
}

async function persistTokens(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  },
) {
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (tokens.access_token) update.access_token = tokens.access_token;
  if (tokens.refresh_token) update.refresh_token = tokens.refresh_token;
  if (tokens.expiry_date)
    update.expiry = new Date(tokens.expiry_date).toISOString();
  await admin.from("google_accounts").update(update).eq("user_id", userId);
}

/** Refresh and persist access tokens before Google API calls. */
async function ensureAccessToken(
  client: ReturnType<typeof oauthClient>,
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const expiry = client.credentials.expiry_date;
  if (expiry && expiry > Date.now() + 5 * 60_000) return;

  const { credentials } = await client.refreshAccessToken();
  client.setCredentials(credentials);
  await persistTokens(admin, userId, credentials);
}

/**
 * Build an authorized OAuth2 client for a given user's stored tokens.
 * Persists refreshed access tokens back to the DB. Returns null if the user
 * hasn't connected Google or tokens can't be refreshed.
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

  // Persist rotated tokens from automatic refresh during API calls.
  client.on("tokens", async (tokens) => {
    await persistTokens(admin, userId, tokens);
  });

  try {
    await ensureAccessToken(client, admin, userId);
  } catch {
    throw new Error("google-token-refresh-failed");
  }

  return { client, account };
}

/**
 * Cap how long a single member's calendar fetch (token refresh + events list)
 * may take. Without this, a slow/hung Google call or an expired-token refresh
 * blocks the whole page for Node's default socket timeout (~1 minute). A member
 * whose fetch times out simply contributes no events — identical to the
 * existing behaviour when a member's fetch throws.
 */
const EVENT_FETCH_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("google-calendar-timeout")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Which household members have connected Google. */
export async function connectedUserIds(
  householdProfileIds?: string[],
): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("google_accounts").select("user_id");
  let ids = (data ?? []).map((r) => r.user_id as string);
  if (householdProfileIds?.length) {
    const allowed = new Set(householdProfileIds);
    ids = ids.filter((id) => allowed.has(id));
  }
  return ids;
}

export async function fetchHouseholdEventsDetailed(
  profiles: Profile[],
  timeMin: Date,
  timeMax: Date,
  options?: { skipCache?: boolean },
): Promise<HouseholdEventsResult> {
  if (!googleConfigured()) return { events: [], syncErrors: [] };

  const load = () => fetchHouseholdEventsInner(profiles, timeMin, timeMax);

  if (options?.skipCache) {
    const result = await load();
    return { events: result.events, syncErrors: result.syncErrors };
  }

  const cacheKey = [
    "household-events",
    profiles
      .map((p) => `${p.id}:${p.color}:${p.display_name}`)
      .sort()
      .join(","),
    timeMin.toISOString(),
    timeMax.toISOString(),
  ];

  const cached = unstable_cache(
    async () => {
      const result = await load();
      if (!result.cacheable) throw new Error(CALENDAR_SYNC_FAILED);
      return result;
    },
    cacheKey,
    { revalidate: EVENTS_CACHE_TTL_SECONDS, tags: [HOUSEHOLD_EVENTS_TAG] },
  );

  try {
    const result = await cached();
    return { events: result.events, syncErrors: result.syncErrors };
  } catch (err) {
    if (err instanceof Error && err.message === CALENDAR_SYNC_FAILED) {
      const result = await load();
      return { events: result.events, syncErrors: result.syncErrors };
    }
    throw err;
  }
}

/**
 * Fetch and merge calendar events for every connected household member
 * within [timeMin, timeMax]. Color-coded by owner profile.
 *
 * Cached for a short window (keyed by member identity + range) so passive
 * dashboard/calendar re-renders — e.g. the full-page revalidation triggered by
 * toggling a todo — reuse events instead of re-hitting Google every time.
 * Failed syncs are not cached so the next load can retry.
 * Event mutations and connect/disconnect bust the cache via HOUSEHOLD_EVENTS_TAG.
 */
export async function fetchHouseholdEvents(
  profiles: Profile[],
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  const { events } = await fetchHouseholdEventsDetailed(
    profiles,
    timeMin,
    timeMax,
  );
  return events;
}

async function fetchHouseholdEventsInner(
  profiles: Profile[],
  timeMin: Date,
  timeMax: Date,
): Promise<{
  events: CalendarEvent[];
  syncErrors: CalendarSyncError[];
  cacheable: boolean;
}> {
  const results: CalendarEvent[] = [];
  const syncErrors: CalendarSyncError[] = [];

  await Promise.all(
    profiles.map(async (profile) => {
      let authed: Awaited<ReturnType<typeof authedClientFor>> | null = null;
      try {
        authed = await authedClientFor(profile.id);
      } catch {
        syncErrors.push({
          profileId: profile.id,
          displayName: profile.display_name,
        });
        return;
      }
      if (!authed) return;

      try {
        await withTimeout(
          (async () => {
            const calendar = google.calendar({
              version: "v3",
              auth: authed.client,
            });
            const res = await calendar.events.list(
              {
                calendarId: authed.account.calendar_id || "primary",
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                singleEvents: true,
                orderBy: "startTime",
                maxResults: 250,
              },
              { timeout: EVENT_FETCH_TIMEOUT_MS },
            );

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
          })(),
          EVENT_FETCH_TIMEOUT_MS + 2000,
        );
      } catch {
        syncErrors.push({
          profileId: profile.id,
          displayName: profile.display_name,
        });
      }
    }),
  );

  return {
    events: results,
    syncErrors,
    cacheable: syncErrors.length === 0,
  };
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
