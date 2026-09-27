import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { formatDate, formatTime } from "@/lib/datetime";
import { buildUpiUri } from "@/lib/upi";
import type { ReceiptData } from "@/lib/printing";

/**
 * Everything the printer needs for one bill.
 *
 * Pulled out of the receipt page so the till can print straight after
 * delivering an order, without bouncing the cashier through a separate
 * screen and back. Both callers build the receipt from this one function,
 * which is the only way the preview on screen and the paper coming out of
 * the printer stay the same thing.
 */
export async function buildReceiptData(
  billId: string,
): Promise<{ data: ReceiptData; qrSvg: string | null; qrImageUrl: string | null } | null> {
  const supabase = await createClient();

  const [{ data: bill }, { data: items }, settings] = await Promise.all([
    supabase
      .from("bills")
      .select(
        "id, bill_number, customer_name, customer_mobile, subtotal, discount, total, payment_method, created_at",
      )
      .eq("id", billId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("bill_items")
      .select("product_name, quantity, unit_price, line_total, created_at")
      .eq("bill_id", billId)
      .order("created_at"),
    getSettings(),
  ]);

  if (!bill) return null;

  /**
   * A payment QR belongs on a UPI bill and nowhere else.
   *
   * A cash sale is settled before the receipt is torn off, so a "scan to pay"
   * code on it is at best noise and at worst an invitation to pay twice. It
   * also costs several centimetres of a 58 mm roll on every single order.
   */
  const wantsUpiQr = bill.payment_method === "upi";

  const upiUri =
    wantsUpiQr && settings?.upi_id
      ? buildUpiUri({
          upiId: settings.upi_id,
          merchantName: settings.upi_name || settings.cafe_name,
          amount: bill.total,
          note: bill.bill_number,
        })
      : null;

  const qrImageUrl = wantsUpiQr ? (settings?.upi_qr_url ?? null) : null;

  // Rendered on the server rather than in the browser: if printing started
  // before a client-side script finished, the customer would get a blank
  // square where the QR should be.
  let qrSvg: string | null = null;
  if (upiUri && !qrImageUrl) {
    const QRCode = (await import("qrcode")).default;
    const raw = await QRCode.toString(upiUri, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
    });
    qrSvg = raw
      .replace(/width="[^"]*"/, 'width="100%"')
      .replace(/height="[^"]*"/, 'height="100%"');
  }

  const data: ReceiptData = {
    cafe: {
      name: settings?.cafe_name ?? "Nature Caffe",
      tagline: settings?.tagline ?? "",
      address: settings?.address ?? "",
      phone: settings?.phone ?? "",
      footer: settings?.receipt_footer ?? "",
    },
    bill: {
      number: bill.bill_number,
      // Formatted in Asia/Kolkata here — a printer has no notion of timezone.
      date: formatDate(bill.created_at),
      time: formatTime(bill.created_at),
      customerName: bill.customer_name,
      customerMobile: bill.customer_mobile,
      subtotal: bill.subtotal,
      discount: bill.discount,
      total: bill.total,
      paymentMethod: bill.payment_method,
    },
    lines: (items ?? []).map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
    })),
    upi: {
      id: settings?.upi_id ?? "",
      uri: upiUri,
      qrImageUrl,
    },
    paperWidthMm: 58,
  };

  return { data, qrSvg, qrImageUrl };
}
