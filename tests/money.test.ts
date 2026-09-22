import { describe, expect, it } from "vitest";

import {
  formatAmountPlain,
  formatMoney,
  formatMoneyCompact,
  lineTotalPaisa,
  sumPaisa,
  toAmountString,
  toPaisa,
} from "@/lib/money";

describe("money", () => {
  it("parses rupee strings and numbers into paisa", () => {
    expect(toPaisa("120")).toBe(12000);
    expect(toPaisa("120.50")).toBe(12050);
    expect(toPaisa("0.05")).toBe(5);
    expect(toPaisa(120)).toBe(12000);
  });

  it("throws on anything it cannot parse exactly", () => {
    expect(() => toPaisa("12o")).toThrow();
    expect(() => toPaisa("")).toThrow();
    // Three decimal places is not a rupee amount; guessing would lose a paisa.
    expect(() => toPaisa("1.234")).toThrow();
  });

  it("round-trips through the numeric(10,2) string form", () => {
    expect(toAmountString(12050)).toBe("120.50");
    expect(toAmountString(5)).toBe("0.05");
    expect(toAmountString(0)).toBe("0.00");
    expect(toAmountString(toPaisa("1999.99"))).toBe("1999.99");
  });

  it("avoids the float error that motivates the whole module", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in float. In paisa it is exact.
    expect(toPaisa("0.10") + toPaisa("0.20")).toBe(toPaisa("0.30"));
    expect(sumPaisa([toPaisa("0.07"), toPaisa("0.07"), toPaisa("0.07")])).toBe(21);
  });

  it("formats with Indian lakh grouping", () => {
    expect(formatMoney("120000")).toContain("1,20,000");
    expect(formatMoney("410")).toContain("410.00");
  });

  it("drops decimals only when the amount is whole rupees", () => {
    expect(formatMoneyCompact("120.00")).not.toContain(".00");
    expect(formatMoneyCompact("120.50")).toContain(".50");
  });

  it("prints receipt columns without a currency symbol", () => {
    // The receipt reserves the rupee sign for TOTAL, and not every thermal
    // printer codepage carries the glyph.
    expect(formatAmountPlain("410.00")).toBe("410");
    expect(formatAmountPlain("1999.50")).toBe("1,999.5");
    expect(formatAmountPlain("410.00")).not.toContain("₹");
  });

  it("computes line totals exactly at awkward prices", () => {
    expect(lineTotalPaisa("0.10", 3)).toBe(30);
    expect(lineTotalPaisa("120.50", 7)).toBe(84350);
  });

  it("refuses quantities that are not positive whole numbers", () => {
    expect(() => lineTotalPaisa("120", 0)).toThrow();
    expect(() => lineTotalPaisa("120", -1)).toThrow();
    expect(() => lineTotalPaisa("120", 1.5)).toThrow();
  });
});
