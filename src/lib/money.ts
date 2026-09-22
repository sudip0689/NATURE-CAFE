/**
 * Money handling, in one place.
 *
 * Postgres stores every amount as `numeric(10,2)` and PostgREST hands it back
 * as a *string* ("120.00"). We keep it that way on the wire and convert to
 * integer paisa for any arithmetic, because `0.1 + 0.2 !== 0.3` in JavaScript
 * and a till that is off by a paisa is a till nobody trusts.
 *
 * Rule for callers: never use `+`, `*` or `parseFloat` on an amount anywhere
 * else in the app. Come here.
 */

/** Rupee string or number -> integer paisa. Throws on anything unparseable. */
export function toPaisa(amount: string | number): number {
  const text = typeof amount === "number" ? amount.toFixed(2) : amount.trim();

  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) {
    throw new Error(`Not a valid money amount: ${JSON.stringify(amount)}`);
  }

  const negative = text.startsWith("-");
  const [rupees, fraction = ""] = (negative ? text.slice(1) : text).split(".");
  const paisa = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));

  return negative ? -paisa : paisa;
}

/** Integer paisa -> the "120.00" form Postgres expects for numeric(10,2). */
export function toAmountString(paisa: number): string {
  if (!Number.isInteger(paisa)) {
    throw new Error(`Paisa must be a whole number, got ${paisa}`);
  }
  const sign = paisa < 0 ? "-" : "";
  const abs = Math.abs(paisa);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Display form with the rupee sign and Indian lakh grouping: "₹1,20,000.00". */
export function formatMoney(amount: string | number): string {
  return inr.format(toPaisa(amount) / 100);
}

/**
 * Compact display for dense POS surfaces — drops the decimals when an amount is
 * a whole number of rupees, which most café prices are. "₹120" not "₹120.00".
 */
export function formatMoneyCompact(amount: string | number): string {
  const paisa = toPaisa(amount);
  return paisa % 100 === 0
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(paisa / 100)
    : inr.format(paisa / 100);
}

const plain = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Amount with no currency symbol — for receipt columns, where the spec's
 * layout prints bare numbers and reserves the ₹ for the TOTAL line. Also the
 * safe form for any future ESC/POS driver, since not every thermal printer's
 * codepage carries the rupee glyph.
 */
export function formatAmountPlain(amount: string | number): string {
  return plain.format(toPaisa(amount) / 100);
}

/** A line total, computed in paisa so it can never drift from the DB's CHECK. */
export function lineTotalPaisa(unitPrice: string | number, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`Quantity must be a positive whole number, got ${quantity}`);
  }
  return toPaisa(unitPrice) * quantity;
}

export function sumPaisa(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
