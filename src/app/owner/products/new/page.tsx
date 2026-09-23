
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";
import { PageHeader } from "@/components/shell/page";

export const metadata = { title: "Add item · Nature Caffe" };

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Add item" back={{ href: "/owner/products", label: "Food Items" }} />

      <ProductForm categories={categories ?? []} />
    </div>
  );
}
