import { lineTotalPaisa, sumPaisa, toPaisa } from "@/lib/money";

/**
 * Cart state, kept pure so the till's reducer is testable on its own and so
 * Phase 4 can build its request payload from the same shape.
 *
 * `unitPrice` here is for *display only*. When a bill is created, the server
 * receives product ids and quantities and nothing else — it re-reads every
 * price from the products table. A price that travelled through the browser is
 * a price a browser could have edited.
 */

export interface CartLine {
  productId: string;
  name: string;
  unitPrice: string;
  quantity: number;
}

export interface CartProduct {
  id: string;
  name: string;
  price: string;
}

export type CartAction =
  | { type: "add"; product: CartProduct }
  | { type: "increment"; productId: string }
  | { type: "decrement"; productId: string }
  | { type: "remove"; productId: string }
  /**
   * On if it is off, off if it is on.
   *
   * The grid used to work this out itself and dispatch add or remove. That
   * meant its onToggle had to close over the current selection, so it was a
   * new function on every cart change -- which made memoising the product
   * cards impossible, and every keystroke in the search box re-rendered all
   * twenty-one of them. Deciding it here lets the grid hold one callback for
   * the life of the screen.
   */
  | { type: "toggle"; product: CartProduct }
  | { type: "clear" };

export const MAX_LINE_QUANTITY = 999;

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "toggle":
      return lines.some((line) => line.productId === action.product.id)
        ? cartReducer(lines, { type: "remove", productId: action.product.id })
        : cartReducer(lines, { type: "add", product: action.product });

    case "add": {
      const existing = lines.find((line) => line.productId === action.product.id);
      if (existing) {
        return lines.map((line) =>
          line.productId === action.product.id
            ? {
                ...line,
                quantity: Math.min(line.quantity + 1, MAX_LINE_QUANTITY),
              }
            : line,
        );
      }
      // New items go to the end, so the list reads in the order the cashier
      // rang them up — matching what the customer watched happen.
      return [
        ...lines,
        {
          productId: action.product.id,
          name: action.product.name,
          unitPrice: action.product.price,
          quantity: 1,
        },
      ];
    }

    case "increment":
      return lines.map((line) =>
        line.productId === action.productId
          ? { ...line, quantity: Math.min(line.quantity + 1, MAX_LINE_QUANTITY) }
          : line,
      );

    case "decrement":
      // Dropping to zero removes the line — one control does both jobs, so the
      // cashier never hunts for a separate delete.
      return lines.flatMap((line) => {
        if (line.productId !== action.productId) return [line];
        return line.quantity <= 1 ? [] : [{ ...line, quantity: line.quantity - 1 }];
      });

    case "remove":
      return lines.filter((line) => line.productId !== action.productId);

    case "clear":
      return [];
  }
}

export interface CartTotals {
  subtotalPaisa: number;
  discountPaisa: number;
  totalPaisa: number;
  itemCount: number;
}

/**
 * Totals in integer paisa. A discount larger than the subtotal is clamped
 * rather than rejected — the DB has a CHECK that would refuse it anyway, and
 * silently capping is kinder mid-sale than an error the cashier must clear.
 */
export function cartTotals(lines: CartLine[], discountInput: string): CartTotals {
  const subtotalPaisa = sumPaisa(
    lines.map((line) => lineTotalPaisa(line.unitPrice, line.quantity)),
  );

  let discountPaisa = 0;
  const trimmed = discountInput.trim();
  if (trimmed) {
    try {
      discountPaisa = Math.max(0, toPaisa(trimmed));
    } catch {
      discountPaisa = 0;
    }
  }
  discountPaisa = Math.min(discountPaisa, subtotalPaisa);

  return {
    subtotalPaisa,
    discountPaisa,
    totalPaisa: subtotalPaisa - discountPaisa,
    itemCount: lines.reduce((count, line) => count + line.quantity, 0),
  };
}

/** What Phase 4's create_bill RPC will receive: ids and quantities only. */
export function toBillPayload(lines: CartLine[]) {
  return lines.map((line) => ({
    product_id: line.productId,
    quantity: line.quantity,
  }));
}
