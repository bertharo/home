import { Home, AlertCircle } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: "Setup" };

const VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
];

export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
          <Home className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="mb-2 flex items-center gap-2 text-amber-700">
          <AlertCircle className="h-5 w-5" />
          <h1 className="text-base font-semibold">Almost there — needs configuration</h1>
        </div>
        <p className="text-sm text-amber-800">
          The app can&apos;t reach Supabase. Set these environment variables in
          your hosting provider (Vercel → Settings → Environment Variables) for
          the <strong>Production</strong> environment, then{" "}
          <strong>redeploy</strong>. The <code>NEXT_PUBLIC_*</code> values are
          baked in at build time, so a fresh deploy is required after adding
          them.
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {VARS.map((v) => (
          <li
            key={v}
            className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 font-mono text-sm text-neutral-700"
          >
            {v}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-neutral-500">
        See <code>README.md</code> for the full setup guide (schema, users, and
        Google Calendar). Once configured and redeployed, this page redirects to
        your dashboard automatically.
      </p>
    </main>
  );
}
