"use client";

import { useTransition } from "react";
import { Calendar, Check, AlertCircle, Link2Off } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { disconnectGoogle } from "./actions";
import type { Profile } from "@/lib/types";

export function CalendarConnect({
  configured,
  meConnected,
  connectedIds,
  profiles,
  justConnected,
  error,
}: {
  configured: boolean;
  meConnected: boolean;
  connectedIds: string[];
  profiles: Profile[];
  justConnected: boolean;
  error: string | null;
}) {
  const [pending, start] = useTransition();

  if (!configured) {
    return (
      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Google Calendar not configured yet</p>
          <p className="mt-0.5 text-amber-700">
            Add <code>GOOGLE_CLIENT_ID</code> and{" "}
            <code>GOOGLE_CLIENT_SECRET</code> to your environment to enable
            two-way sync. See the README.
          </p>
        </div>
      </div>
    );
  }

  const errorMessage =
    error === "no-refresh"
      ? "Google didn't return a refresh token. Remove Home from your Google account permissions and reconnect."
      : error === "not-configured"
        ? "Google Calendar isn't configured on the server yet."
        : error
          ? "Something went wrong connecting to Google."
          : null;

  return (
    <div className="mb-5 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-800">
              Google Calendar sync
            </p>
            <p className="text-xs text-neutral-400">
              {connectedIds.length} of {profiles.length} connected
            </p>
          </div>
        </div>

        {meConnected ? (
          <button
            onClick={() => start(() => disconnectGoogle())}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100"
          >
            <Link2Off className="h-4 w-4" />
            Disconnect
          </button>
        ) : (
          <a
            href="/api/google/connect"
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Connect mine
          </a>
        )}
      </div>

      {profiles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {profiles.map((p) => {
            const connected = connectedIds.includes(p.id);
            return (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-600 ring-1 ring-neutral-200"
              >
                <Avatar name={p.display_name} color={p.color} size="xs" />
                {p.display_name}
                {connected ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <span className="text-neutral-300">not connected</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {justConnected && (
        <p className="mt-2 text-xs text-emerald-600">
          Connected! Your events now show below.
        </p>
      )}
      {errorMessage && (
        <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
