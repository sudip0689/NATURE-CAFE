import Link from "next/link";

import { formatMoney } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/datetime";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/states";

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
 * One row per bill, readable at a glance. No table on mobile — a six-column
 * table at 375px is four columns of nothing and two of ellipsis.
 *
 * Two separate links rather than one wrapping link with a button inside it:
 * nesting interactive elements is invalid, and a screen reader announcing
 * "link, link" for one row is worse than the slightly busier markup.
 */
export function BillList({ bills }: { bills: BillListRow[] }) {
  return (
    <ul className="space-y-2">
      {bills.map((bill) => (
        <li key={bill.id}>
          <Card className="flex flex-wrap items-center gap-2 p-2 pr-3 transition-colors hover:bg-cream-100">
            <Link
              href={`/bills/${bill.id}`}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 rounded-control px-2 py-2"
            >
              <span className="tabular font-medium text-ink-900">
                {bill.bill_number}
              </span>

              <span className="text-sm text-ink-500">
                {formatDate(bill.created_at)} · {formatTime(bill.created_at)}
              </span>

              <span className="min-w-0 flex-1 truncate text-ink-700">
                {bill.customer_name}
                {bill.customer_mobile ? (
                  <span className="tabular ml-2 text-sm text-ink-400">
                    {bill.customer_mobile}
                  </span>
                ) : null}
              </span>

              <Badge tone="muted">{PAYMENT_LABEL[bill.payment_method]}</Badge>

              <span className="tabular w-24 text-right font-semibold text-ink-900">
                {formatMoney(bill.total)}
              </span>
            </Link>

            <Link
              href={`/bills/${bill.id}/print`}
              aria-label={`Reprint bill ${bill.bill_number}`}
              className="inline-flex min-h-touch shrink-0 items-center rounded-control border border-cream-300 bg-cream-50 px-4 text-sm font-medium text-ink-900 hover:bg-cream-200"
            >
              Reprint
            </Link>
          </Card>
        </li>
      ))}
    </ul>
  );
}
