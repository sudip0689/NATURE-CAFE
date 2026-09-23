import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/states";
import { ProductRow, type ProductRowData } from "./product-row";
import { HeaderAction, PageHeader } from "@/components/shell/page";

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
      // Capped like the bills list, and disclosed below when it bites. The
      // till deliberately has no cap: an item missing from /pos cannot be
      // sold, which is a worse failure than a long management page.
      let query = supabase
        .from("products")
        .select("id, name, price, image_url, is_active, categories(name)")
        .order("name")
        .limit(500);

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
      <PageHeader
        title="Food Items"
        description="Prices set here are the only prices the till can charge."
        action={<HeaderAction href="/owner/products/new">+ Add</HeaderAction>}
      />

      {/* Plain GET form: filtering survives a reload, is linkable, no JS. */}
      <form className="mb-4 flex flex-wrap items-end gap-2" role="search">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-meta font-medium text-brandmuted">
            Search
          </span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Chicken Roll"
            className="h-11 w-full rounded-xl border border-brandline bg-white px-3 text-[0.85rem] text-brandink placeholder:text-brandmuted/60 focus:border-leaf focus:outline-none"
          />
        </label>

        <label className="min-w-0 flex-1 min-[420px]:max-w-[9rem]">
          <span className="mb-1 block text-meta font-medium text-brandmuted">
            Category
          </span>
          <select
            name="category"
            defaultValue={category}
            className="h-11 w-full rounded-xl border border-brandline bg-white px-2 text-[0.85rem] text-brandink focus:border-leaf focus:outline-none"
          >
            <option value="">All</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="h-11 shrink-0 rounded-full bg-forest px-4 text-sm font-semibold text-white transition-colors hover:bg-leaf"
        >
          Filter
        </button>

        {filtering ? (
          <Link
            href="/owner/products"
            className="flex h-11 shrink-0 items-center rounded-full border border-brandline px-4 text-sm font-medium text-brandmuted transition-colors hover:bg-mint hover:text-forest"
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
                className="inline-flex min-h-touch items-center rounded-control bg-forest px-5 text-base font-medium text-white hover:bg-leaf"
              >
                Add item
              </Link>
            }
          />
        )
      ) : (
        <>
          <p className="text-sm text-brandmuted">
            {products.length === 1 ? "1 item" : `${products.length} items`}
            {products.length === 500 ? " (first 500 — narrow the search)" : ""}
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
