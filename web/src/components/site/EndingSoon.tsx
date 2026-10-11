"use client";

import { useEffect, useState } from "react";
import { Hint } from "@/components/ui";
import { endingSoonText } from "@/lib/countdown";
import { hintServerClock, serverNowMs } from "@/lib/server-clock";

type Props = {
  /** ISO instant today ends (midnight ET). */
  endsAt: string;
  /**
   * Server time at render. Only from a page drawn per request (Claim): a saved page's time is old,
   * and those pages get the server's clock from the live-board check instead.
   */
  serverNow?: string;
  className?: string;
};

/**
 * "Today ends in 12 min. Finish paying before midnight ET." Shown only in the
 * last 30 minutes of today, next to a pay button (07 B5).
 */
export function EndingSoon({ endsAt, serverNow, className }: Props) {
  const end = new Date(endsAt).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (serverNow) hintServerClock(serverNow);
    const tick = () => setLeft(end - serverNowMs());
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [end, serverNow]);

  const text = left === null ? null : endingSoonText(left);
  if (!text) return null;
  return (
    <Hint tone="error" className={className}>
      {text}
    </Hint>
  );
}
