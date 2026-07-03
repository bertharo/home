"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

/** assignee form value -> { assignee_id, for_both } */
function resolveAssignee(value: string | null) {
  if (value === "both") return { assignee_id: null, for_both: true };
  if (!value) return { assignee_id: null, for_both: false };
  return { assignee_id: value, for_both: false };
}

export async function createTodo(formData: FormData) {
  const { supabase, userId } = await currentUserId();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const notes = String(formData.get("notes") ?? "").trim() || null;
  const due_date = String(formData.get("due_date") ?? "") || null;
  const { assignee_id, for_both } = resolveAssignee(
    formData.get("assignee") as string | null,
  );

  await supabase.from("todos").insert({
    title,
    notes,
    due_date,
    assignee_id,
    for_both,
    created_by: userId,
  });

  revalidatePath("/todos");
  revalidatePath("/");
}

export async function toggleTodo(id: string, done: boolean) {
  const { supabase } = await currentUserId();
  await supabase
    .from("todos")
    .update({
      status: done ? "done" : "open",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidatePath("/todos");
  revalidatePath("/");
}

export async function updateTodo(id: string, formData: FormData) {
  const { supabase } = await currentUserId();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const due_date = String(formData.get("due_date") ?? "") || null;
  const { assignee_id, for_both } = resolveAssignee(
    formData.get("assignee") as string | null,
  );

  await supabase
    .from("todos")
    .update({ title, notes, due_date, assignee_id, for_both })
    .eq("id", id);

  revalidatePath("/todos");
  revalidatePath("/");
}

export async function deleteTodo(id: string) {
  const { supabase } = await currentUserId();
  await supabase.from("todos").delete().eq("id", id);
  revalidatePath("/todos");
  revalidatePath("/");
}
