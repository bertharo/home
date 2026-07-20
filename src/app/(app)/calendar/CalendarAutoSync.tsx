"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { refreshCalendarSync } from "./actions";

/** Re-fetch Google events while the calendar tab is open. */
const CALENDAR_POLL_MS = 3 * 60 * 1000;

/**
 * Keeps calendar data fresh without a manual "Refresh sync" tap:
 * - When the app/PWA comes back to the foreground
 * - Every few minutes while viewing the calendar
 */
export function CalendarAutoSync() {
  const router = useRouter();
  const pathname = usePathname();
  const syncing = useRef(false);

  useEffect(() => {
    async function sync() {
      if (syncing.current) return;
      syncing.current = true;
      try {
        await refreshCalendarSync();
        router.refresh();
      } finally {
        syncing.current = false;
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void sync();
    }

    document.addEventListener("visibilitychange", onVisible);

    const onCalendar = pathname === "/calendar";
    const poll = onCalendar ? setInterval(() => void sync(), CALENDAR_POLL_MS) : undefined;

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (poll) clearInterval(poll);
    };
  }, [pathname, router]);

  return null;
}
