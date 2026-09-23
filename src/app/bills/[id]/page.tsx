import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/datetime";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/states";
import { HeaderAction, PageHeader } from "@/components/shell/page";

export const metadata = { title: "Bill · Nature Caffe" };

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
};

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // No role check here on purpose: RLS already scopes this. An owner sees any
  // bill, a cashier only their own, and anyone else gets nothing back — so a
  // guessed URL returns a 404 rather than someone else's sale.
  const { data: bill } = await supabase
    .from("bills")
    .select(
      "id, bill_number, customer_name, customer_mobile, subtotal, discount, total, payment_method, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!bill) notFound();

  const { data: items } = await supabase
    .from("bill_items")
    .select("id, product_name, quantity, unit_price, line_total")
    .eq("bill_id", id)
    .order("created_at");

  const backHref = user.profile.role === "owner" ? "/owner/bills" : "/bills";

  return (
    <div className="mx-auto w-full max-w-lg">
      <PageHeader
        title={bill.bill_number}
        description={`${formatDate(bill.created_at)} · ${formatTime(bill.created_at)}`}
        back={{ href: backHref, label: "Bills" }}
        action={<HeaderAction href="/pos">Till</HeaderAction>}
      />

      <Card className="p-4 sm:p-5">
        {/* No bill number or date here: PageHeader already carries both, and
            repeating them was costing a whole block of vertical space. */}
        <dl className="grid grid-cols-3 items-start gap-3 border-b border-brandline pb-3 text-meta">
          <div className="min-w-0">
            <dt className="text-brandmuted">Customer</dt>
            <dd className="mt-0.5 truncate text-card font-medium">
              {bill.customer_name}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-brandmuted">Mobile</dt>
            <dd className="tabular mt-0.5 truncate text-card font-medium">
              {bill.customer_mobile ?? "—"}
            </dd>
          </div>
          <div className="text-right">
            <dt className="sr-only">Payment</dt>
            <dd>
              <Badge tone="paid">{PAYMENT_LABEL[bill.payment_method]}</Badge>
            </dd>
          </div>
        </dl>

        <ul className="divide-y divide-brandline/60 py-1">
          {(items ?? []).map((item) => (
            <li key={item.id} className="flex items-baseline gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-card">
                {item.product_name}
              </span>
              <span className="tabular text-meta text-brandmuted">
                {item.quantity} × {formatMoneyCompact(item.unit_price)}
              </span>
              <span className="tabular w-16 text-right text-card font-medium">
                {formatMoneyCompact(item.line_total)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1 border-t border-brandline pt-3 text-card">
          <div className="flex justify-between">
            <dt className="text-brandmuted">Subtotal</dt>
            <dd className="tabular font-medium">{formatMoney(bill.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brandmuted">Discount</dt>
            <dd className="tabular font-medium">{formatMoney(bill.discount)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-brandline pt-2.5">
            <dt className="text-section font-bold text-forest">Total</dt>
            <dd className="tabular text-xl font-bold text-forest">
              {formatMoney(bill.total)}
            </dd>
          </div>
        </dl>
      </Card>

      <Link
        href={`/bills/${bill.id}/print`}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-coffee text-sm font-semibold text-white transition-colors hover:bg-caramel"
      >
        Print receipt
      </Link>
    </div>
  );
}
