import Link from "next/link";
import {
  addDays,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
} from "date-fns";
import {
  CheckSquare,
  Wallet,
  Target,
  CalendarDays,
  Repeat,
  Car,
  ShoppingCart,
  ArrowRight,
  Clock,
} from "lucide-react";
import { getHousehold } from "@/lib/auth";
import { formatDateKey, parseLocalDateKey, getHouseholdTimezone, householdHour, parseDateKey } from "@/lib/timezone";
import { createClient } from "@/lib/supabase/server";
import { fetchHouseholdEvents } from "@/lib/google";
import {
  computeForecast,
  toCategory,
  toOverride,
  toSettings,
} from "@/lib/budget";
import type {
  BudgetCategoryRow,
  BudgetOverrideRow,
  BudgetSettingsRow,
} from "@/lib/budget";
import {
  formatCurrency,
  monthLabel,
  timeAgo,
  cn,
} from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { TodoRow } from "./todos/TodoRow";
import { ChoreRow } from "./chores/ChoreRow";
import type {
  Todo,
  Chore,
  Goal,
  PickupDuty,
  CalendarEvent,
} from "@/lib/types";

export const metadata = { title: "Home" };

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

function greeting(now = new Date()) {
  const hour = householdHour(now);
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { me, all } = await getHousehold();
  const supabase = await createClient();

  const now = new Date();
  const todayKey = formatDateKey(now);
  const today = parseLocalDateKey(todayKey);
  const todayStr = todayKey;
  const todayDow = today.getDay();
  const month = todayKey.slice(0, 7);
  const nowYM = parseDateKey(todayKey);

  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  const [
    todosRes,
    choresRes,
    goalsRes,
    budgetCategoriesRes,
    budgetOverridesRes,
    budgetSettingsRes,
    dutiesRes,
    groceryRes,
    events,
  ] = await Promise.all([
    supabase.from("todos").select("*").eq("status", "open"),
    supabase
      .from("chores")
      .select("*")
      .lte("next_due", todayStr)
      .order("next_due", { ascending: true }),
    supabase
      .from("goals")
      .select("*")
      .eq("year", nowYM.year)
      .neq("status", "done")
      .order("updated_at", { ascending: true }),
    supabase.from("budget_categories").select("*"),
    supabase.from("budget_overrides").select("*"),
    supabase.from("budget_settings").select("*").maybeSingle(),
    supabase.from("pickup_duties").select("*").eq("day_of_week", todayDow),
    supabase
      .from("grocery_items")
      .select("id", { count: "exact", head: true })
      .eq("checked", false),
    fetchHouseholdEvents(all, today, addDays(weekEnd, 1)),
  ]);

  const allOpenTodos = (todosRes.data ?? []) as Todo[];
  const myTodos = allOpenTodos
    .filter((t) => t.assignee_id === me?.id || t.for_both)
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

  const dueChores = (choresRes.data ?? []) as Chore[];
  const goals = (goalsRes.data ?? []) as Goal[];
  const nowMs = now.getTime();
  const staleGoals = goals.filter(
    (g) => (nowMs - new Date(g.updated_at).getTime()) / 86_400_000 > 30,
  );
  const duties = (dutiesRes.data ?? []) as PickupDuty[];
  const groceryCount = groceryRes.count ?? 0;

  const budgetSettingsRow = (budgetSettingsRes.data ??
    null) as BudgetSettingsRow | null;
  const budgetCategories = ((budgetCategoriesRes.data ?? []) as BudgetCategoryRow[]).map(
    toCategory,
  );
  const budgetOverrides = ((budgetOverridesRes.data ?? []) as BudgetOverrideRow[]).map(
    toOverride,
  );

  const budgetReady = Boolean(budgetSettingsRow?.onboarded);
  const budgetCol =
    budgetReady && budgetSettingsRow
      ? computeForecast(
          budgetCategories,
          budgetOverrides,
          toSettings(budgetSettingsRow),
          { now: nowYM },
        ).find((c) => c.year === nowYM.year && c.month === nowYM.month) ??
        null
      : null;

  const todayEvents = events
    .filter((e) => occursOn(today, e))
    .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());
  const upcomingEvents = events
    .filter((e) => {
      const s = parseISO(e.start);
      return s > now && s <= addDays(weekEnd, 1) && !occursOn(today, e);
    })
    .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {greeting()}
          {me ? `, ${me.display_name}` : ""}.
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          {new Intl.DateTimeFormat("en-US", {
            timeZone: getHouseholdTimezone(),
            weekday: "long",
            month: "long",
            day: "numeric",
          }).format(now)}
        </p>
      </div>

      {/* Quick stat chips */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <QuickChip href="/todos" icon={CheckSquare} label="To-dos" value={myTodos.length} />
        <QuickChip href="/chores" icon={Repeat} label="Chores due" value={dueChores.length} highlight={dueChores.length > 0} />
        <QuickChip href="/grocery" icon={ShoppingCart} label="Grocery" value={groceryCount} />
        <QuickChip href="/duties" icon={Car} label="Today's pickups" value={duties.length} />
      </div>

      {/* Today */}
      <Section
        title="Today"
        icon={CalendarDays}
        href="/calendar"
        actionLabel="Calendar"
      >
        {todayEvents.length === 0 && duties.length === 0 ? (
          <p className="px-1 py-2 text-sm text-neutral-400">
            Nothing scheduled today.
          </p>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5"
              >
                <span
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: e.ownerColor }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {e.title}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {e.allDay ? "All day" : format(parseISO(e.start), "h:mm a")}{" "}
                    · {e.ownerName}
                  </p>
                </div>
              </div>
            ))}
            {duties.map((d) => {
              const who = all.find((p) => p.id === d.assignee_id);
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5"
                >
                  {who ? (
                    <Avatar name={who.display_name} color={who.color} size="sm" />
                  ) : (
                    <Car className="h-5 w-5 text-neutral-300" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {d.label}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {who ? who.display_name : "Unassigned"} · pickup/duty
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {upcomingEvents.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Later this week
            </p>
            <div className="space-y-1.5">
              {upcomingEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2.5 px-1 text-sm"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: e.ownerColor }}
                  />
                  <span className="truncate text-neutral-700">{e.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-neutral-400">
                    {format(parseISO(e.start), "EEE")}
                    {!e.allDay && ` ${format(parseISO(e.start), "h:mm a")}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* My to-dos */}
      <Section
        title="Your to-dos"
        icon={CheckSquare}
        href="/todos"
        actionLabel="All"
      >
        {myTodos.length === 0 ? (
          <p className="px-1 py-2 text-sm text-neutral-400">
            You&apos;re all caught up.
          </p>
        ) : (
          <div className="space-y-2">
            {myTodos.slice(0, 4).map((t) => (
              <TodoRow key={t.id} todo={t} profiles={all} />
            ))}
            {myTodos.length > 4 && (
              <Link
                href="/todos"
                className="block px-1 pt-1 text-sm font-medium text-neutral-400 hover:text-neutral-700"
              >
                +{myTodos.length - 4} more
              </Link>
            )}
          </div>
        )}
      </Section>

      {/* Chores due */}
      {dueChores.length > 0 && (
        <Section
          title="Chores due"
          icon={Repeat}
          href="/chores"
          actionLabel="All"
        >
          <div className="space-y-2">
            {dueChores.slice(0, 3).map((c) => (
              <ChoreRow key={c.id} chore={c} profiles={all} />
            ))}
          </div>
        </Section>
      )}

      {/* Budget snapshot */}
      <Section
        title={`${monthLabel(month)} budget`}
        icon={Wallet}
        href="/budget"
        actionLabel="Details"
      >
        {budgetCol ? (
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Revenue"
              value={budgetCol.totalRevenue / 100}
              tone="emerald"
            />
            <Stat
              label="Expenses"
              value={budgetCol.totalExpenses / 100}
              tone="red"
            />
            <Stat
              label="Remaining"
              value={budgetCol.remainingBalance / 100}
              tone={budgetCol.remainingBalance >= 0 ? "emerald" : "red"}
            />
          </div>
        ) : (
          <Link
            href="/budget"
            className="block rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-5 text-center text-sm text-neutral-500 hover:border-neutral-400"
          >
            Set up your budget forecast →
          </Link>
        )}
      </Section>

      {/* Goals needing attention */}
      {goals.length > 0 && (
        <Section title="Goals" icon={Target} href="/goals" actionLabel="All">
          {staleGoals.length > 0 ? (
            <div className="space-y-2">
              {staleGoals.slice(0, 2).map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5"
                >
                  <p className="text-sm font-medium text-neutral-800">
                    {g.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-500">
                    <Clock className="h-3 w-3" />
                    No update in {timeAgo(g.updated_at)} — worth a check-in?
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-1 py-2 text-sm text-neutral-400">
              {goals.length} goal{goals.length > 1 ? "s" : ""} in progress. Keep going.
            </p>
          )}
        </Section>
      )}
    </div>
  );
}

function QuickChip({
  href,
  icon: Icon,
  label,
  value,
  highlight,
}: {
  href: string;
  icon: typeof CheckSquare;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-2xl border px-3.5 py-2.5",
        highlight
          ? "border-amber-200 bg-amber-50"
          : "border-neutral-200 bg-white",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          highlight ? "text-amber-500" : "text-neutral-400",
        )}
      />
      <div>
        <p className="text-lg font-semibold leading-none text-neutral-900">
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-neutral-400">{label}</p>
      </div>
    </Link>
  );
}

function Section({
  title,
  icon: Icon,
  href,
  actionLabel,
  children,
}: {
  title: string;
  icon: typeof CheckSquare;
  href: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-neutral-400 transition hover:text-neutral-700"
        >
          {actionLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  signed,
}: {
  label: string;
  value: number;
  tone: "emerald" | "neutral" | "red";
  signed?: boolean;
}) {
  const color = {
    emerald: "text-emerald-600",
    neutral: "text-neutral-900",
    red: "text-red-600",
  }[tone];
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3">
      <p className="text-[11px] text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-base font-semibold tabular-nums ${color}`}>
        {signed && value >= 0 ? "+" : ""}
        {formatCurrency(value)}
      </p>
    </div>
  );
}
