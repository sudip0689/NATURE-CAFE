import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { kolkataDayAfter, kolkataDayStart } from "@/lib/datetime";
import { BillList, type BillListRow } from "@/components/bill-list";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Bills · Nature Caffe" };

export default async function OwnerBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q = "", from = "", to = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("bills")
    .select(
      "id, bill_number, customer_name, customer_mobile, total, payment_method, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const needle = q.trim().replace(/[%,()]/g, "");
  if (needle) {
    // One box for both: an owner looking something up has either the bill
    // number on a slip or the customer's phone number, and shouldn't have to
    // decide which field they're searching.
    query = query.or(
      `bill_number.ilike.%${needle}%,customer_mobile.ilike.%${needle}%`,
    );
  }
  if (from) query = query.gte("created_at", kolkataDayStart(from));
  if (to) query = query.lt("created_at", kolkataDayAfter(to));

  const { data } = await query;
  const bills: BillListRow[] = data ?? [];
  const filtering = Boolean(needle || from || to);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900">
          Bills
        </h1>
        <p className="mt-1 text-ink-500">
          Every bill the counter has issued. Open one to view or reprint it.
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <label htmlFor="q" className="block text-sm font-medium text-ink-700">
            Bill number or mobile
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="NC000123 or 9876543210"
            className="w-full min-h-touch rounded-control border border-cream-300 bg-cream-50 px-4 text-base text-ink-900 placeholder:text-ink-400 focus:border-bean-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="from" className="block text-sm font-medium text-ink-700">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="min-h-touch rounded-control border border-cream-300 bg-cream-50 px-4 text-base text-ink-900 focus:border-bean-500 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="to" className="block text-sm font-medium text-ink-700">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="min-h-touch rounded-control border border-cream-300 bg-cream-50 px-4 text-base text-ink-900 focus:border-bean-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="inline-flex min-h-touch items-center rounded-control border border-cream-300 bg-cream-50 px-5 text-base font-medium text-ink-900 hover:bg-cream-100"
        >
          Search
        </button>

        {filtering ? (
          <Link
            href="/owner/bills"
            className="inline-flex min-h-touch items-center rounded-control px-4 text-base font-medium text-ink-700 hover:bg-cream-200"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {bills.length === 0 ? (
        <EmptyState
          title={filtering ? "No bills match that" : "No bills yet"}
          hint={
            filtering
              ? "Try a different number, or widen the dates."
              : "Bills appear here as soon as the counter starts ringing up sales."
          }
        />
      ) : (
        <>
          <p className="text-sm text-ink-500">
            {bills.length === 1 ? "1 bill" : `${bills.length} bills`}
            {bills.length === 200 ? " (showing the most recent 200)" : ""}
          </p>
          <BillList bills={bills} />
        </>
      )}
    </div>
  );
}
