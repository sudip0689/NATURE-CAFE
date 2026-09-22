"use client";

import {
  formatMoney,
  formatMoneyCompact,
  lineTotalPaisa,
  toAmountString,
} from "@/lib/money";
import type { CartLine, CartTotals } from "@/lib/cart";
import type { PaymentMethod } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/states";

const PAYMENT_METHODS: ReadonlyArray<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

export interface OrderPanelProps {
  lines: CartLine[];
  totals: CartTotals;
  customerName: string;
  customerMobile: string;
  mobileError: string | null;
  discount: string;
  paymentMethod: PaymentMethod;
  billingError: string | null;
  generating: boolean;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerMobileChange: (value: string) => void;
  onDiscountChange: (value: string) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onClear: () => void;
  onGenerate: () => void;
}

export function OrderPanel({
  lines,
  totals,
  customerName,
  customerMobile,
  mobileError,
  discount,
  paymentMethod,
  billingError,
  generating,
  onIncrement,
  onDecrement,
  onCustomerNameChange,
  onCustomerMobileChange,
  onDiscountChange,
  onPaymentMethodChange,
  onClear,
  onGenerate,
}: OrderPanelProps) {
  const empty = lines.length === 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-cream-300 px-4 py-3">
        <h2 className="font-display text-lg font-semibold text-ink-900">
          Current order
        </h2>
        {empty ? null : (
          <button
            type="button"
            onClick={onClear}
            className="min-h-touch rounded-control px-3 text-sm font-medium text-ink-500 hover:bg-cream-200 hover:text-alert-600"
          >
            Clear
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {empty ? (
          <p className="px-4 py-12 text-center text-ink-500">
            Tap an item to start the order.
          </p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {lines.map((line) => (
              <li key={line.productId} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900">{line.name}</p>
                  <p className="tabular mt-0.5 text-sm text-ink-500">
                    {line.quantity} × {formatMoneyCompact(line.unitPrice)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <StepperButton
                    label={
                      line.quantity === 1
                        ? `Remove ${line.name}`
                        : `One less ${line.name}`
                    }
                    onClick={() => onDecrement(line.productId)}
                  >
                    −
                  </StepperButton>

                  <span className="tabular w-8 text-center text-base font-semibold text-ink-900">
                    {line.quantity}
                  </span>

                  <StepperButton
                    label={`One more ${line.name}`}
                    onClick={() => onIncrement(line.productId)}
                  >
                    +
                  </StepperButton>
                </div>

                <p className="tabular w-20 shrink-0 text-right font-semibold text-ink-900">
                  {formatMoneyCompact(
                    toAmountString(lineTotalPaisa(line.unitPrice, line.quantity)),
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-cream-300 bg-cream-100">
        <div className="space-y-3 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="block text-sm font-medium text-ink-700">Customer</span>
              <input
                value={customerName}
                onChange={(event) => onCustomerNameChange(event.target.value)}
                placeholder="Walk-in Customer"
                className="w-full min-h-touch rounded-control border border-cream-300 bg-cream-50 px-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-bean-500 focus:outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-sm font-medium text-ink-700">Mobile</span>
              <input
                value={customerMobile}
                onChange={(event) => onCustomerMobileChange(event.target.value)}
                inputMode="numeric"
                placeholder="Optional"
                aria-invalid={mobileError ? true : undefined}
                className={cn(
                  "w-full min-h-touch rounded-control border bg-cream-50 px-3 text-base text-ink-900 placeholder:text-ink-400 focus:outline-none",
                  mobileError
                    ? "border-alert-500 focus:border-alert-600"
                    : "border-cream-300 focus:border-bean-500",
                )}
              />
            </label>
          </div>

          {mobileError ? (
            <p role="alert" className="text-sm text-alert-600">
              {mobileError}
            </p>
          ) : null}

          <div className="space-y-1">
            <span className="block text-sm font-medium text-ink-700">Payment</span>
            {/* Radio group, not a dropdown: three options the cashier hits
                without a second tap to open anything. */}
            <div role="radiogroup" aria-label="Payment method" className="flex gap-2">
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onPaymentMethodChange(method.value)}
                    className={cn(
                      "min-h-touch flex-1 rounded-control border text-base font-medium transition-colors touch-manipulation",
                      selected
                        ? "border-bean-600 bg-bean-600 text-cream-50"
                        : "border-cream-300 bg-cream-50 text-ink-700 hover:bg-cream-200",
                    )}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
          </div>

          <dl className="space-y-1.5 border-t border-cream-300 pt-3 text-base">
            <Row label="Subtotal" value={formatMoney(toAmountString(totals.subtotalPaisa))} />

            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-700">Discount</dt>
              <dd>
                <input
                  value={discount}
                  onChange={(event) => onDiscountChange(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="Discount in rupees"
                  className="tabular w-24 min-h-touch rounded-control border border-cream-300 bg-cream-50 px-3 text-right text-base text-ink-900 focus:border-bean-500 focus:outline-none"
                />
              </dd>
            </div>

            <div className="flex items-baseline justify-between gap-3 border-t border-cream-300 pt-3">
              <dt className="font-display text-lg font-semibold text-ink-900">Total</dt>
              {/* The one number that must never be misread. */}
              <dd className="tabular text-3xl font-semibold leading-none text-bean-800">
                {formatMoney(toAmountString(totals.totalPaisa))}
              </dd>
            </div>
          </dl>

          {billingError ? <ErrorNote>{billingError}</ErrorNote> : null}

          <Button
            type="button"
            size="lg"
            fullWidth
            variant="paid"
            disabled={empty || Boolean(mobileError)}
            pending={generating}
            pendingLabel="Saving…"
            onClick={onGenerate}
          >
            Generate &amp; Print
            {empty ? "" : ` · ${formatMoneyCompact(toAmountString(totals.totalPaisa))}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-700">{label}</dt>
      <dd className="tabular font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function StepperButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-control border border-cream-300 bg-cream-50 text-xl font-semibold text-ink-900 transition-colors hover:bg-cream-200 touch-manipulation"
    >
      {children}
    </button>
  );
}
