"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { formatPlacedAt, formatWaited } from "@/lib/datetime";
import type { HoldOrder } from "@/app/pos/hold-actions";

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
};

/**
 * The same thirty seconds the till uses.
 *
 * The labels only have minute resolution, so anything faster redraws the
 * same words — and it costs nothing either way, because a tick re-renders
 * from local state and never asks the database.
 */
const TICK_MS = 30_000;

/**
 * Management's view of what the kitchen still owes the room.
 *
 * Read-only by construction: there is no action on this screen at all.
 * Delivering happens at the till, where the food actually changes hands, and
 * nothing here can alter or remove an order.
 */
export function HoldOrdersMonitor({ orders }: { orders: HoldOrder[] }) {
  const [open, setOpen] = useState<string | null>(null);

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const waiting = orders.reduce((sum, order) => sum + Number(order.total), 0);

  return (
    <div className="space-y-3">
      <p className="text-meta text-brandmuted">
        {orders.length === 1 ? "1 order" : `${orders.length} orders`} waiting ·{" "}
        <span className="tabular font-medium text-brandink">
          {formatMoney(waiting.toFixed(2))}
        </span>
      </p>

      <ul className="space-y-2">
        {orders.map((order) => {
          const since = order.held_at ?? order.created_at;
          const count = order.items.reduce((sum, line) => sum + line.quantity, 0);
          const expanded = open === order.id;

          return (
            <li key={order.id}>
              <Card className="overflow-hidden">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : order.id)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors duration-150 hover:bg-ivory"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full bg-caramel"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="tabular truncate text-card font-semibold text-brandink">
                        {order.bill_number}
                      </span>
                      <span className="shrink-0 rounded-full bg-sand px-1.5 py-px text-[0.6rem] font-medium text-coffee">
                        Hold
                      </span>
                    </span>
                    <span className="mt-0.5 block text-meta text-brandmuted">
                      {count} {count === 1 ? "Item" : "Items"} ·{" "}
                      {formatMoney(order.total)}
                      <br className="min-[380px]:hidden" />
                      <span className="tabular">
                        {" "}
                        Placed {formatPlacedAt(order.created_at)} ·{" "}
                        <span className="font-medium text-caramel">
                          Waiting {formatWaited(since)}
                        </span>
                      </span>
                    </span>
                  </span>
                </button>

                {expanded ? (
                  <div className="border-t border-brandline/60 bg-ivory/60 px-3 py-2.5">
                    {order.customer_name !== "Walk-in Customer" ||
                    order.customer_mobile ? (
                      <p className="mb-2 text-meta text-brandmuted">
                        {order.customer_name}
                        {order.customer_mobile ? ` · ${order.customer_mobile}` : ""}
                      </p>
                    ) : null}

                    <ul className="space-y-1.5">
                      {order.items.map((line, index) => (
                        <li
                          key={`${line.product_name}-${index}`}
                          className="flex items-baseline gap-3 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate text-brandink">
                            {line.product_name}
                          </span>
                          <span className="tabular shrink-0 text-brandmuted">
                            {line.quantity} × {formatMoney(line.unit_price)}
                          </span>
                          <span className="tabular w-20 shrink-0 text-right font-medium text-brandink">
                            {formatMoney(line.line_total)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-2.5 flex items-baseline justify-between border-t border-brandline/60 pt-2 text-sm">
                      <span className="text-brandmuted">
                        {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
                      </span>
                      <span className="tabular font-semibold text-forest">
                        {formatMoney(order.total)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
