/** Household timezone for dates shown in the app (Pacific by default). */
export const HOUSEHOLD_TIMEZONE =
  process.env.NEXT_PUBLIC_HOUSEHOLD_TIMEZONE ??
  process.env.HOUSEHOLD_TIMEZONE ??
  process.env.TZ ??
  "America/Los_Angeles";

/** "YYYY-MM-DD" for a timestamp in the household timezone. */
export function formatDateKey(
  date: Date = new Date(),
  timeZone = HOUSEHOLD_TIMEZONE,
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

/** True when `day` falls on the calendar date `key` in household timezone. */
export function isDateKeyToday(
  key: string,
  now = new Date(),
  timeZone = HOUSEHOLD_TIMEZONE,
): boolean {
  return key === formatDateKey(now, timeZone);
}
