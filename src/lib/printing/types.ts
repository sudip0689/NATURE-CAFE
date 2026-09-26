/**
 * Everything a printer needs to render a receipt.
 *
 * Deliberately plain data rather than a DOM node or a React tree: the browser
 * printer happens to print the page it's on, but an ESC/POS driver over
 * Bluetooth or USB has to *build* the receipt byte by byte, and it can only do
 * that from structured values. Designing the payload around the harder case is
 * what stops the billing UI getting welded to `window.print()`.
 */

export interface ReceiptLine {
  name: string;
  quantity: number;
  /** Rupee strings, as they came from the database. */
  unitPrice: string;
  lineTotal: string;
}

export interface ReceiptData {
  cafe: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    footer: string;
  };
  bill: {
    number: string;
    /** Pre-formatted in Asia/Kolkata — printers do not do timezones. */
    date: string;
    time: string;
    customerName: string;
    customerMobile: string | null;
    subtotal: string;
    discount: string;
    total: string;
    paymentMethod: string;
  };
  lines: ReceiptLine[];
  upi: {
    id: string;
    /** `upi://pay?…`, or null when no UPI ID is configured. */
    uri: string | null;
    /**
     * The owner's own bank QR, when they uploaded one.
     *
     * The browser printer never needed this — the page already has the image
     * on screen. A thermal printer does: it has to fetch and rasterise the
     * picture itself, and without the URL it could only print a QR generated
     * from the UPI ID, which is a different code than the one the customer
     * sees on the preview.
     */
    qrImageUrl: string | null;
  };
  /** Paper width in millimetres. 58 today; 80 is the other common roll. */
  paperWidthMm: number;
}

export type PrintOutcome =
  | { ok: true; via: string }
  | { ok: false; via: string | null; message: string };

export interface ReceiptPrinter {
  readonly id: string;
  readonly label: string;
  /** Cheap, synchronous-ish capability check. Never throws. */
  isAvailable(): boolean;
  print(receipt: ReceiptData): Promise<void>;
}
