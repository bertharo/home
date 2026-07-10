"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateKey, parseLocalDateKey } from "@/lib/timezone";
import { Fab } from "@/components/ui/Fab";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventAdd } from "./EventAdd";
import type { CalendarEvent, Profile } from "@/lib/types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_CELL_MAX_EVENTS = 3;

/** Light tint behind a hex color for month-view event chips. */
function tint(hex: string) {
  if (/^#[0-9a-f]{6}$/i.test(hex)) return `${hex}24`;
  return `color-mix(in srgb, ${hex} 14%, transparent)`;
}

function occursOn(day: Date, ev: CalendarEvent) {
  if (!ev.start) return false;
  const dayKey = format(day, "yyyy-MM-dd");
  if (ev.allDay) {
    const startKey = ev.start.slice(0, 10);
    const endKey = (ev.end ?? ev.start).slice(0, 10);
    return dayKey >= startKey && dayKey < endKey;
  }
  return isSameDay(day, parseISO(ev.start));
}

function isHouseholdToday(day: Date) {
  return format(day, "yyyy-MM-dd") === formatDateKey(new Date());
}

function sortEvents(a: CalendarEvent, b: CalendarEvent) {
  if (a.allDay && !b.allDay) return -1;
  if (!a.allDay && b.allDay) return 1;
  return parseISO(a.start).getTime() - parseISO(b.start).getTime();
}

export function CalendarView({
  view,
  dateStr,
  events,
  profiles,
  anyConnected,
}: {
  view: "month" | "week";
  dateStr: string;
  events: CalendarEvent[];
  profiles: Profile[];
  anyConnected: boolean;
}) {
  const router = useRouter();
  const refDate = parseLocalDateKey(dateStr);
  const [selected, setSelected] = useState<Date>(refDate);
  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<Date>(refDate);

  const go = (v: "month" | "week", d: Date) =>
    router.push(`/calendar?view=${v}&date=${format(d, "yyyy-MM-dd")}`);

  const days = useMemo(() => {
    if (view === "week") {
      const s = startOfWeek(refDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ end: endOfWeek(refDate, { weekStartsOn: 0 }), start: s });
    }
    const s = startOfWeek(startOfMonth(refDate), { weekStartsOn: 0 });
    const e = endOfWeek(endOfMonth(refDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: s, end: e });
  }, [view, dateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedEvents = events
    .filter((e) => occursOn(selected, e))
    .sort(sortEvents);

  const title =
    view === "week"
      ? `${format(days[0], "MMM d")} – ${format(days[6], "MMM d")}`
      : format(refDate, "MMMM yyyy");

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              go(view, view === "week" ? addWeeks(refDate, -1) : addMonths(refDate, -1))
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-[9rem] text-center text-base font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            onClick={() =>
              go(view, view === "week" ? addWeeks(refDate, 1) : addMonths(refDate, 1))
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
              onClick={() => {
                const today = parseLocalDateKey(formatDateKey(new Date()));
                setSelected(today);
                go(view, today);
              }}
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100"
          >
            Today
          </button>
          <div className="ml-1 flex rounded-lg bg-neutral-100 p-0.5 text-sm font-medium">
            <button
              onClick={() => go("month", refDate)}
              className={cn(
                "rounded-md px-2.5 py-1 transition",
                view === "month" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500",
              )}
            >
              Month
            </button>
            <button
              onClick={() => go("week", refDate)}
              className={cn(
                "rounded-md px-2.5 py-1 transition",
                view === "week" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500",
              )}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      {profiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3">
          {profiles.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.display_name}
            </span>
          ))}
        </div>
      )}

      {view === "month" ? (
        <MonthGrid
          days={days}
          refDate={refDate}
          events={events}
          selected={selected}
          onSelect={(d) => setSelected(d)}
        />
      ) : (
        <WeekAgenda days={days} events={events} profiles={profiles} />
      )}

      {/* Selected day agenda (month view) */}
      {view === "month" && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">
            {format(selected, "EEEE, MMM d")}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400">
              {anyConnected ? "No events." : "Connect a calendar to see events."}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      )}

      {!anyConnected && view === "week" && (
        <EmptyState
          className="mt-4"
          icon={CalendarDays}
          title="No calendars connected"
          description="Connect Google Calendar above to see your events here."
        />
      )}

      <Fab
        onClick={() => {
          setAddDate(selected);
          setAddOpen(true);
        }}
        label="Add event"
      />
      <EventAdd
        open={addOpen}
        onClose={() => setAddOpen(false)}
        defaultDate={addDate}
        canWrite={anyConnected}
        profiles={profiles}
      />
    </div>
  );
}

function MonthGrid({
  days,
  refDate,
  events,
  selected,
  onSelect,
}: {
  days: Date[];
  refDate: Date;
  events: CalendarEvent[];
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50/60">
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className="py-2 text-center text-[11px] font-semibold uppercase text-neutral-400"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvents = events.filter((e) => occursOn(day, e)).sort(sortEvents);
          const visible = dayEvents.slice(0, MONTH_CELL_MAX_EVENTS);
          const overflow = dayEvents.length - visible.length;
          const inMonth = isSameMonth(day, refDate);
          const isSel = isSameDay(day, selected);
          const today = isHouseholdToday(day);
          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={cn(
                "flex min-h-[5.25rem] flex-col items-stretch gap-0.5 border-b border-r border-neutral-100 p-1 text-left transition sm:min-h-[6.5rem] sm:p-1.5",
                i % 7 === 6 && "border-r-0",
                isSel ? "bg-neutral-100" : "hover:bg-neutral-50",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-full text-xs",
                  today
                    ? "bg-neutral-900 font-semibold text-white"
                    : inMonth
                      ? "text-neutral-700"
                      : "text-neutral-300",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                {visible.map((e) => (
                  <MonthEventChip key={e.id} event={e} />
                ))}
                {overflow > 0 && (
                  <span className="truncate px-0.5 text-[10px] font-medium text-neutral-500">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthEventChip({ event }: { event: CalendarEvent }) {
  const timePrefix = event.allDay
    ? null
    : format(parseISO(event.start), "h:mma").replace(":00", "").toLowerCase();

  return (
    <span
      title={
        timePrefix ? `${timePrefix} · ${event.title}` : event.title
      }
      className="block truncate rounded px-1 py-0.5 text-[10px] font-medium leading-snug text-neutral-800 sm:text-[11px]"
      style={{
        backgroundColor: tint(event.ownerColor),
        boxShadow: `inset 2px 0 0 ${event.ownerColor}`,
      }}
    >
      {timePrefix ? (
        <>
          <span className="text-neutral-500">{timePrefix}</span>{" "}
          {event.title}
        </>
      ) : (
        event.title
      )}
    </span>
  );
}

function WeekAgenda({
  days,
  events,
  profiles,
}: {
  days: Date[];
  events: CalendarEvent[];
  profiles: Profile[];
}) {
  void profiles;
  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayEvents = events.filter((e) => occursOn(day, e)).sort(sortEvents);
        return (
          <div key={day.toISOString()}>
            <div className="mb-1.5 flex items-center gap-2 px-1">
              <span
                className={cn(
                  "text-sm font-semibold",
                  isHouseholdToday(day) ? "text-neutral-900" : "text-neutral-500",
                )}
              >
                {format(day, "EEE d")}
              </span>
              {isHouseholdToday(day) && (
                <span className="rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white">
                  Today
                </span>
              )}
            </div>
            {dayEvents.length === 0 ? (
              <p className="px-1 text-xs text-neutral-300">—</p>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const time = event.allDay
    ? "All day"
    : `${format(parseISO(event.start), "h:mm a")}`;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5">
      <span
        className="mt-1 h-full min-h-[2.2rem] w-1 shrink-0 rounded-full"
        style={{ backgroundColor: event.ownerColor }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900">{event.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-400">
          <span>{time}</span>
          <span>· {event.ownerName}</span>
          {event.isFamily && (
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
              Family
            </span>
          )}
          {event.location && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
