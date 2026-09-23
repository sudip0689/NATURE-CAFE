"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useState, useTransition } from "react";

import { cartReducer, cartTotals, toBillPayload, type CartLine } from "@/lib/cart";
import { formatMoney, formatMoneyCompact, toAmountString } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { generateBill } from "./actions";
import { validateMobile } from "@/lib/validation";
import type { PaymentMethod } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";
import { OrderPanel } from "./order-panel";
import { ProductGrid, type PosProduct } from "./product-grid";

const ALL = "all";

export function PosClient({
  products,
  categories,
}: {
  products: PosProduct[];
  categories: ReadonlyArray<{ id: string; name: string }>;
}) {
  const [lines, dispatch] = useReducer(cartReducer, [] as CartLine[]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [completedBill, setCompletedBill] = useState<{
    id: string;
    number: string;
    total: string;
  } | null>(null);

  // One idempotency key per order, reused across every retry of that order, so
  // a double-tap or a flaky-wifi retry returns the first bill instead of
  // charging the customer twice. A fresh key is minted once an order finishes.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  const totals = useMemo(() => cartTotals(lines, discount), [lines, discount]);

  const quantities = useMemo(
    () => Object.fromEntries(lines.map((line) => [line.productId, line.quantity])),
    [lines],
  );

  // The menu is small enough to filter in memory — a café has tens of items,
  // not thousands, and a round trip per keystroke at a counter is unforgivable.
  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === ALL || product.category_id === activeCategory;
      const matchesQuery = !needle || product.name.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, activeCategory]);

  const mobileError = validateMobile(customerMobile);

  // Lock the page behind the drawer, or the grid scrolls under the cart.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function startNextOrder() {
    dispatch({ type: "clear" });
    setDiscount("");
    setCustomerName("");
    setCustomerMobile("");
    setPaymentMethod("cash");
    setBillingError(null);
    setCompletedBill(null);
    setDrawerOpen(false);
    setQuery("");
    setRequestId(crypto.randomUUID());
  }

  function handleGenerate() {
    if (lines.length === 0 || mobileError) return;
    setBillingError(null);

    startSaving(async () => {
      const result = await generateBill({
        // Ids and quantities only — the server prices the order itself.
        items: toBillPayload(lines),
        paymentMethod,
        customerName,
        customerMobile,
        discount,
        requestId,
      });

      if (result.error || !result.bill) {
        setBillingError(result.error);
        return;
      }

      setCompletedBill(result.bill);
      setDrawerOpen(false);
    });
  }

  const panelProps = {
    lines,
    totals,
    customerName,
    customerMobile,
    mobileError,
    discount,
    paymentMethod,
    billingError,
    generating: saving,
    onIncrement: (productId: string) => dispatch({ type: "increment", productId }),
    onDecrement: (productId: string) => dispatch({ type: "decrement", productId }),
    onCustomerNameChange: setCustomerName,
    onCustomerMobileChange: setCustomerMobile,
    onDiscountChange: setDiscount,
    onPaymentMethodChange: setPaymentMethod,
    onClear: () => {
      dispatch({ type: "clear" });
      setDiscount("");
      setBillingError(null);
      // A cleared cart is a different order, so it gets a different key —
      // otherwise the next sale would be treated as a retry of this one.
      setRequestId(crypto.randomUUID());
    },
    onGenerate: handleGenerate,
  };

  return (
    <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
      <section className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
        <div className="sticky top-0 z-10 space-y-3 border-b border-brandline bg-ivory/95 px-4 py-3 backdrop-blur">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the menu…"
            aria-label="Search the menu"
            className="w-full min-h-touch rounded-control border border-brandline bg-white px-4 text-base text-brandink placeholder:text-brandmuted focus:border-leaf focus:outline-none"
          />

          <div
            role="tablist"
            aria-label="Categories"
            className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <CategoryTab
              active={activeCategory === ALL}
              onClick={() => setActiveCategory(ALL)}
            >
              All
            </CategoryTab>
            {categories.map((category) => (
              <CategoryTab
                key={category.id}
                active={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </CategoryTab>
            ))}
          </div>
        </div>

        {/* Clears the pinned cart bar (81px) plus the home indicator. The bar
            is fixed, so it contributes no height — without this the last row
            of the menu sits underneath it. */}
        <div className="flex-1 px-4 py-4 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-6">
          <ProductGrid
            products={visibleProducts}
            quantities={quantities}
            onAdd={(product) => {
              dispatch({ type: "add", product });
              setBillingError(null);
            }}
          />
        </div>
      </section>

      {/* Counter screen: the order sits permanently beside the menu. */}
      <aside className="hidden w-[26rem] shrink-0 border-l border-brandline bg-white lg:block lg:overflow-hidden">
        <OrderPanel {...panelProps} />
      </aside>

      {/* Phone: a sticky summary that opens the order as a sheet. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brandline bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-sheet lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex min-h-touch-lg w-full items-center justify-between rounded-control bg-forest px-5 text-white touch-manipulation"
        >
          <span className="font-medium">
            {totals.itemCount === 0
              ? "No items yet"
              : `${totals.itemCount} ${totals.itemCount === 1 ? "item" : "items"}`}
          </span>
          <span className="tabular text-lg font-semibold">
            {formatMoneyCompact(toAmountString(totals.totalPaisa))}
          </span>
        </button>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Close order"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-brandink/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Current order"
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-sheet bg-white shadow-sheet"
          >
            <div className="flex justify-center pt-3" aria-hidden="true">
              <span className="h-1 w-10 rounded-full bg-brandline" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <OrderPanel {...panelProps} />
            </div>
          </div>
        </div>
      ) : null}

      {completedBill ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-brandink/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bill-done-heading"
            className="w-full max-w-sm rounded-sheet bg-white p-6 text-center shadow-sheet"
          >
            {/* The only place green appears at full strength: money landed. */}
            <div
              aria-hidden="true"
              className="mx-auto flex size-14 items-center justify-center rounded-full bg-mint text-2xl text-leaf"
            >
              ✓
            </div>

            <h2
              id="bill-done-heading"
              className="mt-4 font-display text-xl font-semibold text-brandink"
            >
              Bill saved
            </h2>
            <p className="tabular mt-1 text-sm text-brandmuted">
              {completedBill.number}
            </p>
            <p className="tabular mt-3 text-3xl font-semibold leading-none text-forest">
              {formatMoney(completedBill.total)}
            </p>

            <div className="mt-6 space-y-2">
              <Link
                href={`/bills/${completedBill.id}/print`}
                className="inline-flex min-h-touch-lg w-full items-center justify-center rounded-control border border-brandline bg-white px-5 text-base font-medium text-brandink hover:bg-ivory"
              >
                Print receipt
              </Link>
              {/* Autofocused: the cashier's next move is almost always the
                  next customer, and they shouldn't have to aim for it. */}
              <Button size="lg" fullWidth autoFocus onClick={startNextOrder}>
                New order
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CategoryTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "min-h-touch shrink-0 rounded-full border px-4 text-base font-medium transition-colors touch-manipulation",
        active
          ? "border-forest bg-forest text-white"
          : "border-brandline bg-white text-brandink hover:bg-mint",
      )}
    >
      {children}
    </button>
  );
}
