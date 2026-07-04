"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";
import { Home, Loader2, MailCheck } from "lucide-react";

type Mode = "password" | "magic";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  function friendlyError(raw: string): string {
    const m = raw.toLowerCase();
    if (m.includes("invalid login credentials")) {
      return "Wrong email or password.";
    }
    if (m.includes("signups not allowed") || m.includes("not found")) {
      return "That email isn't set up for Home Hub.";
    }
    if (m.includes("rate limit")) {
      return "Too many email requests — try password sign-in, or wait a bit.";
    }
    return raw;
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(friendlyError(error.message));
      return;
    }

    // Full navigation so the server picks up the fresh session cookie.
    window.location.assign("/");
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // No public signup: accounts are provisioned once for the two members.
        shouldCreateUser: false,
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(friendlyError(error.message));
      return;
    }

    setStatus("sent");
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setMessage(null);
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <Home className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Your household, in one calm place.
          </p>
        </div>

        {status === "sent" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <MailCheck className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
            <h2 className="text-base font-medium text-neutral-900">
              Check your email
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              We sent a sign-in link to{" "}
              <span className="font-medium text-neutral-700">{email}</span>.
              Open it on this device to stay signed in.
            </p>
            <button
              onClick={() => switchMode("password")}
              className="mt-4 text-sm font-medium text-neutral-500 underline underline-offset-4"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form
            onSubmit={mode === "password" ? handlePassword : handleMagic}
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            />

            {mode === "password" && (
              <>
                <label
                  htmlFor="password"
                  className="mb-1.5 mt-4 block text-sm font-medium text-neutral-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
                />
              </>
            )}

            {message && (
              <p className="mt-2 text-sm text-red-600">{message}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-60"
            >
              {status === "sending" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  {mode === "password" ? "Signing in…" : "Sending…"}
                </>
              ) : mode === "password" ? (
                "Sign in"
              ) : (
                "Send magic link"
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                switchMode(mode === "password" ? "magic" : "password")
              }
              className="mt-3 w-full text-center text-sm font-medium text-neutral-500 underline underline-offset-4"
            >
              {mode === "password"
                ? "Email me a magic link instead"
                : "Sign in with a password instead"}
            </button>

            <p className="mt-3 text-center text-xs text-neutral-400">
              Private household app. Sign-in is limited to invited members.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
