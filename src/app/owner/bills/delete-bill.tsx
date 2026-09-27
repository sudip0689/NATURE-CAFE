"use client";

import { useCallback, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";
import { deleteBill } from "./actions";

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
};

export interface DeletableBill {
  id: string;
  bill_number: string;
  total: string;
  payment_method: string;
}

/**
 * Delete, behind a confirmation that shows what is about to go.
 *
 * Deliberately not a one-tap action. This sits in a list of rows a thumb
 * scrolls past, next to Reprint, and the two are a few millimetres apart on a
 * phone — so the destructive one has to state which bill, for how much, and
 * that it cannot be undone before it will do anything.
 */
export function DeleteBillButton({ bill }: { bill: DeletableBill }) {
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = useCallback(() => {
    setProblem(null);
    startTransition(async () => {
      const result = await deleteBill(bill.id);
      if (result.ok) {
        // The list is revalidated by the action, so the row goes on its own.
        setAsking(false);
      } else {
        setProblem(result.message);
      }
    });
  }, [bill.id]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        aria-label={`Delete bill ${bill.bill_number}`}
        title="Delete"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-brandmuted transition-colors hover:bg-alert-50 hover:text-alert-600"
      >
        <TrashIcon className="size-5" />
      </button>

      {asking ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete this bill?"
          className="fixed inset-0 z-50 flex items-center justify-center bg-brandink/60 p-4"
        >
          <Card className="w-full max-w-sm p-6">
            <h2 className="font-display text-lg font-semibold text-brandink">
              Delete this bill?
            </h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-brandmuted">Bill</dt>
                <dd className="font-medium text-brandink">{bill.bill_number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brandmuted">Amount</dt>
                <dd className="font-medium text-brandink">{formatMoney(bill.total)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-brandmuted">Payment</dt>
                <dd className="font-medium text-brandink">
                  {PAYMENT_LABEL[bill.payment_method] ?? bill.payment_method}
                </dd>
              </div>
            </dl>

            <p className="mt-4 rounded-control border border-alert-500/30 bg-alert-50 px-4 py-3 text-sm text-alert-600">
              This action cannot be undone.
            </p>

            {problem ? (
              <div className="mt-3">
                <ErrorNote>{problem}</ErrorNote>
              </div>
            ) : null}

            {/* The destructive one second, and the whole width apart from
                Cancel: this dialog exists because the two were too close
                together in the row. */}
            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setAsking(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={confirm}
                pending={pending}
                pendingLabel="Deleting…"
              >
                Delete Bill
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
