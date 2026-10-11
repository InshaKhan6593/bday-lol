/**
 * The server's time, in the browser. Saved pages can be minutes old, so they can't carry "now";
 * a countdown that trusted the visitor's own clock would be wrong on every device whose clock is.
 * The live-board check (lib/live.ts) brings the server's time back with each answer, and pages
 * drawn per request (Claim) pass theirs in. Until either arrives, the device clock is used.
 */

let offsetMs = 0;
let synced = false;

/**
 * How far the server's clock is ahead of this device's, from one request: the server's time is taken
 * to be the middle of the request.
 */
export function clockOffsetMs(serverNowMs: number, sentAtMs: number, receivedAtMs: number): number {
  return serverNowMs - (sentAtMs + receivedAtMs) / 2;
}

/** Called with every answer that carries the server's time. */
export function syncServerClock(serverNow: string, sentAtMs: number, receivedAtMs: number): void {
  const server = new Date(serverNow).getTime();
  if (Number.isNaN(server)) return;
  offsetMs = clockOffsetMs(server, sentAtMs, receivedAtMs);
  synced = true;
}

/** A page drawn a moment ago by the server says what time it was. Used only until a real answer arrives. */
export function hintServerClock(serverNow: string): void {
  if (synced) return;
  const server = new Date(serverNow).getTime();
  if (!Number.isNaN(server)) offsetMs = server - Date.now();
}

/** The server's "now" in milliseconds, as well as this device knows it. */
export function serverNowMs(): number {
  return Date.now() + offsetMs;
}
