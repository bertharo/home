import Link from "next/link";
import { Home } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/lib/actions/session";
import type { Profile } from "@/lib/types";
import { LogOut } from "lucide-react";

export function MobileTopBar({ me }: { me: Profile | null }) {
  return (
    <header className="safe-top sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-neutral-50/90 px-4 py-3 backdrop-blur-md sm:hidden">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
          <Home className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
      </Link>
      {me && (
        <div className="flex items-center gap-1.5">
          <Link
            href="/household"
            className="rounded-full transition active:opacity-70"
            aria-label="Household settings"
          >
            <Avatar name={me.display_name} color={me.color} size="sm" />
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition active:bg-neutral-100"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
