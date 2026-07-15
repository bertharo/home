import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Household, Profile } from "@/lib/types";

/** Emails allowed to sign in. Empty/unset => open signup (no allowlist). */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string) {
  const list = allowedEmails();
  // Public signup: if no allowlist is configured, anyone may sign up. Set
  // ALLOWED_EMAILS only if you want to restrict to specific addresses.
  if (list.length === 0) return true;
  return list.includes(email.trim().toLowerCase());
}

/** Returns the current auth user or null. Deduped per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Redirects to /login unless authenticated. Returns the user. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Current user's profile (creates none — trigger handles that). Deduped. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
});

/** The caller's household id, or null if they haven't onboarded yet. */
export const getMyHouseholdId = cache(async (): Promise<string | null> => {
  const me = await getCurrentProfile();
  return me?.household_id ?? null;
});

/** The caller's household record, or null. */
export const getMyHousehold = cache(async (): Promise<Household | null> => {
  const householdId = await getMyHouseholdId();
  if (!householdId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("households")
    .select("*")
    .eq("id", householdId)
    .maybeSingle();
  return data as Household | null;
});

/** All profiles in the caller's household (RLS scopes this automatically). */
export const getProfiles = cache(async (): Promise<Profile[]> => {
  const householdId = await getMyHouseholdId();
  if (!householdId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });
  return (data ?? []) as Profile[];
});

/** Convenience: current profile + all household profiles + the "other" member. */
export async function getHousehold() {
  const [me, all] = await Promise.all([getCurrentProfile(), getProfiles()]);
  const partner = all.find((p) => p.id !== me?.id) ?? null;
  return { me, all, partner };
}
