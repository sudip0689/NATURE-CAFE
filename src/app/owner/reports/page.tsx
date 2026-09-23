import { createClient } from "@/lib/supabase/server";
import { formatMoney, toPaisa } from "@/lib/money";
import { daysAgoInKolkata, formatDateLong, todayInKolkata } from "@/lib/datetime";
import { EmptyState } from "@/components/ui/states";
import { PageHeader, ScrollableTable, Section } from "@/components/shell/page";
import { DateRangeForm } from "@/components/shell/date-range-form";
import { StatTile } from "@/components/shell/stat-tile";

export const metadata = { title: "Reports · Nature Caffe" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayInKolkata();

  // Last seven days: long enough to show a pattern, short enough to scan.
  const from = params.from || daysAgoInKolkata(6);
  const to = params.to || today;

  const supabase = await createClient();

  const [{ data: summary }, { data: daily }, { data: topItems }] =
    await Promise.all([
      supabase.rpc("get_sales_summary", { p_from: from, p_to: to }).single(),
      supabase.rpc("get_daily_sales", { p_from: from, p_to: to }),
      supabase.rpc("get_top_items", { p_from: from, p_to: to, p_limit: 10 }),
    ]);

  const days = daily ?? [];
  const items = topItems ?? [];

  // Bars are relative to the best seller, not to total revenue — proportion
  // between items is what the eye is comparing.
  const topRevenue = items.length ? toPaisa(items[0].revenue) : 0;

  return (
    <>
      <PageHeader title="Reports" description="Day by day, and what sells." />

      <DateRangeForm from={from} to={to} max={today} />

      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatTile
          className="col-span-2"
          tone="green"
          label="Total sales"
          value={formatMoney(summary?.total_sales ?? "0")}
          note={`${summary?.bill_count ?? 0} bills`}
        />
        <StatTile label="Cash" value={formatMoney(summary?.cash_sales ?? "0")} />
        <StatTile label="UPI" value={formatMoney(summary?.upi_sales ?? "0")} />
        <StatTile label="Card" value={formatMoney(summary?.card_sales ?? "0")} />
        <StatTile label="Bills" value={String(summary?.bill_count ?? 0)} />
      </div>

      <Section title="Day by day">
        {days.length === 0 ? (
          <EmptyState title="No sales in this range" hint="Try a wider range." />
        ) : (
          /* The one table that cannot become cards: six numeric columns
             compared across rows is the entire point of it. So this box
             scrolls sideways — the page never does. */
          <ScrollableTable>
            <table className="w-full min-w-[32rem] border-collapse text-meta">
              <thead>
                <tr className="border-b border-brandline text-left uppercase tracking-[0.06em] text-brandmuted">
                  <th scope="col" className="bg-white px-3 py-2 font-medium">Date</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Bills</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Cash</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">UPI</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Card</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brandline/60">
                {days.map((day) => (
                  <tr key={day.day}>
                    <th
                      scope="row"
                      className="whitespace-nowrap px-3 py-2 text-left text-card font-medium"
                    >
                      {formatDateLong(day.day)}
                    </th>
                    <td className="tabular px-3 py-2 text-right text-brandmuted">
                      {day.bill_count}
                    </td>
                    <td className="tabular px-3 py-2 text-right text-brandmuted">
                      {formatMoney(day.cash_sales)}
                    </td>
                    <td className="tabular px-3 py-2 text-right text-brandmuted">
                      {formatMoney(day.upi_sales)}
                    </td>
                    <td className="tabular px-3 py-2 text-right text-brandmuted">
                      {formatMoney(day.card_sales)}
                    </td>
                    <td className="tabular px-3 py-2 text-right font-bold text-forest">
                      {formatMoney(day.total_sales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        )}
        {days.length > 0 ? (
          <p className="mt-2 text-[0.68rem] text-brandmuted">
            Days with no sales are left out rather than shown as zero.
          </p>
        ) : null}
      </Section>

      <Section title="Top items">
        {items.length === 0 ? (
          <EmptyState title="Nothing sold in this range" hint="Best sellers show up here." />
        ) : (
          <ul className="divide-y divide-brandline/60 overflow-hidden rounded-2xl border border-brandline bg-white">
            {items.map((item) => {
              const share = topRevenue
                ? Math.max(2, Math.round((toPaisa(item.revenue) / topRevenue) * 100))
                : 0;
              return (
                <li key={item.product_name} className="px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-card font-medium">
                      {item.product_name}
                    </span>
                    <span className="tabular shrink-0 text-meta text-brandmuted">
                      {item.quantity_sold} sold
                    </span>
                    <span className="tabular w-20 shrink-0 text-right text-card font-bold text-forest">
                      {formatMoney(item.revenue)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-mint" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-leaf"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[0.68rem] text-brandmuted">
          Grouped by the name on the receipt — renaming an item starts a new line.
        </p>
      </Section>
    </>
  );
}
