import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { GroceryBoard } from "./GroceryBoard";
import type { GroceryItem } from "@/lib/types";

export const metadata = { title: "Grocery" };

export default async function GroceryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grocery_items")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Grocery"
        subtitle="Quick-add and check off as you shop."
      />
      <GroceryBoard items={(data ?? []) as GroceryItem[]} />
    </div>
  );
}
