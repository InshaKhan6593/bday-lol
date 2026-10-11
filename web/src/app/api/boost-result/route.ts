import { db } from "@/db";
import { isCheckoutSessionId } from "@/lib/success";
import { getBoostOutcome } from "@/server/boosts";

/**
 * GET /api/boost-result?session=cs_… → what happened to a boost checkout, for the note shown when
 * Stripe sends the booster back (components/boost/BoostNotice.tsx). The session id is only known to
 * the person who paid; the answer holds nothing that isn't on the board.
 */
export async function GET(request: Request) {
  const session = new URL(request.url).searchParams.get("session");
  if (!isCheckoutSessionId(session)) return Response.json({ status: "missing" }, { status: 400 });
  return Response.json(await getBoostOutcome(db, session), { headers: { "Cache-Control": "no-store" } });
}
