"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { LIVE_EVENT, LIVE_RECHECK_MS, liveJitterMs, livePollMs, liveTopic, realtimeUrl, shouldRefresh } from "@/lib/live";
import { syncServerClock } from "@/lib/server-clock";

type Props = {
  /** The board on this page: "10-07". */
  boardKey: string;
  /** The board's version when the server drew the page. */
  version: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Keeps an open page on the current board (lib/live.ts). It asks the server for the board's version
 * and re-reads the page's data when it is new: on arrival (the page may be a saved copy), right after a
 * push, when the tab comes back, when the device is online again, and on a timer. Each answer also brings
 * the server's time for the countdowns. Draws nothing.
 */
export function LiveBoard({ boardKey, version }: Props) {
  const router = useRouter();
  // The version the page shows now; a re-read brings a new one in through the props.
  const shown = useRef(version);
  useEffect(() => {
    shown.current = version;
  }, [version]);

  useEffect(() => {
    let stopped = false;
    let pushed = false;
    let seen: string | null = null;
    let checking = false;
    let checkedAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let jitter: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      if (stopped || checking || document.hidden) return;
      checking = true;
      try {
        const sentAt = Date.now();
        const res = await fetch(`/api/board-version?key=${boardKey}`, { cache: "no-store" });
        if (!res.ok) return;
        const { version: remote, now } = (await res.json()) as { version: string; now: string };
        checkedAt = Date.now();
        syncServerClock(now, sentAt, checkedAt);
        if (stopped || !shouldRefresh(shown.current, seen, remote)) return;
        seen = remote;
        router.refresh();
      } catch {
        // Offline or a blip: the next check tries again.
      } finally {
        checking = false;
      }
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void check();
        schedule();
      }, livePollMs(pushed));
    };
    const setPushed = (up: boolean) => {
      if (stopped || pushed === up) return;
      pushed = up;
      schedule();
      // A new connection may have missed a push while it was down (not one that opened right after a check).
      if (up && Date.now() - checkedAt > LIVE_RECHECK_MS) void check();
    };
    const onPush = () => {
      clearTimeout(jitter);
      jitter = setTimeout(() => void check(), liveJitterMs());
    };
    const onVisible = () => {
      if (!document.hidden) void check();
    };

    void check();
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    // The push channel. Loaded after the page is up, so it adds nothing to the first load.
    let leave: (() => void) | undefined;
    const socketUrl = realtimeUrl(SUPABASE_URL);
    if (socketUrl && SUPABASE_KEY) {
      void import("@supabase/realtime-js")
        .then(async ({ RealtimeClient }) => {
          if (stopped) return;
          const client = new RealtimeClient(socketUrl, { params: { apikey: SUPABASE_KEY } });
          leave = () => client.disconnect();
          // Private channel: visitors may listen, only the server may send.
          await client.setAuth(SUPABASE_KEY);
          if (stopped) return client.disconnect();
          client
            .channel(liveTopic(boardKey), { config: { private: true } })
            .on("broadcast", { event: LIVE_EVENT }, onPush)
            .subscribe((status) => setPushed(status === "SUBSCRIBED"));
        })
        .catch(() => {
          // No push: the timer keeps the page current.
        });
    }

    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(jitter);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      leave?.();
    };
  }, [boardKey, router]);

  return null;
}
