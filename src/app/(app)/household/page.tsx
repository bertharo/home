import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getMyHousehold, getProfiles } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Invite } from "@/lib/types";
import { HouseholdManager } from "./HouseholdManager";

export const metadata = { title: "Household" };

export default async function HouseholdPage() {
  const [me, household, members] = await Promise.all([
    getCurrentProfile(),
    getMyHousehold(),
    getProfiles(),
  ]);

  const supabase = await createClient();
  const { data: invitesData } = await supabase
    .from("invites")
    .select("*")
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  const invites = (invitesData ?? []) as Invite[];
  const isOwner = Boolean(
    me && household && household.created_by === me.id,
  );

  return (
    <div>
      <PageHeader
        title="Household"
        subtitle="Manage members and invite people to share your home."
      />
      <HouseholdManager
        household={household}
        members={members}
        meId={me?.id ?? null}
        isOwner={isOwner}
        invites={invites}
      />
    </div>
  );
}
