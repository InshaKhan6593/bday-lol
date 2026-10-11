"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { COUNTDOWN_PLACEHOLDER, formatCountdown } from "@/lib/countdown";
import { serverNowMs } from "@/lib/server-clock";

type Props = {
  /** ISO instant the day ends (midnight ET). */
  endsAt: string;
  className?: string;
};

/**
 * "11:40:52" counting down to midnight ET. Reloads the page data when the day ends.
 * The page may be a saved copy, so the time is never in the HTML: it starts as dashes and is
 * filled in by the browser from the server's clock (lib/server-clock.ts).
 */
export function Countdown({ endsAt, className }: Props) {
  const router = useRouter();
  const end = new Date(endsAt).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    const tick = () => {
      const left = end - serverNowMs();
      setRemaining(left);
      if (left <= 0 && !refreshed.current) {
        refreshed.current = true;
        router.refresh();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end, router]);

  return (
    <time className={className} dateTime={endsAt}>
      {remaining === null ? COUNTDOWN_PLACEHOLDER : formatCountdown(remaining)}
    </time>
  );
}
