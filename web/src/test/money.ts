import { randomUUID } from "node:crypto";
import type { ThemeKey } from "@/config/themes";
import type { MonthDay } from "@/lib/birthday";
import { createPendingBoost, createPendingClaim, fulfillCheckout } from "@/server/payments";
import type { Tx } from "./db";

let sessions = 0;
const nextSession = () => `cs_test_${++sessions}_${randomUUID().slice(0, 8)}`;

type ClaimInput = { md: MonthDay; name: string; usd: number; email: string; at: Date; theme?: ThemeKey; photoUrl?: string };

/** A claim that went through Stripe: pending rows, then the webhook's fulfillCheckout. */
export async function paidClaim(tx: Tx, boardId: string, c: ClaimInput) {
  const ids = { entryId: randomUUID(), paymentId: randomUUID() };
  const sessionId = nextSession();
  await createPendingClaim(tx, {
    ids,
    boardId,
    sessionId,
    photoUrl: c.photoUrl ?? null,
    claim: {
      md: c.md,
      amountCents: c.usd * 100,
      name: c.name,
      bio: "",
      giftLinks: [{ service: "venmo", url: "https://venmo.com/u/someone" }],
      theme: c.theme ?? "sky",
      email: c.email,
    },
  });
  const result = await fulfillCheckout(tx, { sessionId, presentment: null, paymentIntentId: "pi_test", customerEmail: c.email }, c.at);
  return { ...ids, sessionId, result };
}

type BoostInput = { usd: number; email: string | null; at: Date; alert?: boolean };

/** A boost that went through Stripe. The email is the one Stripe collected. */
export async function paidBoost(tx: Tx, entryId: string, b: BoostInput) {
  const paymentId = randomUUID();
  const sessionId = nextSession();
  await createPendingBoost(tx, { paymentId, entryId, sessionId, amountCents: b.usd * 100, alertOptIn: b.alert ?? false });
  const result = await fulfillCheckout(tx, { sessionId, presentment: null, paymentIntentId: "pi_test", customerEmail: b.email }, b.at);
  return { paymentId, sessionId, result };
}
