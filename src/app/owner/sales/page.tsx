import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import {
  kolkataDayAfter,
  kolkataDayStart,
  todayInKolkata,
} from "@/lib/datetime";
import { StatCard } from "@/components/ui/card";
import { BillList, type BillListRow } from "@/components/bill-list";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Sales · Nature Caffe" };

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayInKolkata();

  // Defaults to today, which is the question an owner asks ninety-nine times
  // out of a hundred.
  const from = params.from || today;
  const to = params.to || today;

  const supabase = await createClient();

  const [{ data: summary }, { data: rows }] = await Promise.all([
    supabase.rpc("get_sales_summary", { p_from: from, p_to: to }).single(),
    supabase
      .from("bills")
      .select(
        "id, bill_number, customer_name, customer_mobile, total, payment_method, created_at",
      )
      .gte("created_at", kolkataDayStart(from))
      .lt("created_at", kolkataDayAfter(to))
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const bills: BillListRow[] = rows ?? [];
  const billCount = summary?.bill_count ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900">
          Sales
        </h1>
        <p className="mt-1 text-ink-500">
          Totals for a date range, split by how the customer paid.
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="from" className="block text-sm font-medium text-ink-700">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            max={today}
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
            max={today}
            className="min-h-touch rounded-control border border-cream-300 bg-cream-50 px-4 text-base text-ink-900 focus:border-bean-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="inline-flex min-h-touch items-center rounded-control border border-cream-300 bg-cream-50 px-5 text-base font-medium text-ink-900 hover:bg-cream-100"
        >
          Show
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total sales"
          value={formatMoney(summary?.total_sales ?? "0")}
          tone="paid"
        />
        <StatCard label="Bills" value={String(billCount)} />
        <StatCard label="Cash" value={formatMoney(summary?.cash_sales ?? "0")} />
        <StatCard label="UPI" value={formatMoney(summary?.upi_sales ?? "0")} />
        <StatCard label="Card" value={formatMoney(summary?.card_sales ?? "0")} />
      </div>

      {bills.length === 0 ? (
        <EmptyState
          title="No sales in this range"
          hint="Pick a different date range, or wait for the counter to ring one up."
        />
      ) : (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            Bills in this range
          </h2>
          <BillList bills={bills} />
        </section>
      )}
    </div>
  );
}
