"use client";

import { useCallback, useEffect, useMemo, useReducer, useState, useTransition } from "react";

import { cartReducer, cartTotals, toBillPayload, type CartLine } from "@/lib/cart";
import { formatMoney, formatMoneyCompact, toAmountString } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { generateBill } from "./actions";
import { validateMobile } from "@/lib/validation";
import type { PaymentMethod } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";
import { CartIcon, ChevronRight, SearchIcon } from "@/components/icons";
import { OrderPanel } from "./order-panel";
import { HoldOrders } from "./hold-orders";
import {
  getReceipt,
  listHoldOrders,
  markPrinted,
  type HoldOrder,
} from "./hold-actions";
import { printReceipt } from "@/lib/printing";
import { ProductGrid, type PosProduct } from "./product-grid";

const ALL = "all";

export function PosClient({
  products,
  categories,
  initialHoldOrders,
}: {
  products: PosProduct[];
  categories: ReadonlyArray<{ id: string; name: string }>;
  /** Rendered with the page, so the badge is right on first paint. */
  initialHoldOrders: HoldOrder[];
}) {
  const [lines, dispatch] = useReducer(cartReducer, [] as CartLine[]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [drawerOpen, setDrawerOpen] = useState(false);
  /**
   * Held for the length of the closing slide, then dropped.
   *
   * On a timer rather than on animationend: if that event is missed — a
   * backgrounded tab, reduced-motion turning the animation off entirely — the
   * sheet would stay on screen over the till with no way to shift it. A
   * timeout always fires.
   */
  const [closingDrawer, setClosingDrawer] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  /**
   * The order the dialog is talking about, and whether it is finished.
   *
   * `delivered` is what decides between "on hold, come back to print it" and
   * "delivered, here is the bill" -- the same dialog serves both ends of the
   * workflow rather than there being two nearly identical ones.
   */
  const [completedBill, setCompletedBill] = useState<{
    id: string;
    number: string;
    total: string;
    delivered: boolean;
    customerName: string;
    customerMobile: string | null;
  } | null>(null);

  /** "New Order" or "Hold Orders". */
  const [tab, setTab] = useState<"order" | "hold">("order");

  /** Where the receipt has got to, for the order in the dialog. */
  const [printState, setPrintState] =
    useState<"idle" | "printing" | "printed" | "failed">("idle");
  const [printProblem, setPrintProblem] = useState<string | null>(null);
  const [held, setHeld] = useState<HoldOrder[]>(initialHoldOrders);
  // The result is all that matters here; the list simply updates when it
  // arrives, and a spinner over four cards would be more noise than news.
  const [, startRefresh] = useTransition();

  // One idempotency key per order, reused across every retry of that order, so
  // a double-tap or a flaky-wifi retry returns the first bill instead of
  // charging the customer twice. A fresh key is minted once an order finishes.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  const totals = useMemo(() => cartTotals(lines, discount), [lines, discount]);

  /**
   * What is on the order, not how much of it.
   *
   * The grid is a picker: one tap puts an item on the order, another takes it
   * off. Quantity belongs to the order panel, where there is room for a
   * stepper and a line total next to it.
   */
  const selectedIds = useMemo(
    () => new Set(lines.map((line) => line.productId)),
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

  /**
   * Re-reads the hold list.
   *
   * Called when it could have changed — an order placed, an order delivered,
   * the tab opened, the app coming back to the foreground — rather than on a
   * clock. The waiting times on screen tick locally and need none of this.
   */
  const refreshHeld = useCallback(() => {
    startRefresh(async () => {
      setHeld(await listHoldOrders());
    });
  }, []);

  // Coming back to the till after a while: someone else may have delivered
  // an order, or the app may have been in the background since breakfast.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshHeld();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshHeld]);

  /**
   * Prints a delivered order, and records that it reached the paper.
   *
   * Nothing in here can move the order back: it is delivered before this
   * runs, and a failure only ever sets a message and offers another go. That
   * is the whole rule — a jammed printer is not an undelivered order.
   */
  const printBill = useCallback(async (billId: string) => {
    setPrintState("printing");
    setPrintProblem(null);

    const receipt = await getReceipt(billId);
    if (!receipt) {
      setPrintState("failed");
      setPrintProblem("The receipt could not be loaded. The bill is saved — reprint it from Bills.");
      return;
    }

    const outcome = await printReceipt(receipt);
    if (outcome.ok) {
      setPrintState("printed");
      // Best effort: the paper is already out, so a failure to note it down
      // must not be reported to the counter as a printing problem.
      void markPrinted(billId);
    } else {
      setPrintState("failed");
      setPrintProblem(outcome.message);
    }
  }, []);

  /**
   * One callback for the life of the screen, so the cards can be memoised.
   *
   * Tapping an item already on the order takes the whole line off, however
   * many of it there are -- it is a selection, not a counter. The reducer
   * decides which way round that is, which is what keeps this stable.
   * Purely local: nothing reaches the database until the order is placed.
   */
  const toggleProduct = useCallback((product: PosProduct) => {
    dispatch({ type: "toggle", product });
    setBillingError(null);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setClosingDrawer(true);
  }, []);

  useEffect(() => {
    if (!closingDrawer) return;
    const timer = setTimeout(() => setClosingDrawer(false), 200);
    return () => clearTimeout(timer);
  }, [closingDrawer]);

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
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

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
        // The cart is left exactly as it was, so "Try again" retries this
        // order rather than making the customer order it again. The same
        // requestId goes with it, so a retry of a request that actually
        // landed returns the first bill instead of a second one.
        setBillingError(result.error);
        return;
      }

      // Narrowing does not survive into the setState callback below.
      const placed = result.bill;

      /**
       * The new card is assembled from the cart that was just sent, not
       * fetched back.
       *
       * Everything on it is already here — the lines are the cart, and the
       * number, id and total come back from the insert itself, priced by the
       * server. Asking the database to describe an order we just described to
       * it is two round trips for information we are holding.
       */
      setHeld((current) => [
        ...current,
        {
          id: placed.id,
          bill_number: placed.number,
          customer_name: customerName.trim() || "Walk-in Customer",
          customer_mobile: customerMobile.trim() || null,
          subtotal: toAmountString(totals.subtotalPaisa),
          discount: toAmountString(totals.discountPaisa),
          total: placed.total,
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
          held_at: new Date().toISOString(),
          items: lines.map((line) => ({
            product_name: line.name,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            line_total: toAmountString(
              Math.round(Number(line.unitPrice) * 100) * line.quantity,
            ),
          })),
        },
      ]);

      setCompletedBill({
        ...placed,
        delivered: false,
        customerName: customerName.trim() || "Walk-in Customer",
        customerMobile: customerMobile.trim() || null,
      });
      setPrintState("idle");
      setPrintProblem(null);
      closeDrawer();
      // The cart belongs to the order that has just been placed, so it goes
      // with it -- the cashier is back on an empty till for the next customer
      // without having to clear anything.
      dispatch({ type: "clear" });
      setDiscount("");
      setCustomerName("");
      setCustomerMobile("");
      setQuery("");
      setRequestId(crypto.randomUUID());
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
        {/* New Order / Hold Orders. Two buttons rather than a screen of its
            own: the cashier moves between ringing up and handing over
            constantly, and a navigation would lose the cart every time. */}
        <div className="sticky top-0 z-10 flex gap-2 border-b border-brandline bg-ivory/95 px-4 pt-3 backdrop-blur">
          <WorkTab active={tab === "order"} onClick={() => setTab("order")}>
            New Order
          </WorkTab>
          <WorkTab
            active={tab === "hold"}
            onClick={() => {
              setTab("hold");
              refreshHeld();
            }}
          >
            Hold Orders
            {held.length > 0 ? (
              <span
                key={held.length}
                className={cn(
                  "count-pop tabular ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-px text-[0.7rem] font-bold",
                  tab === "hold" ? "bg-white/20 text-white" : "bg-caramel text-white",
                )}
              >
                {held.length}
              </span>
            ) : null}
          </WorkTab>
        </div>

        {tab === "hold" ? (
          <HoldOrders
            orders={held}
            onDelivered={(order) => {
              // Gone from the list the moment the database confirmed it, from
              // local state -- no refetch to discover what we were just told.
              setHeld((current) => current.filter((held) => held.id !== order.id));
              setCompletedBill({ ...order, delivered: true });
              setPrintState("idle");
              setPrintProblem(null);
              // Straight to the printer. The cashier just handed the food
              // over; making them tap Print as well is a tap for nothing.
              void printBill(order.id);
            }}
          />
        ) : (
          <>
        <div className="sticky top-[var(--spacing-worktabs)] z-10 border-b border-brandline bg-ivory/95 px-4 pb-2 pt-3 backdrop-blur">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-brandmuted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the menu…"
              aria-label="Search the menu"
              className="h-[3.75rem] w-full rounded-full border border-brandline bg-white pl-12 pr-4 text-[1.0625rem] text-brandink shadow-[0_1px_2px_rgba(24,53,42,0.04)] placeholder:text-brandmuted focus:border-leaf focus:outline-none"
            />
          </div>

          {/*
            One row, always. `shrink-0` on every chip is what stops flexbox
            compressing them to fit instead of letting the strip scroll.

            No touch-action here on purpose: pinning it to pan-x would make a
            vertical swipe that happens to start on a chip do nothing, and the
            menu is the thing people scroll. The default handles both.
          */}
          <div
            role="tablist"
            aria-label="Categories"
            className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        <div className="flex-1 px-4 pt-[0.375rem] pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-6">
          <ProductGrid
            products={visibleProducts}
            selectedIds={selectedIds}
            onToggle={toggleProduct}
          />
        </div>
          </>
        )}
      </section>

      {/* Counter screen: the order sits permanently beside the menu. */}
      <aside className="hidden w-[26rem] shrink-0 border-l border-brandline bg-white lg:block lg:overflow-hidden">
        <OrderPanel {...panelProps} />
      </aside>

      {/* Phone: a sticky summary that opens the order as a sheet. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-brandline bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-sheet lg:hidden">
        {/* An empty cart keeps the bar in place, greyed and inert, rather
            than removing it: the grid would jump under the cashier's thumb
            the instant the first item went on. */}
        <button
          type="button"
          disabled={totals.itemCount === 0}
          onClick={() => setDrawerOpen(true)}
          className={cn(
            "flex min-h-touch-lg w-full items-center gap-3 rounded-2xl px-4 text-left",
            "touch-manipulation transition-all duration-150",
            totals.itemCount > 0 && "active:scale-[0.98]",
            totals.itemCount === 0
              ? "border border-dashed border-brandline bg-ivory text-brandmuted"
              : "bg-forest text-white shadow-[0_4px_16px_rgba(14,90,53,0.3)] active:bg-leaf",
          )}
        >
          <CartIcon
            className={cn(
              "size-5 shrink-0",
              totals.itemCount === 0 ? "text-brandmuted" : "text-white/90",
            )}
          />

          {/* Keyed on the count, so React remounts it and the pop replays each
              time an item goes on or comes off. Without the key the text
              changes with no acknowledgement that the tap landed. */}
          <span
            key={totals.itemCount}
            className={cn(
              "min-w-0 flex-1 truncate font-semibold",
              totals.itemCount > 0 && "count-pop",
            )}
          >
            {totals.itemCount === 0
              ? "Tap an item to start"
              : `View Order · ${totals.itemCount} ${
                  totals.itemCount === 1 ? "Item" : "Items"
                }`}
          </span>

          {totals.itemCount === 0 ? null : (
            <>
              <span className="tabular shrink-0 text-lg font-bold">
                {formatMoneyCompact(toAmountString(totals.totalPaisa))}
              </span>
              <ChevronRight className="size-5 shrink-0 text-white/80" />
            </>
          )}
        </button>
      </div>

      {drawerOpen || closingDrawer ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Close order"
            onClick={closeDrawer}
            className={cn("absolute inset-0 bg-brandink/40", !closingDrawer && "scrim-enter")}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Current order"
            className={cn(
              "absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-sheet bg-white shadow-sheet",
              closingDrawer ? "sheet-leave" : "sheet-enter",
            )}
          >
            <div className="flex justify-center pt-3" aria-hidden="true">
              <span className="h-1 w-10 rounded-full bg-brandline" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <OrderPanel {...panelProps} onClose={closeDrawer} />
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
            {/* Amber, not green. The order is placed, not finished — green is
                kept for the moment it is actually handed over. */}
            <div
              aria-hidden="true"
              className={cn(
                "count-pop mx-auto flex size-14 items-center justify-center rounded-full text-2xl",
                completedBill.delivered ? "bg-mint text-leaf" : "bg-sand text-caramel",
              )}
            >
              ✓
            </div>

            <h2
              id="bill-done-heading"
              className="mt-4 font-display text-xl font-semibold text-brandink"
            >
              {completedBill.delivered ? "Order delivered" : "Order on hold"}
            </h2>
            <p className="tabular mt-1 text-sm text-brandmuted">
              {completedBill.number}
            </p>

            {/* Who it went to, named on the way out. Only on delivery — while
                the order is still on hold nobody has handed anything over. */}
            {completedBill.delivered ? (
              <div className="mt-2">
                <p className="font-medium text-brandink">
                  {completedBill.customerName}
                </p>
                {completedBill.customerMobile ? (
                  <p className="tabular text-sm text-brandmuted">
                    <span aria-hidden="true">📞 </span>
                    {completedBill.customerMobile}
                  </p>
                ) : null}
              </div>
            ) : null}

            <p className="tabular mt-3 text-3xl font-semibold leading-none text-forest">
              {formatMoney(completedBill.total)}
            </p>

            {completedBill.delivered ? null : (
              <p className="mt-3 text-sm text-brandmuted">
                It is waiting in Hold Orders. The bill prints when you hand it
                over.
              </p>
            )}

            {/* Printing is reported where it happens rather than on a screen
                of its own. The order is already delivered by the time any of
                this runs, so none of these states can take that back. */}
            {completedBill.delivered ? (
              <p
                role="status"
                className={cn(
                  "mt-3 text-sm",
                  printState === "failed" ? "text-alert-600" : "text-brandmuted",
                )}
              >
                {printState === "printing"
                  ? "Printing…"
                  : printState === "printed"
                    ? "Bill printed."
                    : printState === "failed"
                      ? printProblem
                      : "Ready to print."}
              </p>
            ) : null}

            <div className="mt-6 space-y-2">
              {completedBill.delivered && printState !== "printed" ? (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => printBill(completedBill.id)}
                  pending={printState === "printing"}
                  pendingLabel="Printing…"
                >
                  {printState === "failed" ? "Print again" : "Print bill"}
                </Button>
              ) : null}
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
        // A fixed height and generous side padding, so a three-letter label
        // like "All" is still a pill rather than a circle sitting oddly at
        // the head of the row.
        "h-11 shrink-0 whitespace-nowrap rounded-full border px-5 text-[0.9375rem] font-semibold",
        "touch-manipulation transition-all duration-150 active:scale-[0.97]",
        active
          ? "border-forest bg-forest text-white shadow-[0_1px_3px_rgba(14,90,53,0.25)]"
          : "border-brandline bg-white text-brandink hover:bg-mint",
      )}
    >
      {children}
    </button>
  );
}

/**
 * New Order / Hold Orders.
 *
 * Sits above the search box rather than in the app header: this is a choice
 * about what the till is doing right now, not navigation, and the cart must
 * survive switching between them.
 */
function WorkTab({
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
        "flex min-h-11 flex-1 items-center justify-center gap-1 rounded-t-xl border-b-2 px-3 text-sm font-semibold",
        "touch-manipulation transition-all duration-150 active:scale-[0.98]",
        active
          ? "border-forest bg-forest text-white"
          : "border-transparent bg-white/60 text-brandmuted hover:bg-white",
      )}
    >
      {children}
    </button>
  );
}
