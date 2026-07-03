import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Car } from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { DutyRow } from "./DutyRow";
import { DutyAdd } from "./DutyAdd";
import type { PickupDuty } from "@/lib/types";

export const metadata = { title: "Pickups" };

export default async function DutiesPage() {
  const supabase = await createClient();
  const profiles = await getProfiles();

  const { data } = await supabase
    .from("pickup_duties")
    .select("*")
    .order("day_of_week", { ascending: true });

  const duties = (data ?? []) as PickupDuty[];
  const todayDow = new Date().getDay();

  return (
    <div>
      <PageHeader
        title="Pickups & duties"
        subtitle="Who's covering what, which day."
      />
      {duties.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No duties scheduled"
          description="Add recurring pickup/drop-off logistics with the + button."
        />
      ) : (
        <div className="space-y-5">
          {DAYS_OF_WEEK.map((day, i) => {
            const dayDuties = duties.filter((d) => d.day_of_week === i);
            if (dayDuties.length === 0) return null;
            return (
              <div key={day}>
                <h2
                  className={
                    "mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide " +
                    (i === todayDow ? "text-neutral-900" : "text-neutral-400")
                  }
                >
                  {day}
                  {i === todayDow && (
                    <span className="ml-2 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white">
                      Today
                    </span>
                  )}
                </h2>
                <div className="space-y-2">
                  {dayDuties.map((d) => (
                    <DutyRow key={d.id} duty={d} profiles={profiles} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <DutyAdd profiles={profiles} />
    </div>
  );
}
