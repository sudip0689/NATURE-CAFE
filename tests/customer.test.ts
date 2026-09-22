import { describe, expect, it } from "vitest";

import {
  DEFAULT_CUSTOMER_NAME,
  normaliseMobile,
  validateMobile,
} from "@/lib/validation";

describe("customer mobile", () => {
  it("accepts the shapes a customer actually reads out", () => {
    expect(normaliseMobile("9876543210")).toBe("9876543210");
    expect(normaliseMobile("+91 98765 43210")).toBe("9876543210");
    expect(normaliseMobile("098765-43210")).toBe("9876543210");
    expect(normaliseMobile("+91-9876543210")).toBe("9876543210");
  });

  it("rejects exactly what the database CHECK rejects", () => {
    // bills.customer_mobile is CHECK (~ '^[6-9][0-9]{9}$'). Anything this
    // accepts must be something Postgres accepts, or the cashier gets a clean
    // form and a failed save at the worst moment.
    expect(normaliseMobile("1234567890")).toBeNull(); // must start 6-9
    expect(normaliseMobile("5876543210")).toBeNull();
    expect(normaliseMobile("98765")).toBeNull();
    expect(normaliseMobile("98765432101")).toBeNull();
    expect(normaliseMobile("abcdefghij")).toBeNull();
  });

  it("treats every leading digit 6 through 9 as valid", () => {
    for (const first of ["6", "7", "8", "9"]) {
      expect(normaliseMobile(`${first}876543210`)).toBe(`${first}876543210`);
    }
  });
});

describe("customer without a mobile", () => {
  it("blank is valid — the field is optional", () => {
    expect(validateMobile("")).toBeNull();
    expect(validateMobile("   ")).toBeNull();
  });

  it("a wrong number is reported, not silently dropped", () => {
    expect(validateMobile("12345")).toBeTruthy();
  });

  it("has a walk-in default so a bill always names someone", () => {
    expect(DEFAULT_CUSTOMER_NAME).toBe("Walk-in Customer");
  });
});
