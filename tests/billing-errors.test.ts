import { describe, expect, it } from "vitest";

import { billingErrorMessage } from "@/lib/billing-errors";

/** Every token create_bill can raise. */
const TOKENS = [
  "NOT_SIGNED_IN",
  "NOT_ALLOWED",
  "EMPTY_CART",
  "BAD_QUANTITY",
  "BAD_PAYMENT_METHOD",
  "BAD_MOBILE",
  "BAD_DISCOUNT",
  "PRODUCT_UNAVAILABLE",
];

describe("billing errors", () => {
  it("maps every token the RPC can raise", () => {
    for (const token of TOKENS) {
      const message = billingErrorMessage(token);
      expect(message).not.toContain(token);
      expect(message.length).toBeGreaterThan(20);
      // Sentences, not codes — this is read mid-sale with a customer waiting.
      expect(message).toMatch(/[.!]$/);
    }
  });

  it("matches a token inside a longer Postgres error string", () => {
    const raw =
      'new row violates... EMPTY_CART (SQLSTATE 22023) at RAISE, PL/pgSQL function create_bill';
    expect(billingErrorMessage(raw)).toBe(
      "Add at least one item before generating a bill.",
    );
  });

  it("never leaks SQL, codes or internals for an unmapped error", () => {
    const raw =
      'duplicate key value violates unique constraint "bills_bill_number_key" (SQLSTATE 23505)';
    const message = billingErrorMessage(raw);
    expect(message).toBe("Could not save the bill. Try again.");
    for (const leak of ["SQLSTATE", "constraint", "bills_", "23505", "pgSQL"]) {
      expect(message).not.toContain(leak);
    }
  });

  it("handles null and empty input without crashing", () => {
    expect(billingErrorMessage(null)).toBeTruthy();
    expect(billingErrorMessage(undefined)).toBeTruthy();
    expect(billingErrorMessage("")).toBeTruthy();
  });

  it("tells the cashier what to do about a stale cart", () => {
    // PRODUCT_UNAVAILABLE means an item vanished between tap and save.
    expect(billingErrorMessage("PRODUCT_UNAVAILABLE")).toContain("Clear the cart");
  });
});
