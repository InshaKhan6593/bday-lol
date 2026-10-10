"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SUCCESS_POLL_MS, SUCCESS_SLOW_AFTER_MS } from "@/lib/success";
import styles from "./success.module.css";

/**
 * "Finishing up…": Stripe sends people back before its webhook marks the claim
 * paid, so re-read the page every 1.5 s until the server has the result.
 */
export function PendingPoller() {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const poll = setInterval(() => router.refresh(), SUCCESS_POLL_MS);
    const late = setTimeout(() => setSlow(true), SUCCESS_SLOW_AFTER_MS);
    return () => {
      clearInterval(poll);
      clearTimeout(late);
    };
  }, [router]);

  return (
    <p role="status" className={styles.sub}>
      {slow
        ? "This is taking longer than usual. Your payment went through, and we'll email your receipt as soon as your spot is live."
        : "Your payment went through. Putting you on the board. This takes a few seconds."}
    </p>
  );
}
