/**
 * UPI payment links.
 *
 * A word on what this is and is not: the QR built from this URI tells the
 * customer *where* to send money. It is not, and must never be presented as,
 * evidence that they did. There is no gateway and no bank callback in this
 * system, so the cashier confirms receipt by looking at their own phone before
 * saving the bill. Nothing here should ever grow a "payment verified" badge.
 */

export interface UpiLinkInput {
  upiId: string;
  merchantName: string;
  /** Rupee string, e.g. "410.00". Omit for a plain merchant QR. */
  amount?: string;
  /** Shown in the customer's UPI app as the reference. */
  note?: string;
}

/**
 * Builds `upi://pay?pa=…&pn=…&am=…&cu=INR`.
 *
 * The amount is included when we have one. The spec's example shows just
 * `pa` + `pn`, but `am` needs no gateway and saves the customer keying the
 * total in at the counter — it changes nothing about verification.
 */
export function buildUpiUri({
  upiId,
  merchantName,
  amount,
  note,
}: UpiLinkInput): string | null {
  const pa = upiId.trim();
  if (!pa) return null;

  const params = new URLSearchParams();
  params.set("pa", pa);
  params.set("pn", merchantName.trim() || "Nature Caffe");
  if (amount) {
    params.set("am", amount);
    params.set("cu", "INR");
  }
  if (note) params.set("tn", note);

  // URLSearchParams encodes spaces as "+", which some UPI apps mishandle in
  // pn/tn. %20 is accepted everywhere.
  return `upi://pay?${params.toString().replace(/\+/g, "%20")}`;
}
