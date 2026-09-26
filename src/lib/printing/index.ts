import type { PrintOutcome, ReceiptData, ReceiptPrinter } from "./types";

export type { PrintOutcome, ReceiptData, ReceiptLine, ReceiptPrinter } from "./types";

interface AndroidPrintBridge {
  printReceipt(receiptJson: string): string;
}

function androidBridge(): AndroidPrintBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { NatureCaffeAndroid?: AndroidPrintBridge })
    .NatureCaffeAndroid;
  return bridge && typeof bridge.printReceipt === "function" ? bridge : null;
}

/**
 * The browser printer: prints the receipt route that is already on screen,
 * styled to 58 mm by the `@media print` rules in globals.css.
 *
 * It ignores the ReceiptData argument — the DOM already holds the same values.
 * A future ESC/POS printer will not ignore it, which is the whole reason the
 * argument exists.
 */
const browserPrinter: ReceiptPrinter = {
  id: "browser",
  label: "Browser print",
  isAvailable: () =>
    typeof window !== "undefined" &&
    typeof window.print === "function" &&
    // Not inside the Android wrapper. A WebView's window.print() is a silent
    // no-op, so leaving this enabled there would let a failed Bluetooth print
    // fall through to it and report success with no paper out of the printer.
    androidBridge() === null,
  print: async () => {
    window.print();
  },
};

/**
 * The Android wrapper's thermal printer.
 *
 * The native side owns the Bluetooth connection and the ESC/POS bytes; this
 * is only the handover. It takes precedence over the browser printer because
 * it is only ever "available" inside the wrapper, where window.print() does
 * nothing useful anyway — a WebView has no print dialog of its own, and the
 * counter wants paper out of the EZO, not a system print sheet.
 *
 * The native method is synchronous and returns "OK" or a sentence to show the
 * cashier, so a failure here surfaces the same way any other print failure
 * does.
 */
const androidThermalPrinter: ReceiptPrinter = {
  id: "android-escpos",
  label: "EZO thermal printer",
  isAvailable: () => androidBridge() !== null,
  print: async (receipt) => {
    const bridge = androidBridge();
    if (!bridge) throw new Error("The printer bridge is not available.");

    const result = bridge.printReceipt(JSON.stringify(receipt));
    // Anything but OK is a message written for the person at the counter.
    if (result !== "OK") throw new Error(result);
  },
};

/**
 * Registered printers, most specific first. A Bluetooth or USB driver
 * registers itself ahead of the browser at startup and takes over; nothing in
 * the billing UI changes when that happens.
 */
const printers: ReceiptPrinter[] = [androidThermalPrinter, browserPrinter];

export function registerPrinter(printer: ReceiptPrinter): void {
  printers.unshift(printer);
}

export function availablePrinters(): ReceiptPrinter[] {
  return printers.filter((printer) => {
    try {
      return printer.isAvailable();
    } catch {
      return false;
    }
  });
}

/**
 * Print a receipt on the best available printer.
 *
 * Never throws. A café counter mid-queue cannot afford an unhandled rejection,
 * and "the printer is out of paper" must not lose the sale — the bill is
 * already saved in the database by the time this runs, so a failure here is a
 * reprint, not a lost transaction. That ordering is the point.
 */
export async function printReceipt(receipt: ReceiptData): Promise<PrintOutcome> {
  const candidates = availablePrinters();

  if (candidates.length === 0) {
    return {
      ok: false,
      via: null,
      message: "No printer is available on this device. The bill is saved — you can reprint it later.",
    };
  }

  for (const printer of candidates) {
    try {
      await printer.print(receipt);
      return { ok: true, via: printer.id };
    } catch {
      // Try the next one rather than giving up on the first failure.
      continue;
    }
  }

  return {
    ok: false,
    via: null,
    message: "Printing failed. The bill is saved — try reprinting from Bills.",
  };
}
