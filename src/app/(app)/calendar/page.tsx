import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid,
} from "date-fns";
import { getHousehold } from "@/lib/auth";
import {
  fetchHouseholdEvents,
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

  const parsed = sp.date ? parseISO(sp.date) : new Date();
  const refDate = isValid(parsed) ? parsed : new Date();

  const { me, all } = await getHousehold();

  const rangeStart =
    view === "week"
      ? startOfWeek(refDate, { weekStartsOn: 0 })
      : startOfWeek(startOfMonth(refDate), { weekStartsOn: 0 });
  const rangeEnd =
    view === "week"
      ? endOfWeek(refDate, { weekStartsOn: 0 })
      : endOfWeek(endOfMonth(refDate), { weekStartsOn: 0 });

  const [events, connectedIds] = await Promise.all([
    fetchHouseholdEvents(all, rangeStart, rangeEnd),
    connectedUserIds(),
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
      />
      <CalendarView
        view={view}
        dateStr={refDate.toISOString().slice(0, 10)}
        events={events}
        profiles={all}
        anyConnected={connectedIds.length > 0}
      />
    </div>
  );
}
