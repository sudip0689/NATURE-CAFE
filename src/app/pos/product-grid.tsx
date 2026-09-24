"use client";

import { formatMoneyCompact } from "@/lib/money";
import { CheckIcon, CutleryIcon } from "@/components/icons";
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
                "group relative flex h-full w-full flex-col overflow-hidden rounded-card text-left",
                "transition-all duration-150 touch-manipulation",
                // The border width never changes. Selecting used to swap it
                // from 1px to 2px, which with border-box shrank the image well
                // by 2px — the picture nudged every time a card was tapped.
                "border border-brandline",
                selected
                  ? // Three signals at once, because one thin border was not
                    // readable at a glance on a phone at counter distance: a
                    // leaf ring, a tinted card, and lifted elevation. The ring
                    // is a box-shadow, so it costs no layout.
                    "bg-mint ring-2 ring-inset ring-leaf shadow-[0_4px_14px_rgba(31,138,76,0.22)]"
                  : "bg-white hover:bg-ivory",
              )}
            >
              {/* A fixed 4:3 well, the same on every card and identical
                  whether the card is selected — the photo never decides the
                  card's height. bg-mint rather than transparent so an image
                  with an alpha channel lands on the brand tint instead of
                  whatever is behind it. */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-mint">
                {product.image_url ? (
                  // object-contain, not cover: a whole chicken leg the cashier
                  // can recognise beats a tightly cropped piece of one.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt=""
                    className="size-full object-contain p-2"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  // A quiet cutlery mark, not a giant letter. Same well, same
                  // height, so a menu with photos and one without still line up.
                  <span
                    aria-hidden="true"
                    className="flex size-full items-center justify-center"
                  >
                    <CutleryIcon className="size-8 text-leaf/35" />
                  </span>
                )}

                {/* The tick sits on the image, top-right, in a filled circle
                    with a white ring so it holds up over a dark photo. */}
                {selected ? (
                  <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-forest text-white shadow-[0_1px_4px_rgba(0,0,0,0.25)] ring-2 ring-white">
                    <CheckIcon className="size-4" />
                  </span>
                ) : null}
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
