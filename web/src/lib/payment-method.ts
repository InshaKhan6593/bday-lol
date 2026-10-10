/**
 * "Visa •••• 4242" / "Apple Pay · Visa •••• 4242" for receipts, from the
 * payment_method_details of a Stripe charge (only the fields we read).
 */
export type PaymentMethodDetails = {
  type: string;
  card?: { brand: string | null; last4: string | null; wallet?: { type: string } | null } | null;
};

const BRANDS: Record<string, string> = {
  amex: "American Express",
  cartes_bancaires: "Cartes Bancaires",
  diners: "Diners Club",
  discover: "Discover",
  eftpos_au: "eftpos",
  jcb: "JCB",
  mastercard: "Mastercard",
  unionpay: "UnionPay",
  visa: "Visa",
};

const WALLETS: Record<string, string> = {
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  samsung_pay: "Samsung Pay",
  link: "Link",
};

/** Payment types that aren't cards, as people know them. */
const METHODS: Record<string, string> = {
  link: "Link",
  cashapp: "Cash App Pay",
  amazon_pay: "Amazon Pay",
  paypal: "PayPal",
  klarna: "Klarna",
  affirm: "Affirm",
  afterpay_clearpay: "Afterpay",
  revolut_pay: "Revolut Pay",
};

/** "Visa" from "visa"; an unknown brand is title-cased ("some_card" → "Some card"). */
function brandName(brand: string): string {
  return BRANDS[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1).replace(/_/g, " ");
}

export function paymentMethodLabel(details: PaymentMethodDetails | null | undefined): string | null {
  if (!details) return null;
  const card = details.type === "card" ? details.card : null;
  if (card) {
    const name = card.brand && card.brand !== "unknown" ? brandName(card.brand) : "Card";
    const base = card.last4 ? `${name} •••• ${card.last4}` : name;
    const wallet = card.wallet ? WALLETS[card.wallet.type] : undefined;
    return wallet ? `${wallet} · ${base}` : base;
  }
  return METHODS[details.type] ?? null;
}
