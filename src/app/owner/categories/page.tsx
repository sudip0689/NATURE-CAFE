import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/states";
import { CategoryManager, type CategoryRowData } from "./category-manager";
import { PageHeader } from "@/components/shell/page";

export const metadata = { title: "Categories · Nature Caffe" };

export default async function CategoriesPage() {
  const supabase = await createClient();

  // products(count) is a PostgREST embedded aggregate — one round trip instead
  // of a count query per category.
  const { data } = await supabase
    .from("categories")
    .select("id, name, is_active, sort_order, products(count)")
    .order("sort_order")
    .order("name");

  const categories: CategoryRowData[] = (data ?? []).map((row) => {
    const embedded = row.products as unknown as { count: number }[] | null;
    return {
      id: row.id,
      name: row.name,
      is_active: row.is_active,
      itemCount: embedded?.[0]?.count ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="These become the tabs at the till. Hiding one keeps its items and sales history."
      />

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          hint="Add one above — Coffee, Snacks, Rolls — and items can then be filed under it."
        />
      ) : (
        <CategoryManager categories={categories} />
      )}
    </div>
  );
}
