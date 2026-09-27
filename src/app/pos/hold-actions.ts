"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface HoldOrderLine {
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface HoldOrder {
  id: string;
  bill_number: string;
  customer_name: string;
  customer_mobile: string | null;
  subtotal: string;
  discount: string;
  total: string;
  payment_method: string;
  created_at: string;
  /** Null only on bills that predate the hold workflow. */
  held_at: string | null;
  items: HoldOrderLine[];
}

/**
 * Every order still waiting to be handed over, oldest first.
 *
 * Oldest first because that is the order they should leave in, and because
 * the one that has been waiting longest is the one somebody is about to ask
 * about.
 *
 * The lines come back with the orders rather than on demand. A café has a
 * handful of these at once, and fetching them together means opening an order
 * is instant instead of a round trip while a customer waits at the counter.
 */
export async function listHoldOrders(): Promise<HoldOrder[]> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bills")
    .select(
      "id, bill_number, customer_name, customer_mobile, subtotal, discount, total, payment_method, created_at, held_at",
    )
    .eq("status", "hold")
    .is("deleted_at", null)
    .order("held_at", { ascending: true })
    .limit(100);

  if (error || !data || data.length === 0) return [];

  // Two queries rather than an embedded select: bills declares no
  // relationships in our hand-written types, so the join comes back untyped.
  // This is the same shape the Excel export uses.
  const ids = data.map((bill) => bill.id);
  const { data: lines } = await supabase
    .from("bill_items")
    .select("bill_id, product_name, quantity, unit_price, line_total, created_at")
    .in("bill_id", ids)
    .order("created_at");

  const byBill = new Map<string, HoldOrderLine[]>();
  for (const line of lines ?? []) {
    const list = byBill.get(line.bill_id) ?? [];
    list.push({
      product_name: line.product_name,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_total: line.line_total,
    });
    byBill.set(line.bill_id, list);
  }

  return data.map((bill) => ({
    id: bill.id,
    bill_number: bill.bill_number,
    customer_name: bill.customer_name,
    customer_mobile: bill.customer_mobile,
    subtotal: bill.subtotal,
    discount: bill.discount,
    total: bill.total,
    payment_method: bill.payment_method,
    created_at: bill.created_at,
    held_at: bill.held_at,
    items: byBill.get(bill.id) ?? [],
  }));
}

export interface DeliverResult {
  ok: boolean;
  /** Present on success, for the "print it now" step that follows. */
  order?: { id: string; number: string; total: string };
  message?: string;
}

/**
 * Hands the order over: hold → delivered, and only then is it a sale.
 *
 * The database refuses anything not currently on hold, so a double tap — or
 * two people delivering the same order from two screens — moves it once and
 * tells the second one plainly rather than quietly counting it twice.
 */
export async function deliverOrder(billId: string): Promise<DeliverResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("deliver_bill", {
    p_actor: user.profile.id,
    p_bill_id: billId,
  });

  if (error) {
    if (error.code === "P0002") {
      return { ok: false, message: "That order has already been delivered." };
    }
    if (error.code === "42501") {
      return { ok: false, message: "You are not allowed to deliver orders." };
    }
    return { ok: false, message: "The order could not be delivered. Try again." };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { ok: false, message: "The order could not be delivered. Try again." };
  }

  // It is a sale now, so everywhere that counts sales is stale.
  revalidatePath("/pos");
  revalidatePath("/owner/hold-orders");
  revalidatePath("/owner/bills");
  revalidatePath("/owner/sales");
  revalidatePath("/owner/reports");
  revalidatePath("/owner");
  revalidatePath("/bills");

  return {
    ok: true,
    order: { id: billId, number: row.out_bill_number, total: row.out_total },
  };
}
