import { describe, expect, it } from "vitest";
import {
  LIVE_JITTER_MS,
  LIVE_POLL_MS,
  boardVersion,
  liveJitterMs,
  livePollMs,
  liveTopic,
  realtimeUrl,
  shouldRefresh,
} from "./live";

const AT = new Date("2026-10-07T12:00:00-04:00");
const board = { boardId: "b1", people: 3, totalCents: 61_500, lastChangedAt: AT };

describe("board version", () => {
  it("is the same for the same board state", () => {
    expect(boardVersion(board)).toBe(boardVersion({ ...board }));
  });

  it("changes when someone joins, a total moves, a listing is edited or the year rolls over", () => {
    const base = boardVersion(board);
    expect(boardVersion({ ...board, people: 4 })).not.toBe(base);
    expect(boardVersion({ ...board, totalCents: 61_700 })).not.toBe(base);
    expect(boardVersion({ ...board, lastChangedAt: new Date(AT.getTime() + 1) })).not.toBe(base);
    expect(boardVersion({ ...board, boardId: "b2" })).not.toBe(base);
  });

  it("is one fixed value for a date nobody has claimed", () => {
    const open = { boardId: null, people: 0, totalCents: 0, lastChangedAt: null };
    expect(boardVersion(open)).toBe("open");
    expect(boardVersion({ ...board, people: 1 })).not.toBe("open");
  });

  it("tells a board whose people were all removed from one that was never claimed", () => {
    expect(boardVersion({ boardId: "b1", people: 0, totalCents: 0, lastChangedAt: null })).not.toBe("open");
  });
});

describe("when a page re-reads its data", () => {
  it("does nothing while the server agrees with the page", () => {
    expect(shouldRefresh("v1", null, "v1")).toBe(false);
  });

  it("refreshes when the server has a newer board", () => {
    expect(shouldRefresh("v1", null, "v2")).toBe(true);
  });

  it("acts once per answer, so a disagreement can't reload the page in a loop", () => {
    expect(shouldRefresh("v1", "v2", "v2")).toBe(false);
    expect(shouldRefresh("v1", "v2", "v3")).toBe(true);
  });
});

describe("push channel", () => {
  it("names a board's channel by its date", () => {
    expect(liveTopic("10-07")).toBe("board:10-07");
  });

  it("checks rarely while pushes arrive and often while they don't", () => {
    expect(livePollMs(true)).toBe(LIVE_POLL_MS.pushed);
    expect(livePollMs(false)).toBe(LIVE_POLL_MS.unpushed);
    expect(LIVE_POLL_MS.unpushed).toBeLessThan(LIVE_POLL_MS.pushed);
  });

  it("spreads viewers over the jitter window", () => {
    expect(liveJitterMs(0)).toBe(0);
    expect(liveJitterMs(0.5)).toBe(LIVE_JITTER_MS / 2);
    expect(liveJitterMs(0.999)).toBeLessThan(LIVE_JITTER_MS);
  });

  it("builds the websocket address from the project URL", () => {
    expect(realtimeUrl("https://abc.supabase.co")).toBe("wss://abc.supabase.co/realtime/v1");
    expect(realtimeUrl("https://abc.supabase.co/")).toBe("wss://abc.supabase.co/realtime/v1");
    expect(realtimeUrl("http://localhost:54321")).toBe("ws://localhost:54321/realtime/v1");
  });

  it("is off without a usable project URL", () => {
    expect(realtimeUrl(undefined)).toBeNull();
    expect(realtimeUrl("")).toBeNull();
    expect(realtimeUrl("not a url")).toBeNull();
    expect(realtimeUrl("ftp://abc.supabase.co")).toBeNull();
  });
});
