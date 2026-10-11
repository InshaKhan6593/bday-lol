"use client";

import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconButton, Surface } from "@/components/ui";
import { boostNoticeText, type BoostNoticeOutcome } from "@/lib/boost";
import { SUCCESS_POLL_MS, isCheckoutSessionId } from "@/lib/success";
import styles from "./BoostNotice.module.css";

type Props = {
  /** The page without the query, for the close button. */
  path: Route;
};

/**
 * The note after Stripe sends a booster back (?boosted=cs_…). Until the webhook lands it says
 * "Adding your boost…" and asks again every 1.5 s; then it shows the new total. The board itself
 * re-sorts through the live-board check (lib/live.ts).
 *
 * It reads the address in the browser, so the page around it can be a saved copy. Wrap it in
 * <Suspense>: a saved page has no address to read while it is being built.
 */
export function BoostNotice({ path }: Props) {
  const boosted = useSearchParams().get("boosted");
  const sessionId = isCheckoutSessionId(boosted) ? boosted : null;
  const [answer, setAnswer] = useState<{ sessionId: string; outcome: BoostNoticeOutcome } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = async () => {
      let outcome: BoostNoticeOutcome = { status: "pending" };
      try {
        const res = await fetch(`/api/boost-result?session=${sessionId}`, { cache: "no-store" });
        if (res.ok) outcome = (await res.json()) as BoostNoticeOutcome;
      } catch {
        // A blip: ask again.
      }
      if (stopped) return;
      setAnswer({ sessionId, outcome });
      if (outcome.status === "pending") timer = setTimeout(() => void ask(), SUCCESS_POLL_MS);
    };
    void ask();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  const text = sessionId && answer?.sessionId === sessionId ? boostNoticeText(answer.outcome) : null;
  if (!text) return null;
  return (
    <Surface radius="card" padding="none" role="status" className={styles.notice}>
      <p className={styles.text}>{text}</p>
      <IconButton href={path} scroll={false} replace icon="close" label="Dismiss" size="sm" />
    </Surface>
  );
}
