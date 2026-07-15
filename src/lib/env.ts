/**
 * Whether the core Supabase environment is present and non-placeholder.
 * NOTE: NEXT_PUBLIC_* vars are inlined at build time, so this reflects the
 * values that existed when the app was built/deployed.
 */
export function supabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("placeholder") &&
      !key.includes("placeholder"),
  );
}

/**
 * The app's base URL, with any trailing slash(es) stripped so callers can
 * safely append paths like `/auth/callback` without producing `//auth/...`.
 * Falls back to the provided value (e.g. the browser origin) when
 * NEXT_PUBLIC_SITE_URL is unset.
 */
export function resolveSiteUrl(fallback = ""): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || fallback;
  return raw.replace(/\/+$/, "");
}
