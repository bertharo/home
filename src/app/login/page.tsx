"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";
import { Home, Loader2, MailCheck } from "lucide-react";

type Mode = "password" | "signup" | "magic";

function nextTarget(): string {
  if (typeof window === "undefined") return "/";
  const n = new URLSearchParams(window.location.search).get("next");
  // Only allow same-site relative paths.
  return n && n.startsWith("/") ? n : "/";
}

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
    if (m.includes("already registered") || m.includes("already been registered")) {
      return "That email already has an account — try signing in.";
    }
    if (m.includes("password") && m.includes("least")) {
      return "Password must be at least 6 characters.";
    }
    if (m.includes("signups not allowed")) {
      return "Sign-ups are currently disabled for this app.";
    }
    if (m.includes("rate limit")) {
      return "Too many requests — please wait a bit and try again.";
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
    window.location.assign(nextTarget());
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const next = nextTarget();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(friendlyError(error.message));
      return;
    }

    // If email confirmation is on, there's no session yet -> tell them to check
    // their inbox. Otherwise they're signed in and can continue.
    if (data.session) {
      window.location.assign(next);
    } else {
      setStatus("sent");
    }
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const next = nextTarget();

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
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

  const onSubmit =
    mode === "password"
      ? handlePassword
      : mode === "signup"
        ? handleSignup
        : handleMagic;

  const submitLabel =
    mode === "password"
      ? "Sign in"
      : mode === "signup"
        ? "Create account"
        : "Send magic link";

  const sendingLabel = mode === "magic" ? "Sending…" : "Working…";

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
              We sent a link to{" "}
              <span className="font-medium text-neutral-700">{email}</span>.
              Open it on this device to continue.
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
            onSubmit={onSubmit}
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

            {mode !== "magic" && (
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
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
                />
                {mode === "signup" && (
                  <p className="mt-1.5 text-xs text-neutral-400">
                    At least 6 characters.
                  </p>
                )}
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
                  <Loader2 className="h-4 w-4 animate-spin" /> {sendingLabel}
                </>
              ) : (
                submitLabel
              )}
            </button>

            <div className="mt-4 space-y-2 text-center">
              {mode === "password" ? (
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="block w-full text-sm font-medium text-neutral-700 underline underline-offset-4"
                >
                  New here? Create an account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchMode("password")}
                  className="block w-full text-sm font-medium text-neutral-700 underline underline-offset-4"
                >
                  Already have an account? Sign in
                </button>
              )}

              <button
                type="button"
                onClick={() => switchMode(mode === "magic" ? "password" : "magic")}
                className="block w-full text-sm font-medium text-neutral-400 underline underline-offset-4"
              >
                {mode === "magic"
                  ? "Use a password instead"
                  : "Email me a magic link instead"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
