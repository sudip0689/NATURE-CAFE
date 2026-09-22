import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BillList, type BillListRow } from "@/components/bill-list";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Recent bills · Nature Caffe" };

export default async function RecentBillsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // RLS does the scoping: an owner sees the whole counter here, a cashier sees
  // only the bills they rang up. That's the "reprint permitted recent bills"
  // rule enforced in the database rather than by a WHERE clause we could forget.
  const { data } = await supabase
    .from("bills")
    .select(
      "id, bill_number, customer_name, customer_mobile, total, payment_method, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const bills: BillListRow[] = data ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900">
            Recent bills
          </h1>
          <p className="mt-1 text-ink-500">
            {user.profile.role === "owner"
              ? "The last 50 bills from the counter."
              : "The last 50 bills you rang up."}
          </p>
        </div>
        <Link
          href="/pos"
          className="inline-flex min-h-touch items-center rounded-control border border-cream-300 bg-cream-50 px-5 text-base font-medium text-ink-900 hover:bg-cream-100"
        >
          Back to till
        </Link>
      </header>

      {bills.length === 0 ? (
        <EmptyState
          title="No bills yet"
          hint="Bills appear here as soon as the counter starts ringing up sales."
        />
      ) : (
        <BillList bills={bills} />
      )}
    </main>
  );
}
