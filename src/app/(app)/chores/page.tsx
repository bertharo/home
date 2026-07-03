import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Repeat } from "lucide-react";
import { ChoreRow } from "./ChoreRow";
import { ChoreAdd } from "./ChoreAdd";
import type { Chore } from "@/lib/types";

export const metadata = { title: "Chores" };

export default async function ChoresPage() {
  const supabase = await createClient();
  const profiles = await getProfiles();

  const { data } = await supabase
    .from("chores")
    .select("*")
    .order("next_due", { ascending: true, nullsFirst: false });

  const chores = (data ?? []) as Chore[];

  return (
    <div>
      <PageHeader
        title="Chores"
        subtitle="Recurring tasks — mark done to reschedule and rotate."
      />
      {chores.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No chores yet"
          description="Add recurring tasks like dishes or trash with the + button."
        />
      ) : (
        <div className="space-y-2">
          {chores.map((c) => (
            <ChoreRow key={c.id} chore={c} profiles={profiles} />
          ))}
        </div>
      )}
      <ChoreAdd profiles={profiles} />
    </div>
  );
}
