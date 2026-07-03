import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Emails allowed to sign in (the two household members). */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string) {
  const list = allowedEmails();
  // If no allowlist configured, fail closed rather than open.
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}

/** Returns the current auth user or null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Redirects to /login unless authenticated. Returns the user. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Current user's profile (creates none — trigger handles that). */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
}

/** All household profiles (both members), ordered by creation. */
export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as Profile[];
}

/** Convenience: current profile + all profiles + the "other" member. */
export async function getHousehold() {
  const [me, all] = await Promise.all([getCurrentProfile(), getProfiles()]);
  const partner = all.find((p) => p.id !== me?.id) ?? null;
  return { me, all, partner };
}
