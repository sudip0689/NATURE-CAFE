/**
 * create_bill raises short tokens; the counter sees a sentence.
 *
 * A cashier mid-sale, with a customer waiting, must never be shown SQL, an
 * error code, or the word "constraint". Each message below says what happened
 * and what to do about it, in that order.
 */

const MESSAGES: Record<string, string> = {
  NOT_SIGNED_IN: "Your session has expired. Sign in again to keep billing.",
  NOT_ALLOWED:
    "This account can't create bills any more. Ask the owner to restore access.",
  EMPTY_CART: "Add at least one item before generating a bill.",
  BAD_QUANTITY: "One of the items has an invalid quantity. Clear it and re-add.",
  BAD_PAYMENT_METHOD: "Choose Cash, UPI or Card before generating the bill.",
  BAD_MOBILE:
    "That mobile number isn't valid. Fix it, or clear the field — it's optional.",
  BAD_DISCOUNT: "The discount can't be more than the subtotal.",
  PRODUCT_UNAVAILABLE:
    "An item in this order was just removed from the menu. Clear the cart and ring it up again.",
};

export function billingErrorMessage(raw: string | null | undefined): string {
  if (!raw) return "Could not save the bill. Try again.";

  for (const [token, message] of Object.entries(MESSAGES)) {
    if (raw.includes(token)) return message;
  }

  // Anything unmapped falls back to something safe — a Postgres string must
  // never reach the counter screen.
  return "Could not save the bill. Try again.";
}
