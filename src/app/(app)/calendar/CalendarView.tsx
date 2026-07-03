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
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Fab } from "@/components/ui/Fab";
import { EmptyState } from "@/components/ui/EmptyState";
import { EventAdd } from "./EventAdd";
import type { CalendarEvent, Profile } from "@/lib/types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function occursOn(day: Date, ev: CalendarEvent) {
  if (ev.allDay) {
    const s = startOfDay(parseISO(ev.start));
    const e = startOfDay(parseISO(ev.end));
    return day >= s && day < e;
  }
  return isSameDay(day, parseISO(ev.start));
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
  const refDate = parseISO(dateStr);
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
              setSelected(new Date());
              go(view, new Date());
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
          const dayEvents = events.filter((e) => occursOn(day, e));
          const inMonth = isSameMonth(day, refDate);
          const isSel = isSameDay(day, selected);
          const today = isToday(day);
          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={cn(
                "flex min-h-[3.6rem] flex-col items-center gap-1 border-b border-r border-neutral-100 p-1.5 transition",
                i % 7 === 6 && "border-r-0",
                isSel ? "bg-neutral-100" : "hover:bg-neutral-50",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  today
                    ? "bg-neutral-900 font-semibold text-white"
                    : inMonth
                      ? "text-neutral-700"
                      : "text-neutral-300",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-0.5">
                {dayEvents.slice(0, 4).map((e) => (
                  <span
                    key={e.id}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: e.ownerColor }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
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
                  isToday(day) ? "text-neutral-900" : "text-neutral-500",
                )}
              >
                {format(day, "EEE d")}
              </span>
              {isToday(day) && (
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
