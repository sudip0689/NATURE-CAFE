import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";

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
      <header>
        <Link href="/owner/products" className="text-sm text-ink-500 hover:text-ink-900">
          ← Products
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900">
          Add item
        </h1>
      </header>

      <ProductForm categories={categories ?? []} />
    </div>
  );
}
