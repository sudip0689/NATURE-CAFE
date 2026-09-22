import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/states";
import { ProductRow, type ProductRowData } from "./product-row";

export const metadata = { title: "Products · Nature Caffe" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q = "", category = "" } = await searchParams;
  const supabase = await createClient();

  const [{ data: categories }, { data: rows }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order").order("name"),
    (() => {
      let query = supabase
        .from("products")
        .select("id, name, price, image_url, is_active, categories(name)")
        .order("name");

      // Escape PostgREST's pattern wildcards so a stray % doesn't match everything.
      if (q.trim()) query = query.ilike("name", `%${q.trim().replace(/[%_]/g, "")}%`);
      if (category) query = query.eq("category_id", category);

      return query;
    })(),
  ]);

  const products: ProductRowData[] = (rows ?? []).map((row) => {
    const embedded = row.categories as unknown as { name: string } | null;
    return {
      id: row.id,
      name: row.name,
      price: row.price,
      image_url: row.image_url,
      is_active: row.is_active,
      categoryName: embedded?.name ?? null,
    };
  });

  const filtering = Boolean(q.trim() || category);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900">
            Products
          </h1>
          <p className="mt-1 text-ink-500">
            Prices set here are the only prices the till can charge.
          </p>
        </div>
        <Link
          href="/owner/products/new"
          className="inline-flex min-h-touch items-center rounded-control bg-bean-600 px-5 text-base font-medium text-cream-50 hover:bg-bean-700"
        >
          Add item
        </Link>
      </header>

      {/* A plain GET form: filtering survives a reload and is linkable, and it
          needs no JavaScript at all. */}
      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <label htmlFor="q" className="block text-sm font-medium text-ink-700">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Chicken Roll"
            className="w-full min-h-touch rounded-control border border-cream-300 bg-cream-50 px-4 text-base text-ink-900 placeholder:text-ink-400 focus:border-bean-500 focus:outline-none"
          />
        </div>

        <div className="min-w-[10rem] space-y-1.5">
          <label htmlFor="category" className="block text-sm font-medium text-ink-700">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category}
            className="w-full min-h-touch rounded-control border border-cream-300 bg-cream-50 px-4 text-base text-ink-900 focus:border-bean-500 focus:outline-none"
          >
            <option value="">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex min-h-touch items-center rounded-control border border-cream-300 bg-cream-50 px-5 text-base font-medium text-ink-900 hover:bg-cream-100"
        >
          Filter
        </button>

        {filtering ? (
          <Link
            href="/owner/products"
            className="inline-flex min-h-touch items-center rounded-control px-4 text-base font-medium text-ink-700 hover:bg-cream-200"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {products.length === 0 ? (
        filtering ? (
          <EmptyState
            title="Nothing matches that"
            hint="Try a different spelling, or clear the filters."
          />
        ) : (
          <EmptyState
            title="No items on the menu yet"
            hint="Add the first one and it appears at the till straight away."
            action={
              <Link
                href="/owner/products/new"
                className="inline-flex min-h-touch items-center rounded-control bg-bean-600 px-5 text-base font-medium text-cream-50 hover:bg-bean-700"
              >
                Add item
              </Link>
            }
          />
        )
      ) : (
        <>
          <p className="text-sm text-ink-500">
            {products.length === 1 ? "1 item" : `${products.length} items`}
          </p>
          <ul className="space-y-3">
            {products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
