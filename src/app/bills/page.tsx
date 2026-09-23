import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BillList, type BillListRow } from "@/components/bill-list";
import { EmptyState } from "@/components/ui/states";
import { HeaderAction, PageHeader } from "@/components/shell/page";

export const metadata = { title: "Recent bills · Nature Caffe" };

export default async function RecentBillsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // RLS does the scoping: an owner sees the whole counter here, a cashier
  // sees only the bills they rang up.
  const { data } = await supabase
    .from("bills")
    .select(
      "id, bill_number, customer_name, customer_mobile, total, payment_method, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const bills: BillListRow[] = data ?? [];

  return (
    <>
      <PageHeader
        title="Recent bills"
        description={
          user.profile.role === "owner"
            ? "The last 50 bills from the counter."
            : "The last 50 bills you rang up."
        }
        action={<HeaderAction href="/pos">Till</HeaderAction>}
      />

      {bills.length === 0 ? (
        <EmptyState
          title="No bills yet"
          hint="Bills appear here as soon as the counter starts ringing up sales."
        />
      ) : (
        <BillList bills={bills} />
      )}
    </>
  );
}
