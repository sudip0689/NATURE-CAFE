import { requireOwner } from "@/lib/auth";
import { listHoldOrders } from "@/app/pos/hold-actions";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/shell/page";
import { HoldOrdersMonitor } from "./monitor";

export const metadata = { title: "Hold Orders · Nature Caffe" };

/**
 * What the kitchen still owes the room.
 *
 * A monitor, not a workstation. Management can see every waiting order and
 * open it to check what is on it, and that is all — delivering belongs at the
 * till where the food actually changes hands, and nothing here can change or
 * remove an order.
 */
export default async function OwnerHoldOrdersPage() {
  await requireOwner();
  const orders = await listHoldOrders();

  return (
    <>
      <PageHeader
        title="Hold Orders"
        description="Orders rung up and still waiting to be handed over."
      />

      {orders.length === 0 ? (
        <EmptyState
          title="Nothing waiting"
          hint="Every order that has been rung up has been handed over."
        />
      ) : (
        <HoldOrdersMonitor orders={orders} />
      )}
    </>
  );
}
