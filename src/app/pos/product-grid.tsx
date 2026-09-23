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
  selectedIds,
  onToggle,
}: {
  products: PosProduct[];
  /**
   * Which products are in the order. Deliberately not the quantities: the
   * grid picks *what* is being sold, the order panel decides *how many*.
   */
  selectedIds: ReadonlySet<string>;
  onToggle: (product: PosProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-brandline px-6 py-16 text-center">
        <p className="font-display text-lg font-semibold text-brandink">
          Nothing here
        </p>
        <p className="mt-1 text-brandmuted">
          Try another search, or a different category.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => {
        const selected = selectedIds.has(product.id);

        return (
          <li key={product.id}>
            {/* The whole card is the button. At a counter you aim for the
                picture, not a 24px "+" in its corner.
                aria-pressed, because this is a toggle: tapping again takes the
                item back off the order rather than adding another one. */}
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(product)}
              className={cn(
                "group relative flex h-full w-full flex-col overflow-hidden rounded-card border text-left",
                "transition-colors duration-150 touch-manipulation",
                selected
                  ? "border-leaf bg-mint"
                  : "border-brandline bg-white hover:border-brandline hover:bg-ivory",
              )}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-mint">
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
                    className="flex size-full items-center justify-center font-display text-3xl font-semibold text-caramel"
                  >
                    {product.name.slice(0, 1).toUpperCase()}
                  </span>
                )}

              </div>

              <div className="flex flex-1 flex-col justify-between gap-1 p-3">
                <p className="line-clamp-2 font-medium leading-snug text-brandink">
                  {product.name}
                </p>
                <p className="tabular text-lg font-semibold text-forest">
                  {formatMoneyCompact(product.price)}
                </p>
              </div>

              {/* aria-pressed already announces the state; this says what the
                  next tap will do, which is the part a badge used to imply. */}
              <span className="sr-only">
                {selected
                  ? `${product.name} is on the order. Tap to take it off.`
                  : `Add ${product.name} to the order`}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
