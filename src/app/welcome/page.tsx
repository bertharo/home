import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import { requireUser, getCurrentProfile } from "@/lib/auth";
import { createHousehold } from "@/lib/actions/household";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  await requireUser();
  const me = await getCurrentProfile();

  // Already in a household — nothing to set up.
  if (me?.household_id) redirect("/");

  const defaultName = me?.display_name
    ? `${me.display_name}'s Home`
    : "Our Home";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <Home className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Set up your {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Name your household. You can invite others once you&apos;re in.
          </p>
        </div>

        <form
          action={createHousehold}
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <label
            htmlFor="display_name"
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            Your name
          </label>
          <input
            id="display_name"
            name="display_name"
            defaultValue={me?.display_name ?? ""}
            placeholder="e.g. Alex"
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
          />

          <label
            htmlFor="name"
            className="mb-1.5 mt-4 block text-sm font-medium text-neutral-700"
          >
            Household name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={defaultName}
            placeholder="Our Home"
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
          />

          <button
            type="submit"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-base font-medium text-white transition active:scale-[0.99]"
          >
            Create household
          </button>
        </form>
      </div>
    </main>
  );
}
