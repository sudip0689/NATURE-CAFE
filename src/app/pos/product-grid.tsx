"use client";

import { memo } from "react";

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

  // One column on a phone, two once there is room for two.
  //
  // A horizontal card and a two-column grid cannot both hold at 360px, and
  // the measurements are not close: two columns leave 41px for the product
  // name — about five characters — so "Chicken Leg (2 PCS)" renders as
  // "Chick Le…". A cashier who cannot read the name is worse off than one who
  // scrolls, so the second column waits until 480px, where the name has room
  // for the two lines it is allowed.
  return (
    <ul className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          selected={selectedIds.has(product.id)}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}

/**
 * One card, and it only re-renders when its own product or its own selected
 * state changes.
 *
 * Without this every keystroke in the search box re-rendered all twenty-one
 * of them — about 25ms a letter on a desktop, and several times that on the
 * phone this actually runs on. The card is cheap; twenty-one of them per
 * keypress was not.
 */
const ProductCard = memo(function ProductCard({
  product,
  selected,
  onToggle,
}: {
  product: PosProduct;
  selected: boolean;
  onToggle: (product: PosProduct) => void;
}) {
  return (
    <li>
      {/* The whole card is the button. At a counter you aim for the card, not
          a 24px "+" in its corner — and there is no "+" here at all: tapping
          again takes the item back off, which is what aria-pressed says. */}
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onToggle(product)}
        className={cn(
          "relative flex h-full w-full items-center gap-2.5 overflow-hidden rounded-card p-2 text-left",
          // Two pixels at all times, colour is the only thing that changes.
          // Swapping 1px for 2px on selection would take the extra width out
          // of the content with border-box, and the picture would nudge under
          // the cashier's thumb on every tap.
          "border-2 transition-all duration-150 touch-manipulation active:scale-[0.98]",
          selected
            ? "border-forest bg-mint shadow-[0_2px_10px_rgba(14,90,53,0.18)]"
            : "border-brandline bg-white shadow-[0_1px_2px_rgba(24,53,42,0.04)] hover:bg-ivory",
        )}
      >
        {/* A fixed square, the same on every card whatever the photo is. */}
        <span className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-mint">
          {product.image_url ? (
            // object-contain, not cover: a whole chicken leg the cashier can
            // recognise beats a tightly cropped piece of one.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt=""
              className="size-full object-contain p-1"
              loading="lazy"
              decoding="async"
            />
          ) : (
            // A quiet cutlery mark on the brand tint. No emoji, no letter.
            <span
              aria-hidden="true"
              className="flex size-full items-center justify-center"
            >
              <CutleryIcon className="size-7 text-leaf/40" />
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1 py-0.5 pr-6">
          <span className="line-clamp-2 text-[0.9375rem] font-semibold leading-tight text-brandink">
            {product.name}
          </span>
          <span className="tabular text-[1.0625rem] font-bold leading-none text-forest">
            {formatMoneyCompact(product.price)}
          </span>
        </span>

        {/* Top-right, clear of the picture and of both lines of the name. */}
        {selected ? (
          <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-forest text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
            <CheckIcon className="size-3" />
          </span>
        ) : null}

        {/* aria-pressed already announces the state; this says what the next
            tap will do, which is the part a badge used to imply. */}
        <span className="sr-only">
          {selected
            ? `${product.name} is on the order. Tap to take it off.`
            : `Add ${product.name} to the order`}
        </span>
      </button>
    </li>
  );
});
