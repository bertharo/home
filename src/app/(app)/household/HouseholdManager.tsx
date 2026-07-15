"use client";

import { useState, useTransition } from "react";
import { Check, Copy, LogOut, Mail, Plus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Household, Invite, Profile } from "@/lib/types";
import {
  createInvite,
  leaveHousehold,
  renameHousehold,
  revokeInvite,
} from "@/lib/actions/household";

function inviteUrl(token: string) {
  if (typeof window === "undefined") return `/join/${token}`;
  return `${window.location.origin}/join/${token}`;
}

export function HouseholdManager({
  household,
  members,
  meId,
  isOwner,
  invites,
}: {
  household: Household | null;
  members: Profile[];
  meId: string | null;
  isOwner: boolean;
  invites: Invite[];
}) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 1500);
    } catch {
      // clipboard blocked; the input is selectable as a fallback
    }
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const { token } = await createInvite(email || null);
      setNewLink(inviteUrl(token));
      setEmail("");
    });
  }

  return (
    <div className="space-y-6">
      {/* Household name */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">
          Household name
        </h2>
        <form
          action={renameHousehold}
          className="mt-3 flex items-center gap-2"
        >
          <input
            name="name"
            defaultValue={household?.name ?? ""}
            disabled={!isOwner}
            className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
          {isOwner && (
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          )}
        </form>
        {!isOwner && (
          <p className="mt-2 text-xs text-neutral-400">
            Only the household owner can rename it.
          </p>
        )}
      </section>

      {/* Members */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">
          Members ({members.length})
        </h2>
        <ul className="mt-3 space-y-2.5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <Avatar name={m.display_name} color={m.color} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800">
                  {m.display_name}
                  {m.id === meId && (
                    <span className="ml-1.5 text-xs font-normal text-neutral-400">
                      (you)
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-neutral-400">{m.email}</p>
              </div>
              {household?.created_by === m.id && (
                <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                  Owner
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Invites */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Invite people</h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          Create a link to share, or note an email for your own reference.
        </p>

        <form onSubmit={handleInvite} className="mt-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com (optional)"
              className="w-full rounded-xl border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Create link
          </button>
        </form>

        {newLink && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
            <input
              readOnly
              value={newLink}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 bg-transparent px-1 text-xs text-emerald-900 outline-none"
            />
            <button
              onClick={() => copy(newLink)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white"
            >
              {copied === newLink ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </div>
        )}

        {invites.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
            {invites.map((inv) => {
              const url = inviteUrl(inv.token);
              return (
                <li key={inv.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-700">
                      {inv.email ?? "Shareable link"}
                    </p>
                    <p className="truncate text-[11px] text-neutral-400">
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => copy(url)}
                    title="Copy link"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    {copied === url ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => start(() => revokeInvite(inv.id))}
                    title="Revoke invite"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Leave */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Leave household</h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          You&apos;ll stop seeing this household&apos;s data. Shared data stays
          for the other members.
        </p>
        <form action={leaveHousehold} className="mt-3">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Leave household
          </button>
        </form>
      </section>
    </div>
  );
}
