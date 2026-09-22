"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { billingErrorMessage } from "@/lib/billing-errors";
import { normaliseMobile } from "@/lib/validation";
import type { PaymentMethod } from "@/lib/supabase/types";

export interface BillRequest {
  items: ReadonlyArray<{ product_id: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerMobile: string;
  discount: string;
  /** Idempotency key, one per order, reused across retries. */
  requestId: string;
}

export interface BillResult {
  error: string | null;
  bill: { id: string; number: string; total: string } | null;
}

/**
 * Hands the order to create_bill.
 *
 * Note what is *not* sent: prices. The cart knows them for display, but the
 * server reads every one from the products table. A price that travelled
 * through a browser is a price a browser could have edited.
 */
export async function generateBill(request: BillRequest): Promise<BillResult> {
  // The actor comes from the session cookie on the server, never from the
  // client payload — the one place the caller's identity is still decided.
  const user = await requireUser();

  if (request.items.length === 0) {
    return { error: billingErrorMessage("EMPTY_CART"), bill: null };
  }

  const mobile = request.customerMobile.trim()
    ? normaliseMobile(request.customerMobile)
    : null;

  if (request.customerMobile.trim() && !mobile) {
    return { error: billingErrorMessage("BAD_MOBILE"), bill: null };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("create_bill", {
      p_actor: user.id,
      p_items: request.items as unknown as never,
      p_payment_method: request.paymentMethod,
      p_customer_name: request.customerName.trim() || null,
      p_customer_mobile: mobile,
      p_discount: request.discount.trim() || "0",
      p_request_id: request.requestId,
    })
    .single();

  if (error || !data) {
    return { error: billingErrorMessage(error?.message), bill: null };
  }

  revalidatePath("/owner");
  revalidatePath("/owner/sales");
  revalidatePath("/owner/bills");
  revalidatePath("/bills");

  return {
    error: null,
    bill: { id: data.out_id, number: data.out_bill_number, total: data.out_total },
  };
}
