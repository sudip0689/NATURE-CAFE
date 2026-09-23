import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/datetime";
import { buildUpiUri } from "@/lib/upi";
import type { ReceiptData } from "@/lib/printing";
import { Receipt } from "@/components/receipt";
import { PrintButton } from "./print-button";

export const metadata = { title: "Receipt · Nature Caffe" };

export default async function PrintReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();

  // Any signed-in user may reprint any bill — with two shared accounts there
  // is no per-user scoping left to apply, and a cashier reprinting a receipt
  // is the normal case the spec asks for.
  const [{ data: bill }, { data: items }, { data: settings }] = await Promise.all([
    supabase
      .from("bills")
      .select(
        "id, bill_number, customer_name, customer_mobile, subtotal, discount, total, payment_method, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("bill_items")
      .select("product_name, quantity, unit_price, line_total, created_at")
      .eq("bill_id", id)
      .order("created_at"),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (!bill) notFound();

  const upiUri = settings?.upi_id
    ? buildUpiUri({
        upiId: settings.upi_id,
        merchantName: settings.upi_name || settings.cafe_name,
        amount: bill.total,
        note: bill.bill_number,
      })
    : null;

  // Rendered here rather than in the browser: if the print dialog opened
  // before a client-side script finished, the customer would get a blank
  // square where the QR should be.
  let qrSvg: string | null = null;
  if (upiUri && !settings?.upi_qr_url) {
    const raw = await QRCode.toString(upiUri, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
    });
    // Let the 32 mm wrapper size it instead of the library's fixed pixels.
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
    upi: { id: settings?.upi_id ?? "", uri: upiUri },
    paperWidthMm: 58,
  };

  return (
    // A <div>, not a <main> — the shell already renders one around this.
    <div className="mx-auto w-full max-w-md">
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/bills/${bill.id}`}
          className="text-sm text-brandmuted hover:text-brandink"
        >
          ← Bill
        </Link>
        <Link
          href="/pos"
          className="inline-flex min-h-touch items-center rounded-control px-4 text-base font-medium text-brandink hover:bg-mint"
        >
          Back to till
        </Link>
      </div>

      <p className="no-print mb-3 text-center text-sm text-brandmuted">
        Preview at actual size — 58&nbsp;mm
      </p>

      {/* The preview and the print output are the same element. */}
      <div className="flex justify-center">
        <div className="rounded-card border border-brandline shadow-card">
          <Receipt data={data} qrSvg={qrSvg} qrImageUrl={settings?.upi_qr_url} />
        </div>
      </div>

      <div className="no-print mx-auto mt-6 max-w-xs">
        <PrintButton receipt={data} />

        {!upiUri && !settings?.upi_qr_url ? (
          <p className="mt-3 text-center text-sm text-brandmuted">
            No UPI ID configured, so the receipt prints without a QR. Add one in{" "}
            <Link href="/owner/settings" className="underline">
              Settings
            </Link>
            .
          </p>
        ) : (
          <p className="mt-3 text-center text-sm text-brandmuted">
            The QR shows the customer where to pay. It is not proof that they
            did — confirm payment yourself before handing over the receipt.
          </p>
        )}
      </div>
    </div>
  );
}
