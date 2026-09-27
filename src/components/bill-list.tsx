import type { ReactNode } from "react";

import Link from "next/link";

import { formatMoney } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/datetime";
import { PrinterIcon } from "@/components/icons";

export interface BillListRow {
  id: string;
  bill_number: string;
  customer_name: string;
  customer_mobile: string | null;
  total: string;
  payment_method: string;
  created_at: string;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
};

/**
 * One compact row per bill — number, customer, time, payment, total, reprint.
 *
 * Rows, not a table: at 360px a six-column table is four columns of ellipsis.
 * The row stays near 64px so a phone shows eight or nine bills at once instead
 * of three.
 *
 * Two sibling links rather than one wrapping the other — nesting interactive
 * elements is invalid, and "link, link" per row is worse for a screen reader
 * than slightly busier markup.
 */
export function BillList({
  bills,
  action,
}: {
  bills: BillListRow[];
  /**
   * An extra control per row, rendered after Reprint.
   *
   * A slot rather than a `deletable` flag, so this component stays the same
   * for the counter and for management and does not need to know that one of
   * them can delete. Both this and the page that supplies it are server
   * components, so handing a function across is fine.
   */
  action?: (bill: BillListRow) => ReactNode;
}) {
  return (
    <ul className="space-y-2">
      {bills.map((bill) => (
        <li key={bill.id}>
          <div className="flex items-center gap-1 rounded-2xl border border-brandline bg-white pr-1.5 transition-colors hover:border-leaf/40">
            <Link
              href={`/bills/${bill.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="tabular truncate text-card font-semibold text-brandink">
                    {bill.bill_number}
                  </span>
                  <span className="shrink-0 rounded-full bg-mint px-1.5 py-px text-[0.6rem] font-medium text-forest">
                    {PAYMENT_LABEL[bill.payment_method] ?? bill.payment_method}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-meta text-brandmuted">
                  <span className="truncate">{bill.customer_name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular shrink-0">
                    {formatTime(bill.created_at)}
                  </span>
                  <span aria-hidden="true" className="hidden min-[400px]:inline">
                    ·
                  </span>
                  <span className="tabular hidden shrink-0 min-[400px]:inline">
                    {formatDate(bill.created_at)}
                  </span>
                </span>
              </span>

              <span className="tabular shrink-0 text-card font-bold text-forest">
                {formatMoney(bill.total)}
              </span>
            </Link>

            <Link
              href={`/bills/${bill.id}/print`}
              aria-label={`Reprint bill ${bill.bill_number}`}
              title="Reprint"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-brandmuted transition-colors hover:bg-sand hover:text-coffee"
            >
              <PrinterIcon className="size-4" />
            </Link>

            {action?.(bill)}
          </div>
        </li>
      ))}
    </ul>
  );
}
