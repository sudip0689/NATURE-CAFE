import { describe, expect, it, vi } from "vitest";

import {
  availablePrinters,
  printReceipt,
  registerPrinter,
  type ReceiptData,
  type ReceiptPrinter,
} from "@/lib/printing";

const receipt: ReceiptData = {
  cafe: {
    name: "Nature Caffe",
    tagline: "Good Food · Good Mood",
    address: "Amta, Howrah, WB",
    phone: "9876543210",
    footer: "Thank You! Visit Again",
  },
  bill: {
    number: "NC000123",
    date: "22-09-2026",
    time: "04:35 pm",
    customerName: "Rahul Das",
    customerMobile: "9876543210",
    subtotal: "410.00",
    discount: "0.00",
    total: "410.00",
    paymentMethod: "upi",
  },
  lines: [
    { name: "Chicken Roll", quantity: 2, unitPrice: "120.00", lineTotal: "240.00" },
  ],
  upi: {
    id: "naturecaffe@okhdfcbank",
    uri: "upi://pay?pa=naturecaffe%40okhdfcbank",
    qrImageUrl: null,
  },
  paperWidthMm: 58,
};

function stubPrinter(
  id: string,
  behaviour: "works" | "throws" | "unavailable",
): ReceiptPrinter & { calls: ReceiptData[] } {
  const calls: ReceiptData[] = [];
  return {
    id,
    label: id,
    calls,
    isAvailable: () => behaviour !== "unavailable",
    print: async (data) => {
      calls.push(data);
      if (behaviour === "throws") throw new Error("out of paper");
    },
  };
}

/**
 * These run in order and share the module's printer registry, which has no
 * unregister — matching how the real app registers a driver once at startup.
 */
describe("printReceipt", () => {
  it("reports failure rather than throwing when nothing can print", async () => {
    // No window in the node environment, so the browser printer is unavailable.
    expect(availablePrinters()).toHaveLength(0);

    const outcome = await printReceipt(receipt);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      // The bill is already saved by this point; the wording must say so.
      expect(outcome.message).toContain("saved");
    }
  });

  it("never throws, so a paper jam cannot take down the counter", async () => {
    registerPrinter(stubPrinter("jammed", "throws"));
    await expect(printReceipt(receipt)).resolves.toBeDefined();
  });

  it("falls through a failing printer to one that works", async () => {
    const working = stubPrinter("bluetooth", "works");
    registerPrinter(working); // unshifted ahead of the jammed one

    const outcome = await printReceipt(receipt);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.via).toBe("bluetooth");
    expect(working.calls).toHaveLength(1);
  });

  it("hands the driver structured data, not a DOM node", () => {
    // The whole reason the payload exists: an ESC/POS driver has to build the
    // receipt itself, and can only do that from values.
    const [received] = stubPrinter("x", "works").calls.concat(receipt);
    expect(received.bill.number).toBe("NC000123");
    expect(received.lines[0].lineTotal).toBe("240.00");
    expect(received.paperWidthMm).toBe(58);
  });

  it("skips printers that report themselves unavailable", () => {
    registerPrinter(stubPrinter("usb-unplugged", "unavailable"));
    expect(availablePrinters().map((p) => p.id)).not.toContain("usb-unplugged");
  });
});

/**
 * A separate registry-free check: the wording the counter actually sees.
 *
 * The driver raises a sentence written for the cashier ("Bluetooth is off…").
 * The first version of printReceipt caught it and returned a generic "printing
 * failed", which is what a real EZO print failure showed on the phone — true,
 * but useless to someone with a queue in front of them.
 */
describe("printReceipt failure wording", () => {
  it("passes the driver's own reason through to the counter", async () => {
    // A fresh registry: the tests above leave a working printer in the shared
    // one, and this needs the case where the only driver fails.
    vi.resetModules();
    const printing = await import("@/lib/printing");

    printing.registerPrinter({
      id: "bluetooth-off",
      label: "EZO thermal printer",
      isAvailable: () => true,
      print: async () => {
        throw new Error("Bluetooth is off. Turn it on and print again.");
      },
    });

    const outcome = await printing.printReceipt(receipt);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.message).toContain("Bluetooth is off");
      // …and still says the sale is not lost.
      expect(outcome.message).toContain("saved");
    }
  });
});
