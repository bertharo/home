"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, getMyHouseholdId } from "@/lib/auth";

/** Per-household avatar palette, assigned in join order. */
const HOUSEHOLD_COLORS = [
  "#2563eb", // blue
  "#db2777", // pink
  "#16a34a", // green
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
];

function colorForIndex(i: number) {
  return HOUSEHOLD_COLORS[i % HOUSEHOLD_COLORS.length];
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

/**
 * Create a brand-new household and make the caller its owner + first member.
 */
export async function createHousehold(formData: FormData) {
  const { supabase, userId } = await requireUserId();

  const name = String(formData.get("name") ?? "").trim() || "Our Home";
  const displayName = String(formData.get("display_name") ?? "").trim();

  const { data: household, error } = await supabase
    .from("households")
    .insert({ name, created_by: userId })
    .select("id")
    .single();

  if (error || !household) {
    throw new Error(error?.message ?? "Could not create household");
  }

  const patch: Record<string, unknown> = {
    household_id: household.id,
    color: colorForIndex(0),
  };
  if (displayName) patch.display_name = displayName;

  await supabase.from("profiles").update(patch).eq("id", userId);

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Accept an invite by token and join the referenced household. Runs with the
 * service role because the invitee isn't a member yet (RLS would hide the row).
 */
export async function acceptInvite(
  token: string,
): Promise<{ error: string } | void> {
  const { userId } = await requireUserId();
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return { error: "This invite link is invalid." };
  if (invite.accepted_at) return { error: "This invite has already been used." };
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: "This invite link has expired." };
  }

  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("household_id", invite.household_id);

  await admin
    .from("profiles")
    .update({
      household_id: invite.household_id,
      color: colorForIndex(count ?? 1),
    })
    .eq("id", userId);

  await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq("id", invite.id);

  revalidatePath("/", "layout");
  redirect("/");
}

/** Create an invite for the caller's household and return the shareable link. */
export async function createInvite(
  email?: string | null,
): Promise<{ token: string }> {
  const { supabase } = await requireUserId();
  const householdId = await getMyHouseholdId();
  if (!householdId) throw new Error("Join or create a household first.");

  const me = await getCurrentProfile();

  const { data, error } = await supabase
    .from("invites")
    .insert({
      household_id: householdId,
      email: email?.trim() || null,
      invited_by: me?.id ?? null,
    })
    .select("token")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create invite");

  revalidatePath("/household");
  return { token: data.token };
}

export async function revokeInvite(id: string) {
  const { supabase } = await requireUserId();
  await supabase.from("invites").delete().eq("id", id);
  revalidatePath("/household");
}

export async function renameHousehold(formData: FormData) {
  const { supabase } = await requireUserId();
  const householdId = await getMyHouseholdId();
  if (!householdId) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("households").update({ name }).eq("id", householdId);
  revalidatePath("/household");
  revalidatePath("/", "layout");
}

/** Leave the current household (clears household_id; data stays for others). */
export async function leaveHousehold() {
  const { supabase, userId } = await requireUserId();
  await supabase
    .from("profiles")
    .update({ household_id: null })
    .eq("id", userId);
  revalidatePath("/", "layout");
  redirect("/welcome");
}
