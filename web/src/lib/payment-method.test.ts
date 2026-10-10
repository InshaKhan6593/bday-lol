import { describe, expect, it } from "vitest";
import { paymentMethodLabel } from "./payment-method";

describe("payment method on receipts", () => {
  it("names the card brand and its last four digits", () => {
    expect(paymentMethodLabel({ type: "card", card: { brand: "visa", last4: "4242" } })).toBe("Visa •••• 4242");
    expect(paymentMethodLabel({ type: "card", card: { brand: "amex", last4: "0005" } })).toBe("American Express •••• 0005");
    expect(paymentMethodLabel({ type: "card", card: { brand: "unknown", last4: "1111" } })).toBe("Card •••• 1111");
  });

  it("says which wallet paid", () => {
    const applePay = { type: "card", card: { brand: "mastercard", last4: "8812", wallet: { type: "apple_pay" } } };
    expect(paymentMethodLabel(applePay)).toBe("Apple Pay · Mastercard •••• 8812");
  });

  it("names other ways to pay, and gives up on ones it doesn't know", () => {
    expect(paymentMethodLabel({ type: "cashapp" })).toBe("Cash App Pay");
    expect(paymentMethodLabel({ type: "link" })).toBe("Link");
    expect(paymentMethodLabel({ type: "something_new" })).toBeNull();
    expect(paymentMethodLabel(null)).toBeNull();
  });
});
