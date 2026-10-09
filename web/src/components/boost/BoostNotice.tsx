import type { Route } from "next";
import { AutoRefresh } from "@/components/site/AutoRefresh";
import { IconButton, Surface } from "@/components/ui";
import { db } from "@/db";
import { boostedText } from "@/lib/boost";
import { isCheckoutSessionId } from "@/lib/success";
import { getBoostOutcome } from "@/server/boosts";
import styles from "./BoostNotice.module.css";

type Props = {
  /** ?boosted= from Stripe's return URL. */
  sessionId: unknown;
  /** The page without the query, for the close button. */
  path: Route;
};

/**
 * The note after Stripe sends a booster back. Until the webhook lands it says
 * "Adding your boost…" and re-reads the page every 1.5 s; then the list has
 * re-sorted and the note shows the new total.
 */
export async function BoostNotice({ sessionId, path }: Props) {
  if (!isCheckoutSessionId(sessionId)) return null;
  const outcome = await getBoostOutcome(db, sessionId);
  if (outcome.status === "missing") return null;

  const text =
    outcome.status === "pending"
      ? "Adding your boost… This takes a few seconds."
      : outcome.status === "expired"
        ? "Your boost checkout expired. Nothing was charged."
        : boostedText(outcome);

  return (
    <Surface radius="card" padding="none" role="status" className={styles.notice}>
      {outcome.status === "pending" && <AutoRefresh />}
      <p className={styles.text}>{text}</p>
      <IconButton href={path} scroll={false} replace icon="close" label="Dismiss" size="sm" />
    </Surface>
  );
}
