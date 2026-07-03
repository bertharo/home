import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { oauthClient, GOOGLE_SCOPES, googleConfigured } from "@/lib/google";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  if (!googleConfigured()) {
    return NextResponse.redirect(`${origin}/calendar?error=not-configured`);
  }

  const url = oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh_token every time
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
  });

  return NextResponse.redirect(url);
}
