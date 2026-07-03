import Link from "next/link";
import { ChevronLeft, ChevronRight, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GoalCard } from "./GoalCard";
import { GoalAdd } from "./GoalAdd";
import type { Goal } from "@/lib/types";

export const metadata = { title: "Goals" };

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>;
}) {
  const sp = await searchParams;
  const thisYear = new Date().getFullYear();
  const year = sp.y && /^\d{4}$/.test(sp.y) ? Number(sp.y) : thisYear;

  const supabase = await createClient();
  const profiles = await getProfiles();

  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("year", year)
    .order("updated_at", { ascending: false });

  const goals = (data ?? []) as Goal[];
  const joint = goals.filter((g) => g.kind === "joint");
  const individual = goals.filter((g) => g.kind === "individual");

  const done = goals.filter((g) => g.status === "done").length;

  return (
    <div>
      <PageHeader
        title="Goals"
        subtitle={
          goals.length > 0
            ? `${done} of ${goals.length} done this year`
            : "What you're working toward this year."
        }
      />

      <div className="mb-5 flex items-center justify-center gap-2">
        <Link
          href={`/goals?y=${year - 1}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="min-w-[4rem] text-center text-base font-semibold text-neutral-900">
          {year}
        </span>
        <Link
          href={`/goals?y=${year + 1}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title={`No goals for ${year} yet`}
          description="Add the goals you set together and track them all year."
        />
      ) : (
        <div className="space-y-6">
          {joint.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Together
              </h2>
              <div className="space-y-3">
                {joint.map((g) => (
                  <GoalCard key={g.id} goal={g} profiles={profiles} />
                ))}
              </div>
            </section>
          )}
          {individual.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Individual
              </h2>
              <div className="space-y-3">
                {individual.map((g) => (
                  <GoalCard key={g.id} goal={g} profiles={profiles} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <GoalAdd profiles={profiles} year={year} />
    </div>
  );
}
