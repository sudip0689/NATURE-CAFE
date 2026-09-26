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

/**
 * Where a print has got to, reported as it happens rather than guessed.
 *
 * The counter needs to know the difference between "nothing is happening yet"
 * and "it is talking to the printer": connecting over Bluetooth to a printer
 * that is switched off takes several seconds before it fails, and a button
 * that just sits there looks broken. These come from the driver — the Android
 * side posts them as it works — so they describe what is actually going on.
 */
export type PrintStage = "preparing" | "connecting" | "printing";

export type StageListener = (stage: PrintStage) => void;

/**
 * Why a print failed, in the only two flavours the counter can act on.
 *
 * "disconnected" is anything fixed in Bluetooth settings — radio off, printer
 * not paired, printer off or out of range — so the UI can offer to open them.
 * "failed" is everything else, where the useful offer is simply to try again.
 */
export type PrintFailure = "disconnected" | "failed";

export type PrintOutcome =
  | { ok: true; via: string }
  | { ok: false; via: string | null; reason: PrintFailure; message: string };

export interface ReceiptPrinter {
  readonly id: string;
  readonly label: string;
  /** Cheap, synchronous-ish capability check. Never throws. */
  isAvailable(): boolean;
  print(receipt: ReceiptData, onStage?: StageListener): Promise<void>;
}
