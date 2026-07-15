import Link from "next/link";
import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import { getUser, getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_NAME } from "@/lib/constants";
import { JoinButton } from "./JoinButton";

export const metadata = { title: "Join a household" };

function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() < Date.now();
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("invites")
    .select("id, household_id, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  let household: { name: string } | null = null;
  if (invite) {
    const { data } = await admin
      .from("households")
      .select("name")
      .eq("id", invite.household_id)
      .maybeSingle();
    household = data;
  }

  const expired = invite ? isExpired(invite.expires_at) : false;
  const used = Boolean(invite?.accepted_at);
  const invalid = !invite || expired || used;

  const user = await getUser();
  const me = user ? await getCurrentProfile() : null;

  // Already a member of some household — send them home.
  if (me?.household_id) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <Home className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {invalid
              ? "Invite unavailable"
              : `Join ${household?.name ?? "a household"}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {invalid
              ? used
                ? "This invite has already been used."
                : expired
                  ? "This invite link has expired. Ask for a new one."
                  : "This invite link is invalid."
              : `You've been invited to share this ${APP_NAME} household.`}
          </p>
        </div>

        {!invalid && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            {user ? (
              <JoinButton token={token} />
            ) : (
              <>
                <p className="mb-4 text-sm text-neutral-600">
                  Sign in or create an account to accept this invite.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99]"
                >
                  Continue
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
