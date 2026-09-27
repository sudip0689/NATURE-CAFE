"use server";

import { revalidatePath } from "next/cache";

import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface DeleteBillResult {
  ok: boolean;
  message: string;
}

/**
 * Removes a bill rung up in error.
 *
 * Soft: the row stays, marked. bill_items.bill_id cascades, so a real DELETE
 * would take every line of the order with it, and bill_number is unique and
 * drawn from a sequence — the number would be gone from the record with
 * nothing to say why. Marking it keeps the lines, the number and the audit
 * trail while the bill disappears from the list, from search, from the
 * dashboard and from every sales total.
 *
 * Two gates, deliberately. requireOwner() here, so the billing counter cannot
 * reach this at all; and the role check inside delete_bill, so the rule holds
 * even if something else ever calls the function.
 */
export async function deleteBill(billId: string): Promise<DeleteBillResult> {
  const user = await requireOwner();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("delete_bill", {
    p_actor: user.profile.id,
    p_bill_id: billId,
  });

  if (error) {
    // The two the database raises on purpose, said the way the café would.
    if (error.code === "42501") {
      return { ok: false, message: "Only café management can delete a bill." };
    }
    if (error.code === "P0002") {
      return { ok: false, message: "That bill is no longer there to delete." };
    }
    return { ok: false, message: "The bill could not be deleted. Try again." };
  }

  // Everywhere a bill count, a total or a list is rendered. Without this the
  // list the café is looking at still shows the bill it just deleted, which
  // reads as the delete having failed.
  revalidatePath("/owner/bills");
  revalidatePath("/owner/sales");
  revalidatePath("/owner/reports");
  revalidatePath("/owner");
  revalidatePath("/bills");

  return { ok: true, message: `Bill ${data} deleted successfully.` };
}
