import { describe, expect, it } from "vitest";

import {
  cartReducer,
  cartTotals,
  toBillPayload,
  MAX_LINE_QUANTITY,
  type CartLine,
  type CartProduct,
} from "@/lib/cart";

const roll = { id: "p1", name: "Chicken Roll", price: "120.00" };
const coffee = { id: "p2", name: "Cold Coffee", price: "80.00" };
const fries = { id: "p3", name: "French Fries", price: "90.00" };

/** Ring up a sequence of products, as a cashier tapping the grid would. */
function ringUp(...products: Array<{ id: string; name: string; price: string }>) {
  return products.reduce<CartLine[]>(
    (lines, product) => cartReducer(lines, { type: "add", product }),
    [],
  );
}

describe("cart — multiple quantities", () => {
  it("increments an existing line rather than duplicating it", () => {
    const lines = ringUp(roll, roll, roll);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
  });

  it("keeps new items in the order they were rung up", () => {
    const lines = ringUp(roll, coffee, fries);
    expect(lines.map((l) => l.name)).toEqual([
      "Chicken Roll",
      "Cold Coffee",
      "French Fries",
    ]);
  });

  it("caps a single line rather than letting a stuck key run away", () => {
    let lines = ringUp(roll);
    for (let i = 0; i < MAX_LINE_QUANTITY + 50; i += 1) {
      lines = cartReducer(lines, { type: "increment", productId: "p1" });
    }
    expect(lines[0].quantity).toBe(MAX_LINE_QUANTITY);
  });
});

describe("cart — removing", () => {
  it("removes the line when quantity drops to zero", () => {
    let lines = ringUp(roll);
    lines = cartReducer(lines, { type: "decrement", productId: "p1" });
    expect(lines).toHaveLength(0);
  });

  it("decrements normally above one", () => {
    let lines = ringUp(roll, roll);
    lines = cartReducer(lines, { type: "decrement", productId: "p1" });
    expect(lines[0].quantity).toBe(1);
  });

  it("clear empties everything", () => {
    const lines = cartReducer(ringUp(roll, coffee), { type: "clear" });
    expect(lines).toEqual([]);
  });
});

describe("cart — totals", () => {
  it("matches the spec's worked example", () => {
    // Chicken Roll 2x120 + Cold Coffee 1x80 + French Fries 1x90 = 410
    const lines = ringUp(roll, roll, coffee, fries);
    const totals = cartTotals(lines, "");
    expect(totals.subtotalPaisa).toBe(41000);
    expect(totals.totalPaisa).toBe(41000);
    expect(totals.itemCount).toBe(4);
  });

  it("an empty cart totals zero rather than NaN", () => {
    const totals = cartTotals([], "");
    expect(totals.subtotalPaisa).toBe(0);
    expect(totals.totalPaisa).toBe(0);
    expect(totals.itemCount).toBe(0);
  });

  it("subtracts a discount and clamps it at the subtotal", () => {
    const lines = ringUp(roll);
    expect(cartTotals(lines, "20").totalPaisa).toBe(10000);
    // The DB CHECK would refuse discount > subtotal; clamping is kinder
    // mid-sale than an error the cashier has to clear.
    expect(cartTotals(lines, "500").totalPaisa).toBe(0);
    expect(cartTotals(lines, "500").discountPaisa).toBe(12000);
  });

  it("ignores a junk or negative discount instead of throwing", () => {
    const lines = ringUp(roll);
    expect(cartTotals(lines, "abc").totalPaisa).toBe(12000);
    expect(cartTotals(lines, "-50").discountPaisa).toBe(0);
    expect(cartTotals(lines, "   ").totalPaisa).toBe(12000);
  });
});

describe("cart — price changes cannot travel from the browser", () => {
  it("the bill payload carries ids and quantities only", () => {
    const lines = ringUp(roll, roll, coffee);
    expect(toBillPayload(lines)).toEqual([
      { product_id: "p1", quantity: 2 },
      { product_id: "p2", quantity: 1 },
    ]);
  });

  it("no price appears anywhere in the serialised payload", () => {
    // The guarantee behind "never trust client-submitted prices": even a
    // tampered cart cannot smuggle a price to create_bill.
    const tampered = ringUp(roll).map((line) => ({ ...line, unitPrice: "1.00" }));
    const serialised = JSON.stringify(toBillPayload(tampered));
    expect(serialised).not.toContain("1.00");
    expect(serialised).not.toContain("unitPrice");
    expect(serialised).not.toContain("120");
  });
});

/**
 * Toggle exists so the grid can hold one callback for the life of the screen
 * instead of a new one per cart change — which is what let the product cards
 * be memoised, and took search from about 25ms a keystroke to under 8.
 *
 * It must behave exactly as the add/remove pair it replaced.
 */
describe("toggle", () => {
  const coffee: CartProduct = { id: "p1", name: "Cold Coffee", price: "99.00" };
  const soda: CartProduct = { id: "p2", name: "Masala Soda", price: "35.00" };

  it("puts an item on the order and takes it off again", () => {
    const on = cartReducer([], { type: "toggle", product: coffee });
    expect(on).toHaveLength(1);
    expect(on[0]).toMatchObject({ productId: "p1", quantity: 1 });

    const off = cartReducer(on, { type: "toggle", product: coffee });
    expect(off).toHaveLength(0);
  });

  it("removes the whole line however many are on it", () => {
    // A selection, not a counter: three of them still come off in one tap.
    let lines = cartReducer([], { type: "toggle", product: coffee });
    lines = cartReducer(lines, { type: "increment", productId: "p1" });
    lines = cartReducer(lines, { type: "increment", productId: "p1" });
    expect(lines[0].quantity).toBe(3);

    expect(cartReducer(lines, { type: "toggle", product: coffee })).toHaveLength(0);
  });

  it("leaves the rest of the order alone", () => {
    let lines = cartReducer([], { type: "toggle", product: coffee });
    lines = cartReducer(lines, { type: "toggle", product: soda });
    lines = cartReducer(lines, { type: "toggle", product: coffee });

    expect(lines).toHaveLength(1);
    expect(lines[0].productId).toBe("p2");
  });
});
