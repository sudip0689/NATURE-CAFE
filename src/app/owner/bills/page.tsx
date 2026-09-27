import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { kolkataDayAfter, kolkataDayStart, todayInKolkata } from "@/lib/datetime";
import { BillList, type BillListRow } from "@/components/bill-list";
import { DeleteBillButton } from "./delete-bill";
import { ExportBills } from "./export-bills";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/shell/page";
import { DateRangeForm } from "@/components/shell/date-range-form";

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
    // Deleted bills are still rows; every read has to say it wants live ones.
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const needle = q.trim().replace(/[%,()]/g, "");
  if (needle) {
    // One box for both: whoever is looking something up has either the bill
    // number on a slip or the customer's phone, and shouldn't have to choose.
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
    <>
      <PageHeader
        title="Bills"
        description="Every bill the counter has issued."
        action={
          filtering ? (
            <Link
              href="/owner/bills"
              className="inline-flex h-11 items-center rounded-full border border-brandline px-4 text-sm font-medium text-brandmuted transition-colors hover:bg-mint hover:text-forest"
            >
              Clear
            </Link>
          ) : undefined
        }
      />

      <ExportBills q={q} from={from} to={to} filtering={filtering} />

      <DateRangeForm from={from} to={to} max={todayInKolkata()}>
        <label className="w-full min-w-0 sm:w-auto sm:flex-1">
          <span className="mb-1 block text-meta font-medium text-brandmuted">
            Bill number or mobile
          </span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="NC000123 or 9876543210"
            className="h-11 w-full rounded-xl border border-brandline bg-white px-3 text-[0.85rem] text-brandink placeholder:text-brandmuted/60 focus:border-leaf focus:outline-none"
          />
        </label>
      </DateRangeForm>

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
          <p className="mb-2 text-meta text-brandmuted">
            {bills.length === 1 ? "1 bill" : `${bills.length} bills`}
            {bills.length === 200 ? " (most recent 200)" : ""}
          </p>
          <BillList
            bills={bills}
            /* Management only. The counter renders the same list without
               this, and delete_bill refuses a cashier regardless. */
            action={(bill) => <DeleteBillButton bill={bill} />}
          />
        </>
      )}
    </>
  );
}
