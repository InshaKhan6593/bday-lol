"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/countdown";

type Props = {
  /** ISO instant the day ends (midnight ET). */
  endsAt: string;
  /** Server time at render, so the clock follows DEV_NOW and ignores a wrong device clock. */
  serverNow: string;
  className?: string;
};

/** "11:40:52" counting down to midnight ET. Reloads the page data when the day ends. */
export function Countdown({ endsAt, serverNow, className }: Props) {
  const router = useRouter();
  const end = new Date(endsAt).getTime();
  const [remaining, setRemaining] = useState(() => end - new Date(serverNow).getTime());
  const refreshed = useRef(false);

  useEffect(() => {
    // Offset between server and device clocks, measured once on mount.
    const skew = new Date(serverNow).getTime() - Date.now();
    const tick = () => {
      const left = end - (Date.now() + skew);
      setRemaining(left);
      if (left <= 0 && !refreshed.current) {
        refreshed.current = true;
        router.refresh();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end, serverNow, router]);

  return (
    <time className={className} dateTime={endsAt} suppressHydrationWarning>
      {formatCountdown(remaining)}
    </time>
  );
}
