import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../../product-form";
import { PageHeader } from "@/components/shell/page";

export const metadata = { title: "Edit item · Nature Caffe" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category_id, price, image_url, is_active")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Edit item"
        description="Price changes affect new bills only — past receipts keep what was charged."
        back={{ href: "/owner/products", label: "Food Items" }}
      />

      <ProductForm categories={categories ?? []} product={product} />
    </div>
  );
}
