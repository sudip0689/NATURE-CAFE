"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/states";
import { CheckIcon } from "@/components/icons";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { formatPlacedAt, formatWaited } from "@/lib/datetime";
import { cn } from "@/lib/cn";
import { useOverlayBack } from "@/lib/use-overlay-back";
import { cancelOrder, deliverOrder, type HoldOrder } from "./hold-actions";

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
};

/**
 * How often the "Held 12 min" labels are recomputed.
 *
 * Thirty seconds, in one interval shared by the whole list, and it touches
 * nothing but local state — the database is not asked again. The label only
 * has minute resolution, so anything faster would redraw the same words.
 */
const TICK_MS = 30_000;

export function HoldOrders({
  orders,
  onDelivered,
  onCancelled,
}: {
  orders: HoldOrder[];
  /** Hands the delivered order up so the till can print it. */
  onDelivered: (order: DeliveredOrder) => void;
  /** Cancelled instead: the till only needs to say so. Nothing prints. */
  onCancelled: (order: { id: string; number: string; total: string }) => void;
}) {
  const [open, setOpen] = useState<HoldOrder | null>(null);

  // One timer for every card. Re-rendering on a tick is what moves the
  // waiting labels; nothing is fetched.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Not an early return. The open sheet is rendered below this, and a
          refresh that comes back empty — someone else delivered the last
          order, or the list reloaded — would otherwise tear an order out from
          under the cashier who was reading it. */}
      {orders.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="font-display text-lg font-semibold text-brandink">
            No held orders
          </p>
          <p className="mt-1 text-brandmuted">
            Orders you ring up wait here until they are handed over.
          </p>
        </div>
      ) : null}

      <ul className="space-y-2 px-4 py-4 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-6">
        {orders.map((order) => {
          const since = order.held_at ?? order.created_at;
          const count = order.items.reduce((sum, line) => sum + line.quantity, 0);

          return (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => setOpen(order)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-card border bg-white p-3 text-left",
                  "transition-all duration-150 touch-manipulation active:scale-[0.99]",
                  // Quiet until an order has been waiting a while, then the
                  // card itself says so. No animation: a card that flashes
                  // across a counter all afternoon stops being read.
                  urgency(since) === "late"
                    ? "border-caramel bg-sand/40"
                    : urgency(since) === "slow"
                      ? "border-caramel/60"
                      : "border-brandline hover:border-caramel/50",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    urgency(since) === "late" ? "bg-coffee" : "bg-caramel",
                  )}
                />

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="tabular truncate text-card font-semibold text-brandink">
                      {order.bill_number}
                    </span>
                    <span className="shrink-0 rounded-full bg-sand px-1.5 py-px text-[0.6rem] font-medium text-coffee">
                      {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-meta text-brandmuted">
                    <span className="shrink-0">
                      {count} {count === 1 ? "Item" : "Items"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular shrink-0">
                      Placed {formatPlacedAt(order.created_at)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={cn(
                        "tabular shrink-0 font-medium",
                        urgency(since) === "late" ? "text-coffee" : "text-caramel",
                      )}
                    >
                      Held {formatWaited(since)}
                    </span>
                  </span>
                </span>

                <span className="tabular shrink-0 text-card font-bold text-forest">
                  {formatMoneyCompact(order.total)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {open ? (
        <HoldOrderSheet
          order={open}
          onClose={() => setOpen(null)}
          onDelivered={(delivered) => {
            setOpen(null);
            onDelivered(delivered);
          }}
          onCancelled={(cancelled) => {
            setOpen(null);
            onCancelled(cancelled);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * One held order, in full, with the only action it has: hand it over.
 *
 * Opening an order must not be able to create another one — everything here
 * reads, and the single button moves the order it was opened from.
 */
function HoldOrderSheet({
  order,
  onClose,
  onDelivered,
  onCancelled,
}: {
  order: HoldOrder;
  onClose: () => void;
  onDelivered: (order: DeliveredOrder) => void;
  /** The customer changed their mind; nothing prints. */
  onCancelled: (order: { id: string; number: string; total: string }) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Android Back steps back out of this one layer at a time: a confirmation
  // first, then the order. Not while a request is in flight — the buttons are
  // disabled then, and Back should not be the one way to abandon a delivery
  // half-way through.
  useOverlayBack(true, onClose);
  useOverlayBack(confirming, () => {
    if (!working) setConfirming(false);
  });
  useOverlayBack(cancelling, () => {
    if (!working) setCancelling(false);
  });

  const since = order.held_at ?? order.created_at;
  const itemCount = order.items.reduce((sum, line) => sum + line.quantity, 0);

  const deliver = useCallback(async () => {
    if (working) return;
    setWorking(true);
    setProblem(null);

    let result;
    try {
      result = await deliverOrder(order.id);
    } catch {
      // A server action rejects outright when the network drops — it does not
      // come back as a result object. Without this the button stayed disabled
      // for good and the order could not be delivered at all until the sheet
      // was closed and reopened.
      setProblem("Couldn't deliver the order. Check the connection and try again.");
      return;
    } finally {
      setWorking(false);
    }

    if (result.ok && result.order) {
      // The customer travels with the order rather than being fetched again:
      // it is the same order, and it is already here.
      onDelivered({
        ...result.order,
        customerName: order.customer_name || "Walk-in Customer",
        customerMobile: order.customer_mobile,
      });
    }
    else setProblem(result.message ?? "The order could not be delivered.");
  }, [
    order.id,
    order.customer_name,
    order.customer_mobile,
    working,
    onDelivered,
  ]);

  const cancel = useCallback(async () => {
    if (working) return;
    setWorking(true);
    setProblem(null);

    let result;
    try {
      result = await cancelOrder(order.id);
    } catch {
      setProblem("Couldn't cancel the order. Check the connection and try again.");
      return;
    } finally {
      // Always, so a failure leaves the order on hold with the button usable
      // rather than stranded mid-cancel.
      setWorking(false);
    }

    if (result.ok && result.order) onCancelled(result.order);
    else setProblem(result.message ?? "The order could not be cancelled.");
  }, [order.id, working, onCancelled]);

  return (
    <div className="fixed inset-0 z-30">
      <button
        type="button"
        aria-label="Close order"
        onClick={onClose}
        className="scrim-enter absolute inset-0 bg-brandink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order.bill_number}`}
        className="sheet-enter absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-sheet bg-white shadow-sheet"
      >
        <div className="flex justify-center pt-3" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-brandline" />
        </div>

        <div className="shrink-0 px-4 pb-3 pt-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="tabular font-display text-lg font-semibold text-brandink">
              {order.bill_number}
            </h2>
            <span className="tabular text-meta font-medium text-caramel">
              Held {formatWaited(since)}
            </span>
          </div>
          <p className="mt-0.5 text-meta text-brandmuted">
            Placed {formatPlacedAt(order.created_at)}
            {order.customer_name && order.customer_name !== "Walk-in Customer"
              ? ` · ${order.customer_name}`
              : ""}
            {order.customer_mobile ? ` · ${order.customer_mobile}` : ""}
          </p>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-brandline/60 overflow-y-auto border-y border-brandline/60">
          {order.items.map((line, index) => (
            <li
              key={`${line.product_name}-${index}`}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-brandink">{line.product_name}</span>
                <span className="tabular block text-meta text-brandmuted">
                  {line.quantity} × {formatMoney(line.unit_price)}
                </span>
              </span>
              <span className="tabular shrink-0 font-semibold text-brandink">
                {formatMoney(line.line_total)}
              </span>
            </li>
          ))}
        </ul>

        <div className="shrink-0 space-y-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="space-y-1 text-sm">
            <Row label="Subtotal" value={formatMoney(order.subtotal)} />
            {Number(order.discount) > 0 ? (
              <Row label="Discount" value={`− ${formatMoney(order.discount)}`} />
            ) : null}
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <span className="font-display text-base font-semibold text-brandink">
                Total
              </span>
              <span className="tabular text-xl font-bold text-forest">
                {formatMoney(order.total)}
              </span>
            </div>
            <Row
              label="Payment"
              value={PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
            />
          </div>

          {problem ? <ErrorNote>{problem}</ErrorNote> : null}

          {confirming ? (
            /* The last look before the food leaves the counter, so who it is
               for comes first and the order details sit under it. Everywhere
               else customer information is secondary; here it is the point. */
            <div className="space-y-3 rounded-card border border-leaf/40 bg-mint p-3">
              <p className="text-sm font-semibold text-forest">Deliver order</p>

              <div>
                <p className="text-meta text-brandmuted">Customer</p>
                <p className="text-lg font-semibold leading-tight text-brandink">
                  {order.customer_name || "Walk-in Customer"}
                </p>
                <p className="tabular mt-0.5 text-sm text-brandink">
                  {order.customer_mobile ? (
                    <>
                      <span aria-hidden="true">📞 </span>
                      {order.customer_mobile}
                    </>
                  ) : (
                    <span className="text-brandmuted">Mobile not provided</span>
                  )}
                </p>
              </div>

              <div className="tabular flex items-baseline justify-between gap-3 border-t border-leaf/25 pt-2 text-sm">
                <span className="text-brandmuted">
                  {order.bill_number} · {itemCount}{" "}
                  {itemCount === 1 ? "Item" : "Items"}
                </span>
                <span className="font-bold text-forest">
                  {formatMoney(order.total)}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setConfirming(false)}
                  disabled={working}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth
                  onClick={deliver}
                  pending={working}
                  pendingLabel="Delivering…"
                >
                  Confirm Delivered
                </Button>
              </div>
            </div>
          ) : cancelling ? (
            /* Its own confirmation, worded around what is being given up.
               Deliberately not the same shape as the delivery one: that is
               the ordinary end of an order and this is not. */
            <div className="space-y-3 rounded-card border border-alert-500/30 bg-alert-50 p-3">
              <p className="text-sm font-semibold text-brandink">
                Cancel this order?
              </p>

              <div className="tabular space-y-1 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-brandmuted">Order</span>
                  <span className="font-medium text-brandink">
                    {order.bill_number}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-brandmuted">Total</span>
                  <span className="font-medium text-brandink">
                    {formatMoney(order.total)}
                  </span>
                </div>
              </div>

              <p className="text-sm text-brandmuted">
                This order will be cancelled and will not be counted as a
                completed sale.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setCancelling(false);
                    setProblem(null);
                  }}
                  disabled={working}
                >
                  Keep Order
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={cancel}
                  pending={working}
                  pendingLabel="Cancelling…"
                >
                  Cancel Order
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
                <Button size="lg" fullWidth onClick={() => setConfirming(true)}>
                  <CheckIcon className="size-5" />
                  Mark Delivered
                </Button>
              </div>

              {/* Secondary and quiet. Cancelling is the rarer path and the
                  irreversible one, so it does not compete with Delivered for
                  the thumb. */}
              <button
                type="button"
                onClick={() => setCancelling(true)}
                className="min-h-touch w-full rounded-control text-sm font-medium text-alert-600 transition-colors duration-150 hover:bg-alert-50 active:bg-alert-50"
              >
                Cancel Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-brandmuted">{label}</span>
      <span className="tabular font-medium text-brandink">{value}</span>
    </div>
  );
}

/**
 * How overdue an order looks, from how long it has been waiting.
 *
 * Thresholds rather than a gradient, because the only question a cashier is
 * asking is "is anything here going cold?" — and three steps answer it at a
 * glance where a slowly shifting colour would not.
 */
function urgency(sinceIso: string): "fresh" | "slow" | "late" {
  const minutes = (Date.now() - new Date(sinceIso).getTime()) / 60000;
  if (minutes >= 20) return "late";
  if (minutes >= 10) return "slow";
  return "fresh";
}

/**
 * What the till needs after an order has been handed over.
 *
 * The customer comes along for the ride rather than being read back: it is
 * the same order that was just on screen, so asking the database who it
 * belonged to would be a round trip for something already in hand.
 */
export interface DeliveredOrder {
  id: string;
  number: string;
  total: string;
  customerName: string;
  customerMobile: string | null;
}
