import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { payments } from "@/db/schema";
import { addBirthdayType, inRollback, type Tx } from "@/test/db";
import { ensureBoard } from "./boards";
import { createPendingClaim } from "./claims";
import { handleStripeEvent } from "./stripe-events";
import { verifyStripeEvent } from "./stripe";

const NOON = new Date("2026-10-07T12:00:00-04:00");
const SECRET = "whsec_test_secret_for_unit_tests";

function sessionEvent(type: string, session: Record<string, unknown>): Stripe.Event {
  return { id: `evt_${randomUUID()}`, object: "event", type, data: { object: { object: "checkout.session", ...session } } } as unknown as Stripe.Event;
}

async function setup(tx: Tx) {
  const type = await addBirthdayType(tx);
  const board = await ensureBoard(tx, type, { month: 10, day: 7 }, 2026);
  const ids = { entryId: randomUUID(), paymentId: randomUUID() };
  await createPendingClaim(tx, {
    ids,
    boardId: board.id,
    sessionId: "cs_test_hook",
    photoUrl: null,
    claim: {
      md: { month: 10, day: 7 },
      amountCents: 500,
      name: "Sam Rivera",
      bio: "",
      giftLinks: [],
      theme: "sky",
      email: "sam@example.com",
    },
  });
  const metadata = { kind: "claim", paymentId: ids.paymentId, entryId: ids.entryId, boardId: board.id };
  return { metadata };
}

async function paymentStatus(tx: Tx) {
  const [row] = await tx.select({ status: payments.status }).from(payments).where(eq(payments.stripeSessionId, "cs_test_hook"));
  return row?.status;
}

describe("webhook signature", () => {
  it("accepts a correctly signed body and rejects anything else", () => {
    const body = JSON.stringify({ id: "evt_1", object: "event", type: "checkout.session.completed", data: { object: {} } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: SECRET });

    expect(verifyStripeEvent(body, header, SECRET).id).toBe("evt_1");
    expect(() => verifyStripeEvent(body.replace("evt_1", "evt_2"), header, SECRET)).toThrow();
    expect(() => verifyStripeEvent(body, header, "whsec_someone_else")).toThrow();
    expect(() => verifyStripeEvent(body, null, SECRET)).toThrow("Missing Stripe-Signature");
    expect(() => verifyStripeEvent(body, header, undefined)).toThrow("STRIPE_WEBHOOK_SECRET");
  });
});

describe("stripe events", () => {
  it("fulfils a paid checkout, reading the local currency the payer saw", async () => {
    await inRollback(async (tx) => {
      const { metadata } = await setup(tx);
      const event = sessionEvent("checkout.session.completed", {
        id: "cs_test_hook",
        payment_status: "paid",
        payment_intent: "pi_42",
        metadata,
        presentment_details: { presentment_currency: "eur", presentment_amount: 470 },
      });
      const outcome = await handleStripeEvent(tx, event, NOON);
      expect(outcome).toMatchObject({ handled: true, action: "fulfilled", result: { status: "fulfilled" } });
      const [row] = await tx.select().from(payments).where(eq(payments.stripeSessionId, "cs_test_hook"));
      expect(row).toMatchObject({ status: "paid", stripePaymentIntentId: "pi_42", presentmentCurrency: "EUR", presentmentAmount: 470 });
    });
  });

  it("waits for delayed payment methods, then fulfils on async success", async () => {
    await inRollback(async (tx) => {
      const { metadata } = await setup(tx);
      const base = { id: "cs_test_hook", payment_intent: null, metadata };
      expect(await handleStripeEvent(tx, sessionEvent("checkout.session.completed", { ...base, payment_status: "unpaid" }), NOON)).toEqual({
        handled: true,
        action: "waiting",
      });
      expect(await paymentStatus(tx)).toBe("pending");
      await handleStripeEvent(tx, sessionEvent("checkout.session.async_payment_succeeded", { ...base, payment_status: "paid" }), NOON);
      expect(await paymentStatus(tx)).toBe("paid");
    });
  });

  it("expires abandoned or failed checkouts", async () => {
    await inRollback(async (tx) => {
      const { metadata } = await setup(tx);
      const outcome = await handleStripeEvent(tx, sessionEvent("checkout.session.expired", { id: "cs_test_hook", metadata }), NOON);
      expect(outcome).toEqual({ handled: true, action: "expired", changed: true });
      expect(await paymentStatus(tx)).toBe("expired");
    });
  });

  it("ignores other event types and sessions that aren't our claims", async () => {
    await inRollback(async (tx) => {
      await setup(tx);
      expect(await handleStripeEvent(tx, sessionEvent("payment_intent.succeeded", {}), NOON)).toMatchObject({ handled: false });
      const foreign = sessionEvent("checkout.session.completed", { id: "cs_test_hook", payment_status: "paid", metadata: {} });
      expect(await handleStripeEvent(tx, foreign, NOON)).toEqual({ handled: false, reason: "not a claim session" });
      expect(await paymentStatus(tx)).toBe("pending");
    });
  });
});
