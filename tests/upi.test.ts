import { describe, expect, it } from "vitest";

import { buildUpiUri } from "@/lib/upi";

describe("UPI link", () => {
  it("builds the pa/pn link the spec shows", () => {
    const uri = buildUpiUri({
      upiId: "naturecaffe@okhdfcbank",
      merchantName: "Nature Caffe",
    })!;
    expect(uri.startsWith("upi://pay?")).toBe(true);
    expect(uri).toContain("pa=naturecaffe%40okhdfcbank");
    expect(uri).toContain("pn=Nature%20Caffe");
  });

  it("encodes spaces as %20, never as +", () => {
    // Some UPI apps read a literal "+" in pn/tn rather than decoding it.
    const uri = buildUpiUri({ upiId: "a@b", merchantName: "Nature Caffe" })!;
    expect(uri).not.toContain("+");
  });

  it("carries the amount and currency when there is one", () => {
    const uri = buildUpiUri({
      upiId: "a@b",
      merchantName: "X",
      amount: "410.00",
    })!;
    expect(uri).toContain("am=410.00");
    expect(uri).toContain("cu=INR");
  });

  it("omits the amount for a plain merchant QR", () => {
    const uri = buildUpiUri({ upiId: "a@b", merchantName: "X" })!;
    expect(uri).not.toContain("am=");
    expect(uri).not.toContain("cu=");
  });

  it("returns null when no UPI ID is configured", () => {
    // Drives the receipt's "prints without a QR" path.
    expect(buildUpiUri({ upiId: "", merchantName: "X" })).toBeNull();
    expect(buildUpiUri({ upiId: "   ", merchantName: "X" })).toBeNull();
  });

  it("falls back to a merchant name rather than sending an empty one", () => {
    const uri = buildUpiUri({ upiId: "a@b", merchantName: "  " })!;
    expect(uri).toContain("pn=Nature%20Caffe");
  });
});
