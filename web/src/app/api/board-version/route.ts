import { parseKey } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { cachedBoardVersion } from "@/server/cached";

/**
 * GET /api/board-version?key=10-07 → { version, now }. Open pages ask this to learn whether their board
 * changed (lib/live.ts). The answer comes from a 5-second cache that a payment drops at once, so the
 * browser and the CDN must not keep their own copy. `now` is the server's time, for the countdowns
 * (lib/server-clock.ts).
 */
export async function GET(request: Request) {
  const md = parseKey(new URL(request.url).searchParams.get("key") ?? "");
  if (!md) return Response.json({ error: "Unknown date" }, { status: 400 });
  const at = now();
  const version = await cachedBoardVersion(md, at);
  return Response.json({ version, now: at.toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
