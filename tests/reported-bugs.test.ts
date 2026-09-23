import { describe, expect, it } from "vitest";

import { cartReducer, cartTotals, type CartLine } from "@/lib/cart";
import { DEFAULT_CUSTOMER_NAME, validateMobile } from "@/lib/validation";

/**
 * The exact sequences from the bug report, kept as regression tests.
 *
 * Two of the three reported bugs could not be reproduced: the cart reducer and
 * the optional-customer rules already behaved as specified, and the database
 * agreed when create_bill was called directly with empty customer fields.
 * Rather than rewrite working billing code on a hunch, the reported steps are
 * written out here so the behaviour is pinned and any future regression is
 * caught by `npm test` instead of by a cashier mid-sale.
 */

const roll = { id: "p1", name: "Chicken Roll", price: "120.00" };
const coffee = { id: "p2", name: "Cold Coffee", price: "80.00" };

function ringUp(...products: Array<{ id: string; name: string; price: string }>) {
  return products.reduce<CartLine[]>(
    (lines, product) => cartReducer(lines, { type: "add", product }),
    [],
  );
}

const dec = (lines: CartLine[], id: string) =>
  cartReducer(lines, { type: "decrement", productId: id });
const inc = (lines: CartLine[], id: string) =>
  cartReducer(lines, { type: "increment", productId: id });

describe("reported bug 2 — quantity decrease", () => {
  it("1. add item, quantity 1, minus → removed", () => {
    let lines = ringUp(roll);
    expect(lines[0].quantity).toBe(1);
    lines = dec(lines, "p1");
    expect(lines).toHaveLength(0);
  });

  it("2. add item, plus → quantity 2", () => {
    let lines = ringUp(roll);
    lines = inc(lines, "p1");
    expect(lines[0].quantity).toBe(2);
  });

  it("3. quantity 2, minus → quantity 1", () => {
    let lines = ringUp(roll, roll);
    lines = dec(lines, "p1");
    expect(lines[0].quantity).toBe(1);
  });

  it("4. quantity 1, minus → removed", () => {
    let lines = dec(ringUp(roll, roll), "p1");
    lines = dec(lines, "p1");
    expect(lines).toHaveLength(0);
  });

  it("5. two products change quantity independently", () => {
    let lines = ringUp(roll, coffee, coffee);
    lines = inc(lines, "p1");
    lines = dec(lines, "p2");

    expect(lines.find((l) => l.productId === "p1")?.quantity).toBe(2);
    expect(lines.find((l) => l.productId === "p2")?.quantity).toBe(1);
  });

  it("6. removing one product leaves the others alone", () => {
    let lines = ringUp(roll, coffee);
    lines = dec(lines, "p1");

    expect(lines).toHaveLength(1);
    expect(lines[0].productId).toBe("p2");
  });

  it("7. totals follow every change, and the empty cart is ₹0", () => {
    // 2 rolls (240) + 1 coffee (80) = 320
    let lines = ringUp(roll, roll, coffee);
    expect(cartTotals(lines, "").subtotalPaisa).toBe(32_000);
    expect(cartTotals(lines, "").itemCount).toBe(3);

    // one roll off → 120 + 80 = 200
    lines = dec(lines, "p1");
    expect(cartTotals(lines, "").subtotalPaisa).toBe(20_000);
    expect(cartTotals(lines, "").itemCount).toBe(2);

    // clear the rest → nothing owed, nothing to bill
    lines = dec(lines, "p1");
    lines = dec(lines, "p2");
    const empty = cartTotals(lines, "");
    expect(lines).toHaveLength(0);
    expect(empty.itemCount).toBe(0);
    expect(empty.totalPaisa).toBe(0);
  });
});

describe("reported bug 3 — customer name and mobile are optional", () => {
  // The till disables "Generate & Print" on `empty || Boolean(mobileError)`,
  // so a blank field must produce no error for billing to be possible.
  const blocked = (mobile: string) => Boolean(validateMobile(mobile));

  it("case 1 — both empty: billing is not blocked", () => {
    expect(blocked("")).toBe(false);
    expect(blocked("   ")).toBe(false);
  });

  it("case 2 — name entered, mobile empty: not blocked", () => {
    expect(blocked("")).toBe(false);
  });

  it("case 3 — name empty, mobile entered: not blocked", () => {
    expect(blocked("9876543210")).toBe(false);
  });

  it("case 4 — both entered: not blocked", () => {
    expect(blocked("9876543210")).toBe(false);
  });

  it("a genuinely wrong number is still refused, rather than saved wrong", () => {
    expect(blocked("12345")).toBe(true);
  });

  it("the walk-in default exists, and is not a fake phone number", () => {
    expect(DEFAULT_CUSTOMER_NAME).toBe("Walk-in Customer");
    expect(DEFAULT_CUSTOMER_NAME).not.toMatch(/[0-9]/);
  });
});
