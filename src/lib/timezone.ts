const FALLBACK_TIMEZONE = "America/Los_Angeles";

function isValidTimezone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Pick the first non-empty, valid IANA timezone from env, else Pacific. */
export function getHouseholdTimezone(): string {
  for (const raw of [
    process.env.NEXT_PUBLIC_HOUSEHOLD_TIMEZONE,
    process.env.HOUSEHOLD_TIMEZONE,
    process.env.TZ,
  ]) {
    const tz = raw?.trim();
    if (tz && isValidTimezone(tz)) return tz;
  }
  return FALLBACK_TIMEZONE;
}

/** @deprecated Use getHouseholdTimezone() — kept for existing imports. */
export const HOUSEHOLD_TIMEZONE = getHouseholdTimezone();

/** "YYYY-MM-DD" for a timestamp in the household timezone. */
export function formatDateKey(
  date: Date = new Date(),
  timeZone = getHouseholdTimezone(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseDateKey(key: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

/** Anchor date for calendar month math (mid-month avoids UTC boundary bugs). */
export function dateFromKey(key: string): Date {
  const { year, month } = parseDateKey(key);
  return new Date(year, month - 1, 15);
}

/** Parse "YYYY-MM-DD" as local civil midnight (browser / Node local). */
export function parseLocalDateKey(key: string): Date {
  const { year, month, day } = parseDateKey(key);
  return new Date(year, month - 1, day);
}

/** Hour (0–23) in the household timezone. */
export function householdHour(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: getHouseholdTimezone(),
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

/** True when `day` falls on the calendar date `key` in household timezone. */
export function isDateKeyToday(
  key: string,
  now = new Date(),
  timeZone = getHouseholdTimezone(),
): boolean {
  return key === formatDateKey(now, timeZone);
}
