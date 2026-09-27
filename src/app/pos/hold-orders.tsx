"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/states";
import { CheckIcon } from "@/components/icons";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { formatPlacedAt, formatWaited } from "@/lib/datetime";
import { cn } from "@/lib/cn";
import { deliverOrder, type HoldOrder } from "./hold-actions";

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
}: {
  orders: HoldOrder[];
  /** Hands the delivered order up so the till can offer to print it. */
  onDelivered: (order: { id: string; number: string; total: string }) => void;
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
}: {
  order: HoldOrder;
  onClose: () => void;
  onDelivered: (order: { id: string; number: string; total: string }) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const since = order.held_at ?? order.created_at;

  const deliver = useCallback(async () => {
    if (working) return;
    setWorking(true);
    setProblem(null);

    const result = await deliverOrder(order.id);
    setWorking(false);

    if (result.ok && result.order) onDelivered(result.order);
    else setProblem(result.message ?? "The order could not be delivered.");
  }, [order.id, working, onDelivered]);

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
            <div className="space-y-2 rounded-card border border-brandline bg-ivory p-3">
              <p className="text-sm font-semibold text-brandink">
                Mark this order as delivered?
              </p>
              <p className="tabular text-sm text-brandmuted">
                {order.bill_number} · {formatMoney(order.total)}
              </p>
              <div className="flex gap-2 pt-1">
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
                  Delivered
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button size="lg" fullWidth onClick={() => setConfirming(true)}>
                <CheckIcon className="size-5" />
                Mark Delivered
              </Button>
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
