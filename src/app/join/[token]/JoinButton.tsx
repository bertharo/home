"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { acceptInvite } from "@/lib/actions/household";

export function JoinButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await acceptInvite(token);
            if (res?.error) setError(res.error);
          })
        }
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Joining…
          </>
        ) : (
          "Accept invite"
        )}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
