"use client";

import { useEffect, useState } from "react";
import { Hint } from "@/components/ui";
import { endingSoonText } from "@/lib/countdown";

type Props = {
  /** ISO instant today ends (midnight ET). */
  endsAt: string;
  /** Server time at render, so the warning follows DEV_NOW and ignores a wrong device clock. */
  serverNow: string;
  className?: string;
};

/**
 * "Today ends in 12 min. Finish paying before midnight ET." Shown only in the
 * last 30 minutes of today, next to a pay button (07 B5).
 */
export function EndingSoon({ endsAt, serverNow, className }: Props) {
  const end = new Date(endsAt).getTime();
  const [left, setLeft] = useState(() => end - new Date(serverNow).getTime());

  useEffect(() => {
    const skew = new Date(serverNow).getTime() - Date.now();
    const tick = () => setLeft(end - (Date.now() + skew));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [end, serverNow]);

  const text = endingSoonText(left);
  if (!text) return null;
  return (
    <Hint tone="error" className={className}>
      {text}
    </Hint>
  );
}
