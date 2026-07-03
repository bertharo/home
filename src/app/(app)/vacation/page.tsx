import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { VacationBoard } from "./VacationBoard";
import type { VacationIdeaFull } from "@/lib/types";

export const metadata = { title: "Trips" };

export default async function VacationPage() {
  const supabase = await createClient();
  const profiles = await getProfiles();

  const { data } = await supabase
    .from("vacation_ideas")
    .select("*, vacation_links(*), vacation_photos(*)")
    .order("created_at", { ascending: false });

  const ideas = (data ?? []) as VacationIdeaFull[];

  return (
    <div>
      <PageHeader
        title="Trip ideas"
        subtitle="A shared board so ideas don't get lost."
      />
      <VacationBoard ideas={ideas} profiles={profiles} />
    </div>
  );
}
