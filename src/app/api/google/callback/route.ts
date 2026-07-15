import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { google } from "googleapis";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { oauthClient, HOUSEHOLD_EVENTS_TAG } from "@/lib/google";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);
  if (!code) return NextResponse.redirect(`${origin}/calendar?error=oauth`);

  try {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Look up the connected Google account's email.
    let googleEmail: string | null = null;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const info = await oauth2.userinfo.get();
      googleEmail = info.data.email ?? null;
    } catch {
      // non-fatal
    }

    if (!tokens.refresh_token) {
      // Without a refresh token we can't sync long-term.
      return NextResponse.redirect(`${origin}/calendar?error=no-refresh`);
    }

    const supabase = await createClient();
    await supabase.from("google_accounts").upsert(
      {
        user_id: user.id,
        google_email: googleEmail,
        access_token: tokens.access_token ?? "",
        refresh_token: tokens.refresh_token,
        expiry: new Date(tokens.expiry_date ?? Date.now() + 3600_000).toISOString(),
        calendar_id: "primary",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    revalidateTag(HOUSEHOLD_EVENTS_TAG, { expire: 0 });
    return NextResponse.redirect(`${origin}/calendar?connected=1`);
  } catch {
    return NextResponse.redirect(`${origin}/calendar?error=oauth`);
  }
}
