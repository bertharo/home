import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isValid,
  parseISO,
} from "date-fns";
import { getHousehold } from "@/lib/auth";
import { parseLocalDateKey, formatDateKey } from "@/lib/timezone";
import {
  fetchHouseholdEventsDetailed,
  connectedUserIds,
  googleConfigured,
} from "@/lib/google";
import { CalendarView } from "./CalendarView";
import { CalendarConnect } from "./CalendarConnect";

export const metadata = { title: "Calendar" };

type SP = { view?: string; date?: string; connected?: string; error?: string };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : "month";

  const dateKey =
    sp.date && isValid(parseISO(sp.date))
      ? sp.date.slice(0, 10)
      : formatDateKey();
  const refDate = parseLocalDateKey(dateKey);

  const { me, all } = await getHousehold();

  const rangeStart = addDays(
    view === "week"
      ? startOfWeek(refDate, { weekStartsOn: 0 })
      : startOfWeek(startOfMonth(refDate), { weekStartsOn: 0 }),
    -1,
  );
  const rangeEnd = addDays(
    view === "week"
      ? endOfWeek(refDate, { weekStartsOn: 0 })
      : endOfWeek(endOfMonth(refDate), { weekStartsOn: 0 }),
    1,
  );

  const profileIds = all.map((p) => p.id);

  const [{ events, syncErrors }, connectedIds] = await Promise.all([
    fetchHouseholdEventsDetailed(all, rangeStart, rangeEnd, {
      skipCache: true,
    }),
    connectedUserIds(profileIds),
  ]);

  const meConnected = me ? connectedIds.includes(me.id) : false;

  return (
    <div>
      <CalendarConnect
        configured={googleConfigured()}
        meConnected={meConnected}
        connectedIds={connectedIds}
        profiles={all}
        justConnected={sp.connected === "1"}
        error={sp.error ?? null}
        syncErrors={syncErrors}
      />
      <CalendarView
        view={view}
        dateStr={dateKey}
        events={events}
        profiles={all}
        anyConnected={connectedIds.length > 0}
      />
    </div>
  );
}
