import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../../product-form";

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
      <header>
        <Link href="/owner/products" className="text-sm text-ink-500 hover:text-ink-900">
          ← Products
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900">
          Edit item
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Changing the price affects new bills only. Past receipts keep the price
          that was actually charged.
        </p>
      </header>

      <ProductForm categories={categories ?? []} product={product} />
    </div>
  );
}
