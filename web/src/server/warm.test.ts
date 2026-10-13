import { describe, expect, it, vi } from "vitest";
import { warmAfterChange, warmPaths } from "./warm";

const ORIGIN = "https://mybday.test";

/** A site that answers every page; `answer` can change what one page gets. */
function site(answer: (path: string, call: number) => Response | Promise<Response> = () => new Response("ok")) {
  const calls: string[] = [];
  let open = 0;
  let mostOpen = 0;
  const fetcher = (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    open += 1;
    mostOpen = Math.max(mostOpen, open);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return await answer(url.pathname, calls.filter((c) => c === url.pathname).length);
    } finally {
      open -= 1;
    }
  }) as typeof fetch;
  return { fetcher, calls, mostOpen: () => mostOpen };
}

const instantly = async () => {};

describe("asking for pages so they are built ahead", () => {
  it("asks this site for each page once, even one listed twice", async () => {
    const { fetcher, calls } = site();
    const result = await warmPaths(["/", "/october-7", "/", "/october"], { origin: ORIGIN, fetch: fetcher });
    expect(calls.sort()).toEqual(["/", "/october", "/october-7"]);
    expect(result).toMatchObject({ asked: 3, warmed: 3, failed: [], skipped: 0 });
  });

  it("only ever asks its own site, with no redirect followed and nothing cached", async () => {
    const seen: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetcher = (async (input: URL | RequestInfo, init?: RequestInit) => {
      seen.push({ url: String(input), init });
      return new Response("ok");
    }) as typeof fetch;
    await warmPaths(["/october-7/sam-rivera"], { origin: ORIGIN, fetch: fetcher });
    expect(seen[0]!.url).toBe("https://mybday.test/october-7/sam-rivera");
    expect(seen[0]!.init).toMatchObject({ redirect: "manual", cache: "no-store" });
    expect(seen[0]!.init!.signal).toBeInstanceOf(AbortSignal);
  });

  it("never has more pages on their way than it was told", async () => {
    const { fetcher, calls, mostOpen } = site();
    const paths = Array.from({ length: 40 }, (_, i) => `/page-${i}`);
    const result = await warmPaths(paths, { origin: ORIGIN, fetch: fetcher, concurrency: 4 });
    expect(calls).toHaveLength(40);
    expect(mostOpen()).toBeLessThanOrEqual(4);
    expect(result.warmed).toBe(40);
  });

  it("carries on past a page that fails, and says which and why", async () => {
    const { fetcher } = site((path) => {
      if (path === "/broken") return new Response("no", { status: 500 });
      if (path === "/down") throw new TypeError("fetch failed");
      return new Response("ok");
    });
    const result = await warmPaths(["/", "/broken", "/down", "/october"], { origin: ORIGIN, fetch: fetcher });
    expect(result.warmed).toBe(2);
    expect(result.failed.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      { path: "/broken", why: "status 500" },
      { path: "/down", why: "TypeError" },
    ]);
  });

  it("counts a redirect and a 404 as answered: the copy is saved either way", async () => {
    const { fetcher } = site((path) => new Response(null, { status: path === "/moved" ? 307 : 404 }));
    expect(await warmPaths(["/moved", "/gone"], { origin: ORIGIN, fetch: fetcher })).toMatchObject({ warmed: 2, failed: [] });
  });

  it("stops starting pages when its time is up, and says how many it left", async () => {
    let clock = 0;
    const { fetcher, calls } = site(() => {
      clock += 400;
      return new Response("ok");
    });
    const result = await warmPaths(["/a", "/b", "/c", "/d", "/e"], { origin: ORIGIN, fetch: fetcher, concurrency: 1, budgetMs: 1_000, now: () => clock });
    expect(calls).toEqual(["/a", "/b", "/c"]);
    expect(result).toMatchObject({ asked: 5, warmed: 3, skipped: 2 });
  });

  it("after a change, asks once more for a page still served from the old copy", async () => {
    const waits: number[] = [];
    const { fetcher, calls } = site((path, call) => new Response("ok", { headers: { "x-vercel-cache": path === "/" && call === 1 ? "HIT" : "MISS" } }));
    const result = await warmPaths(["/", "/october-7"], {
      origin: ORIGIN,
      fetch: fetcher,
      expectFresh: true,
      retryAfterMs: 750,
      sleep: async (ms) => void waits.push(ms),
    });
    expect(calls.filter((c) => c === "/")).toHaveLength(2);
    expect(calls.filter((c) => c === "/october-7")).toHaveLength(1);
    expect(waits).toEqual([750]);
    expect(result.warmed).toBe(2);
  });

  it("asks only twice even if the old copy keeps coming back", async () => {
    const { fetcher, calls } = site(() => new Response("ok", { headers: { "x-vercel-cache": "STALE" } }));
    await warmPaths(["/"], { origin: ORIGIN, fetch: fetcher, expectFresh: true, sleep: instantly });
    expect(calls).toHaveLength(2);
  });

  it("on the nightly run, an old copy is a fine answer: no second ask", async () => {
    const { fetcher, calls } = site(() => new Response("ok", { headers: { "x-vercel-cache": "HIT" } }));
    await warmPaths(["/"], { origin: ORIGIN, fetch: fetcher, sleep: instantly });
    expect(calls).toHaveLength(1);
  });

  it("does nothing for an empty list", async () => {
    const { fetcher, calls } = site();
    expect(await warmPaths([], { origin: ORIGIN, fetch: fetcher })).toMatchObject({ asked: 0, warmed: 0, skipped: 0 });
    expect(calls).toEqual([]);
  });
});

describe("warming after a change", () => {
  it("is skipped outside production, and never throws outside a request", () => {
    expect(() => warmAfterChange(["/"])).not.toThrow();
    vi.stubEnv("NODE_ENV", "production");
    try {
      // No request is running here, so there is no "after": it must give up quietly.
      expect(() => warmAfterChange(["/"])).not.toThrow();
      expect(() => warmAfterChange([])).not.toThrow();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
