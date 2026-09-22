import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/datetime";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/states";

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
    <main className="mx-auto w-full max-w-lg px-5 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href={backHref} className="text-sm text-ink-500 hover:text-ink-900">
          ← Bills
        </Link>
        <Link
          href="/pos"
          className="inline-flex min-h-touch items-center rounded-control px-4 text-base font-medium text-ink-700 hover:bg-cream-200"
        >
          Back to till
        </Link>
      </div>

      <Card className="p-6">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-cream-300 pb-4">
          <div>
            <p className="tabular font-display text-xl font-semibold text-ink-900">
              {bill.bill_number}
            </p>
            <p className="mt-1 text-sm text-ink-500">
              {formatDate(bill.created_at)} · {formatTime(bill.created_at)}
            </p>
          </div>
          <Badge tone="paid">{PAYMENT_LABEL[bill.payment_method]}</Badge>
        </header>

        <dl className="grid grid-cols-2 gap-3 border-b border-cream-300 py-4 text-sm">
          <div>
            <dt className="text-ink-500">Customer</dt>
            <dd className="mt-0.5 font-medium text-ink-900">{bill.customer_name}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Mobile</dt>
            <dd className="tabular mt-0.5 font-medium text-ink-900">
              {bill.customer_mobile ?? "—"}
            </dd>
          </div>
        </dl>

        <ul className="divide-y divide-cream-200 py-2">
          {(items ?? []).map((item) => (
            <li key={item.id} className="flex items-baseline gap-3 py-2.5">
              <span className="flex-1 text-ink-900">{item.product_name}</span>
              <span className="tabular text-sm text-ink-500">
                {item.quantity} × {formatMoneyCompact(item.unit_price)}
              </span>
              <span className="tabular w-20 text-right font-medium text-ink-900">
                {formatMoneyCompact(item.line_total)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 border-t border-cream-300 pt-4">
          <div className="flex justify-between">
            <dt className="text-ink-700">Subtotal</dt>
            <dd className="tabular font-medium text-ink-900">
              {formatMoney(bill.subtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-700">Discount</dt>
            <dd className="tabular font-medium text-ink-900">
              {formatMoney(bill.discount)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-cream-300 pt-3">
            <dt className="font-display text-lg font-semibold text-ink-900">Total</dt>
            <dd className="tabular text-2xl font-semibold text-bean-800">
              {formatMoney(bill.total)}
            </dd>
          </div>
        </dl>
      </Card>

      <div className="mt-4">
        <Link
          href={`/bills/${bill.id}/print`}
          className="inline-flex min-h-touch-lg w-full items-center justify-center rounded-control bg-bean-600 px-5 text-base font-medium text-cream-50 hover:bg-bean-700"
        >
          Print receipt
        </Link>
      </div>
    </main>
  );
}
