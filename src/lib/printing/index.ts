import type {
  PrintFailure,
  PrintOutcome,
  PrintStage,
  ReceiptData,
  ReceiptPrinter,
  StageListener,
} from "./types";

export type {
  PrintFailure,
  PrintOutcome,
  PrintStage,
  ReceiptData,
  ReceiptLine,
  ReceiptPrinter,
  StageListener,
} from "./types";

/**
 * The Android wrapper's side of the conversation.
 *
 * printReceipt returns immediately and the native side reports back through
 * the callback below. It has to work that way: a @JavascriptInterface method
 * that blocked until the Bluetooth write finished would also block the
 * JavaScript thread, so nothing it posted mid-print could be rendered until
 * the print was already over — which is exactly the interval the cashier
 * needs to see.
 */
interface AndroidPrintBridge {
  printReceipt(receiptJson: string, requestId: string): string;
  /** Opens Android's Bluetooth settings, for the "Connect Printer" offer. */
  openBluetoothSettings?(): void;
}

type BridgeEvent =
  | { type: "stage"; stage: PrintStage }
  | { type: "done" }
  | { type: "error"; reason: PrintFailure; message: string };

interface PrintWindow extends Window {
  NatureCaffeAndroid?: AndroidPrintBridge;
  /** Called by the native side. Installed lazily, once. */
  __natureCaffePrintEvent?: (requestId: string, payload: string) => void;
}

function printWindow(): PrintWindow | null {
  return typeof window === "undefined" ? null : (window as unknown as PrintWindow);
}

function androidBridge(): AndroidPrintBridge | null {
  const w = printWindow();
  const bridge = w?.NatureCaffeAndroid;
  return bridge && typeof bridge.printReceipt === "function" ? bridge : null;
}

/** True when the wrapper can offer to open Bluetooth settings. */
export function canOpenPrinterSettings(): boolean {
  const bridge = androidBridge();
  return Boolean(bridge && typeof bridge.openBluetoothSettings === "function");
}

export function openPrinterSettings(): void {
  androidBridge()?.openBluetoothSettings?.();
}

/** In-flight prints, keyed by the id the native side echoes back. */
const pending = new Map<string, (event: BridgeEvent) => void>();

function installEventReceiver(w: PrintWindow): void {
  if (w.__natureCaffePrintEvent) return;
  w.__natureCaffePrintEvent = (requestId, payload) => {
    const handler = pending.get(requestId);
    if (!handler) return;
    try {
      handler(JSON.parse(payload) as BridgeEvent);
    } catch {
      handler({
        type: "error",
        reason: "failed",
        message: "The printer sent back something unreadable.",
      });
    }
  };
}

/**
 * How long to wait for the native side before giving up on it.
 *
 * Only a backstop: connecting to a printer that is switched off fails in a
 * few seconds on its own. This covers the case where the reply never arrives
 * at all — the page navigated, the WebView was recreated — because a Print
 * button stuck on "Printing…" for ever is worse than one that admits defeat.
 */
const REPLY_TIMEOUT_MS = 45_000;

let nextRequestId = 0;

/**
 * The Android wrapper's thermal printer.
 *
 * The native side owns the Bluetooth connection and the ESC/POS bytes; this
 * is only the handover. It takes precedence over the browser printer because
 * it is only ever "available" inside the wrapper, where window.print() does
 * nothing useful anyway — a WebView has no print dialog of its own, and the
 * counter wants paper out of the EZO, not a system print sheet.
 */
const androidThermalPrinter: ReceiptPrinter = {
  id: "android-escpos",
  label: "EZO thermal printer",
  isAvailable: () => androidBridge() !== null,
  print: (receipt, onStage) =>
    new Promise<void>((resolve, reject) => {
      const w = printWindow();
      const bridge = androidBridge();
      if (!w || !bridge) {
        reject(new PrintError("failed", "The printer bridge is not available."));
        return;
      }

      installEventReceiver(w);

      const requestId = `print-${++nextRequestId}`;
      let settled = false;

      const finish = (error?: PrintError) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        pending.delete(requestId);
        if (error) reject(error);
        else resolve();
      };

      const timer = setTimeout(() => {
        finish(
          new PrintError(
            "failed",
            "The printer did not answer. Check it is switched on, then try again.",
          ),
        );
      }, REPLY_TIMEOUT_MS);

      pending.set(requestId, (event) => {
        if (event.type === "stage") onStage?.(event.stage);
        else if (event.type === "done") finish();
        else finish(new PrintError(event.reason, event.message));
      });

      // Anything but "queued" means the native side refused before starting.
      const accepted = bridge.printReceipt(JSON.stringify(receipt), requestId);
      if (accepted !== "queued") {
        finish(new PrintError("failed", accepted || "The printer could not be reached."));
      }
    }),
};

/**
 * The browser printer: prints the receipt route that is already on screen,
 * styled to 58 mm by the `@media print` rules in globals.css.
 *
 * It ignores the ReceiptData argument — the DOM already holds the same values.
 * The ESC/POS printer above does not, which is the whole reason the argument
 * exists.
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
  print: async (_receipt, onStage) => {
    onStage?.("printing");
    window.print();
  },
};

/** Carries the reason alongside the sentence, so the UI can offer the fix. */
export class PrintError extends Error {
  readonly reason: PrintFailure;

  constructor(reason: PrintFailure, message: string) {
    super(message);
    this.name = "PrintError";
    this.reason = reason;
  }
}

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
export async function printReceipt(
  receipt: ReceiptData,
  onStage?: StageListener,
): Promise<PrintOutcome> {
  const candidates = availablePrinters();

  if (candidates.length === 0) {
    return {
      ok: false,
      via: null,
      reason: "disconnected",
      message: reassure("No printer is available on this device."),
    };
  }

  onStage?.("preparing");

  // Kept from the first (most preferred) printer that failed. A driver raises
  // a sentence written for the counter — "Bluetooth is off", "check it is
  // switched on and in range" — and swallowing that in favour of a generic
  // "printing failed" leaves the cashier with a queue and nothing to act on.
  let first: PrintError | null = null;

  for (const printer of candidates) {
    try {
      await printer.print(receipt, onStage);
      return { ok: true, via: printer.id };
    } catch (error) {
      if (first === null) {
        first =
          error instanceof PrintError
            ? error
            : new PrintError(
                "failed",
                error instanceof Error && error.message.trim() ? error.message.trim() : "",
              );
      }
      // Try the next one rather than giving up on the first failure.
      continue;
    }
  }

  return {
    ok: false,
    via: null,
    reason: first?.reason ?? "failed",
    message: reassure(first?.message || "Printing failed."),
  };
}

/**
 * Every failure message ends the same way, and it is not decoration.
 *
 * The bill is written to the database before any of this runs, so a printer
 * that will not print has cost a reprint, not a sale. Saying so here rather
 * than in the button means any future caller — an automatic print at
 * checkout, say — gets the same reassurance without having to remember it.
 */
function reassure(reason: string): string {
  return `${reason} The bill is saved — you can reprint it from Bills.`;
}
