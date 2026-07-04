import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { supabaseConfigured } from "@/lib/env";

// Next.js 16 renamed the "middleware" convention to "proxy".
export async function proxy(request: NextRequest) {
  // If Supabase env vars are missing (or still placeholders), don't crash the
  // whole site — send everything to a friendly setup page instead of throwing.
  if (!supabaseConfigured()) {
    if (request.nextUrl.pathname === "/setup") return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    url.search = "";
    return NextResponse.redirect(url);
  }

  try {
    return await updateSession(request);
  } catch {
    // Never let a transient auth/edge error take down every route.
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon / icons / manifest / service worker
     * - image files
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon|apple-icon|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
