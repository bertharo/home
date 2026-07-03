import { createClient } from "@/lib/supabase/server";
import { getHousehold } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { TodoList } from "./TodoList";
import { TodoAdd } from "./TodoAdd";
import type { Todo } from "@/lib/types";

export const metadata = { title: "To-dos" };

export default async function TodosPage() {
  const supabase = await createClient();
  const { me, all } = await getHousehold();

  const { data } = await supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false });

  const todos = (data ?? []) as Todo[];

  return (
    <div>
      <PageHeader
        title="To-dos"
        subtitle="Shared list — assign to either of you or both."
      />
      <TodoList todos={todos} profiles={all} meId={me?.id ?? null} />
      <TodoAdd profiles={all} />
    </div>
  );
}
