"use client";

import { formatMoneyCompact } from "@/lib/money";
import { cn } from "@/lib/cn";

export interface PosProduct {
  id: string;
  name: string;
  price: string;
  image_url: string | null;
  category_id: string | null;
}

export function ProductGrid({
  products,
  quantities,
  onAdd,
}: {
  products: PosProduct[];
  /** productId -> quantity already in the cart, for the corner badge. */
  quantities: Record<string, number>;
  onAdd: (product: PosProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-cream-300 px-6 py-16 text-center">
        <p className="font-display text-lg font-semibold text-ink-900">
          Nothing here
        </p>
        <p className="mt-1 text-ink-500">
          Try another search, or a different category.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => {
        const inCart = quantities[product.id] ?? 0;

        return (
          <li key={product.id}>
            {/* The whole card is the button. At a counter you aim for the
                picture, not a 24px "+" in its corner. */}
            <button
              type="button"
              onClick={() => onAdd(product)}
              className={cn(
                "group relative flex h-full w-full flex-col overflow-hidden rounded-card border text-left",
                "transition-colors duration-150 touch-manipulation",
                inCart > 0
                  ? "border-bean-500 bg-bean-50"
                  : "border-cream-300 bg-cream-50 hover:border-bean-300 hover:bg-cream-100",
              )}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-bean-100">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex size-full items-center justify-center font-display text-3xl font-semibold text-bean-400"
                  >
                    {product.name.slice(0, 1).toUpperCase()}
                  </span>
                )}

                {inCart > 0 ? (
                  <span className="tabular absolute right-2 top-2 inline-flex min-w-7 items-center justify-center rounded-full bg-bean-700 px-2 py-0.5 text-sm font-semibold text-cream-50">
                    {inCart}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col justify-between gap-1 p-3">
                <p className="line-clamp-2 font-medium leading-snug text-ink-900">
                  {product.name}
                </p>
                <p className="tabular text-lg font-semibold text-bean-800">
                  {formatMoneyCompact(product.price)}
                </p>
              </div>

              <span className="sr-only">
                Add {product.name} to the order
                {inCart > 0 ? `, ${inCart} already added` : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
