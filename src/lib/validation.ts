/**
 * Indian mobile numbers, validated the same way the database does.
 *
 * The CHECK on bills.customer_mobile is `^[6-9][0-9]{9}$`, so anything this
 * accepts must be something Postgres will accept too — otherwise the cashier
 * gets a clean-looking form and a failed save at the worst possible moment.
 *
 * Deliberately forgiving about how it's typed: +91, spaces and dashes are all
 * stripped first. A customer reading their number aloud says it in whatever
 * shape they like, and the spec is explicit that validation must not make
 * billing harder.
 */

export const MOBILE_PATTERN = /^[6-9][0-9]{9}$/;

/** Strips +91, 0 prefixes and separators. Returns the bare 10 digits, or null. */
export function normaliseMobile(input: string): string | null {
  const digits = input.replace(/[^0-9]/g, "");

  const bare =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;

  return MOBILE_PATTERN.test(bare) ? bare : null;
}

/** null when fine, otherwise a message to show. Blank is fine — it's optional. */
export function validateMobile(input: string): string | null {
  if (!input.trim()) return null;
  return normaliseMobile(input)
    ? null
    : "Enter a 10-digit mobile number starting 6–9, or leave it blank.";
}

export const DEFAULT_CUSTOMER_NAME = "Walk-in Customer";
