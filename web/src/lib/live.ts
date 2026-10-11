/**
 * Live boards: an open page follows the board without a reload.
 *
 * A payment lands → the Stripe webhook announces "this board changed" on a push channel
 * (Supabase Realtime) → every page showing that board asks the server for the board's version
 * and re-reads its data when the version is new.
 *
 * The push carries no data and is never trusted: it only says "look now". The version check is
 * what decides, so a made-up push costs one cheap request and changes nothing. The same check
 * runs on a timer and whenever the tab comes back, which covers a dropped connection, a phone
 * that slept, and a site with more viewers than the push service allows.
 */

/** The broadcast event a page listens for. */
export const LIVE_EVENT = "changed";

/** Push channel of a date's board: "board:10-07". Keyed by date, not year, so it survives midnight ET. */
export function liveTopic(boardKey: string): string {
  return `board:${boardKey}`;
}

/** How often a visible page checks by itself: rarely while the push channel is up, often while it isn't. */
export const LIVE_POLL_MS = { pushed: 60_000, unpushed: 15_000 } as const;

export function livePollMs(pushConnected: boolean): number {
  return pushConnected ? LIVE_POLL_MS.pushed : LIVE_POLL_MS.unpushed;
}

/** A push channel that connects this soon after a check has missed nothing: no second check. */
export const LIVE_RECHECK_MS = 5_000;

/** After a push, each page waits up to this long before checking, so a busy board's viewers don't all ask at once. */
export const LIVE_JITTER_MS = 1_000;

export function liveJitterMs(random: number = Math.random()): number {
  return Math.floor(random * LIVE_JITTER_MS);
}

export type BoardState = {
  /** Null when the date has no board yet. A new year's board has a new id. */
  boardId: string | null;
  /** People live on the board. */
  people: number;
  /** Their totals added up. */
  totalCents: number;
  /** When a live entry last changed (a claim, a boost, an edit). */
  lastChangedAt: Date | null;
};

/**
 * A short string that is different whenever what a board shows is different: someone joins or is
 * removed, a total moves, a listing is edited, or the year's board rolls over.
 */
export function boardVersion(state: BoardState): string {
  if (!state.boardId) return "open";
  return [state.boardId, state.people, state.totalCents, state.lastChangedAt?.getTime() ?? 0].join(".");
}

/**
 * Should the page re-read its data? `page` is the version it was drawn with, `seen` the last
 * answer it already acted on, `remote` the server's answer now. Acting once per answer keeps a
 * page from reloading in a loop if the two ever disagree for a few seconds.
 */
export function shouldRefresh(page: string, seen: string | null, remote: string): boolean {
  return remote !== page && remote !== seen;
}

/** wss://<project>.supabase.co/realtime/v1 from the project URL. Null when it isn't a usable URL. */
export function realtimeUrl(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.protocol === "https:" ? "wss" : "ws"}://${url.host}/realtime/v1`;
  } catch {
    return null;
  }
}
