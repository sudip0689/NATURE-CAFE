import { createClient } from "@/lib/supabase/server";
import { formatMoney, toPaisa } from "@/lib/money";
import { daysAgoInKolkata, formatDateLong, todayInKolkata } from "@/lib/datetime";
import { StatCard, Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Reports · Nature Caffe" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayInKolkata();

  // Last seven days by default — long enough to show a pattern, short enough
  // that the table fits on one screen.
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

  // Bar widths are relative to the best-selling item, not to total revenue —
  // proportions between items are what the eye is actually comparing here.
  const topRevenue = items.length ? toPaisa(items[0].revenue) : 0;

  const busiest = days.reduce<(typeof days)[number] | null>(
    (best, day) =>
      !best || toPaisa(day.total_sales) > toPaisa(best.total_sales) ? day : best,
    null,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900">
          Reports
        </h1>
        <p className="mt-1 text-ink-500">
          How the café did, day by day, and what people are ordering.
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total sales"
          value={formatMoney(summary?.total_sales ?? "0")}
          note={busiest ? `Best day ${formatDateLong(busiest.day)}` : undefined}
          tone="paid"
        />
        <StatCard label="Bills" value={String(summary?.bill_count ?? 0)} />
        <StatCard label="Cash" value={formatMoney(summary?.cash_sales ?? "0")} />
        <StatCard label="UPI" value={formatMoney(summary?.upi_sales ?? "0")} />
        <StatCard label="Card" value={formatMoney(summary?.card_sales ?? "0")} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-ink-900">
          Day by day
        </h2>

        {days.length === 0 ? (
          <EmptyState
            title="No sales in this range"
            hint="Pick a wider range, or wait for the counter to ring one up."
          />
        ) : (
          <Card className="overflow-hidden">
            {/* The only table in the app that can't collapse to cards — six
                numeric columns compared across rows is the whole point of it.
                So it scrolls sideways on a phone instead. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-cream-300 text-left text-xs uppercase tracking-[0.08em] text-ink-500">
                    <th scope="col" className="px-4 py-3 font-medium">Date</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Bills</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Cash</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">UPI</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Card</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {days.map((day) => (
                    <tr key={day.day}>
                      <th scope="row" className="px-4 py-3 text-left font-medium text-ink-900">
                        {formatDateLong(day.day)}
                      </th>
                      <td className="tabular px-4 py-3 text-right text-ink-700">
                        {day.bill_count}
                      </td>
                      <td className="tabular px-4 py-3 text-right text-ink-700">
                        {formatMoney(day.cash_sales)}
                      </td>
                      <td className="tabular px-4 py-3 text-right text-ink-700">
                        {formatMoney(day.upi_sales)}
                      </td>
                      <td className="tabular px-4 py-3 text-right text-ink-700">
                        {formatMoney(day.card_sales)}
                      </td>
                      <td className="tabular px-4 py-3 text-right font-semibold text-ink-900">
                        {formatMoney(day.total_sales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {days.length > 0 ? (
          <p className="text-sm text-ink-500">
            Days with no sales are left out rather than shown as zero.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-ink-900">
          Top items
        </h2>

        {items.length === 0 ? (
          <EmptyState
            title="Nothing sold in this range"
            hint="Once bills start coming in, the best sellers show up here."
          />
        ) : (
          <Card className="divide-y divide-cream-200">
            {items.map((item) => {
              const share = topRevenue
                ? Math.max(2, Math.round((toPaisa(item.revenue) / topRevenue) * 100))
                : 0;

              return (
                <div key={item.product_name} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 flex-1 truncate font-medium text-ink-900">
                      {item.product_name}
                    </span>
                    <span className="tabular text-sm text-ink-500">
                      {item.quantity_sold} sold
                    </span>
                    <span className="tabular w-24 text-right font-semibold text-ink-900">
                      {formatMoney(item.revenue)}
                    </span>
                  </div>
                  {/* Relative bar, not a chart — it answers "roughly how much
                      more than the next one" without any library. */}
                  <div
                    className="mt-2 h-1.5 rounded-full bg-cream-200"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-bean-400"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        <p className="text-sm text-ink-500">
          Grouped by the name on the receipt. Renaming an item starts a new line
          here — past bills keep the name they were sold under.
        </p>
      </section>
    </div>
  );
}
