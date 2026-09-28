import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { kolkataDayAfter, kolkataDayStart, todayInKolkata } from "@/lib/datetime";
import { BillList, type BillListRow } from "@/components/bill-list";
import { EmptyState } from "@/components/ui/states";
import { PageHeader, Section } from "@/components/shell/page";
import { DateRangeForm } from "@/components/shell/date-range-form";
import { StatTile } from "@/components/shell/stat-tile";

export const metadata = { title: "Sales · Nature Caffe" };

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayInKolkata();

  // Defaults to today — the question an owner asks ninety-nine times in a hundred.
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
      // Deleted bills are still rows; every read has to say it wants live ones.
      .is("deleted_at", null)
      // And a sale is a delivered order: an order still on the pass belongs in
      // Hold Orders, not in the takings.
      .eq("status", "delivered")
      .gte("created_at", kolkataDayStart(from))
      .lt("created_at", kolkataDayAfter(to))
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const bills: BillListRow[] = rows ?? [];
  const billCount = summary?.bill_count ?? 0;

  return (
    <>
      <PageHeader title="Sales" description="Totals for a date range, by payment." />

      <DateRangeForm from={from} to={to} max={today} />

      {/* Total is the headline and spans the row; the rest are equals below. */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatTile
          className="col-span-2"
          tone="green"
          label="Total sales"
          value={formatMoney(summary?.total_sales ?? "0")}
          note={billCount === 0 ? "No sales in this range" : `${billCount} bills`}
        />
        <StatTile label="Cash" value={formatMoney(summary?.cash_sales ?? "0")} />
        <StatTile label="UPI" value={formatMoney(summary?.upi_sales ?? "0")} />
        <StatTile label="Card" value={formatMoney(summary?.card_sales ?? "0")} />
        <StatTile label="Bills" value={String(billCount)} />
      </div>

      <Section title={bills.length ? `Bills (${bills.length})` : undefined}>
        {bills.length === 0 ? (
          <EmptyState
            title="No sales in this range"
            hint="Pick a different date range, or wait for the counter to ring one up."
          />
        ) : (
          <BillList bills={bills} />
        )}
      </Section>
    </>
  );
}
