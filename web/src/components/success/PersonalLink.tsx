"use client";

import type { Route } from "next";
import Link from "next/link";
import { useCopy } from "@/components/share/useCopy";
import { Kicker, Surface } from "@/components/ui";
import { displayUrl } from "@/lib/routes";
import styles from "./success.module.css";

/**
 * "Your personal link" box (handoff v2 §7): the link in the page's ground
 * color, a Copy button in the accent that says "Copied!" for 2 seconds, and
 * "See your spot →" to the board with their card highlighted.
 */
export function PersonalLink({ url, path }: { url: string; path: Route }) {
  const { copied, copy } = useCopy(2000);
  return (
    <Surface radius="tile" padding="none" className={styles.personal}>
      <Kicker className={styles.personalKicker}>Your personal link</Kicker>
      <div className={styles.personalRow}>
        <span className={styles.personalUrl}>{displayUrl(url)}</span>
        <button type="button" className={`${styles.copy} lift`} onClick={() => copy(url)}>
          <span aria-live="polite">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <p className={styles.personalHelp}>
        Put it in your bio or story. Followers land right on your spot to send a gift or boost you.
      </p>
      <Link href={path} className={styles.seeSpot}>
        See your spot →
      </Link>
    </Surface>
  );
}
