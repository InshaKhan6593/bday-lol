import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "./proxy";

/** Where the proxy sends a request, as a path. Null when it leaves the request alone. */
function sentTo(path: string): string | null {
  const response = proxy(new NextRequest(new URL(path, "https://mybday.test")));
  const rewrite = response.headers.get("x-middleware-rewrite");
  if (!rewrite) return null;
  const url = new URL(rewrite);
  return url.pathname + url.search;
}

afterEach(() => vi.unstubAllEnvs());

describe("the saved copy a request is sent to", () => {
  // 11:30 PM Eastern on Oct 11: already Oct 12 in UTC, still Oct 11 for the site.
  const at = (iso: string) => vi.stubEnv("DEV_NOW", iso);

  it("is today's Eastern day for the homepage and a date page", () => {
    at("2026-10-11T23:30:00-04:00");
    expect(sentTo("/")).toBe("/home/2026-10-11");
    expect(sentTo("/october-7")).toBe("/october-7/~day/2026-10-11");
    expect(sentTo("/february-29")).toBe("/february-29/~day/2026-10-11");
  });

  it("changes at midnight Eastern", () => {
    at("2026-10-12T00:00:01-04:00");
    expect(sentTo("/")).toBe("/home/2026-10-12");
  });

  it("is a personal link's own copy, with the address's query kept", () => {
    at("2026-10-11T12:00:00-04:00");
    expect(sentTo("/october-7/sam-rivera")).toBe("/october-7/~day/2026-10-11/sam-rivera");
    expect(sentTo("/october-7/sam-rivera-2")).toBe("/october-7/~day/2026-10-11/sam-rivera-2");
    expect(sentTo("/october-7?boost=abc&amount=5")).toBe("/october-7/~day/2026-10-11?boost=abc&amount=5");
  });

  it("leaves the share image, months, bad dates and deeper paths to their own routes", () => {
    at("2026-10-11T12:00:00-04:00");
    for (const path of [
      "/october-7/opengraph-image",
      "/october-7/sam-rivera/opengraph-image",
      "/october",
      "/february-30",
      "/oct-7",
      "/oct-7/sam-rivera",
      "/october-7/Sam-Rivera",
      "/october-7/sam_rivera",
      "/october-7/-sam",
      "/october-7/sam--rivera",
      "/october-7/~day",
      "/october-7/",
      "/admin",
      "/how-it-works",
    ]) {
      expect(sentTo(path), path).toBeNull();
    }
  });

  it("never copies anything but a link name into the address it writes", () => {
    at("2026-10-11T12:00:00-04:00");
    for (const path of ["/october-7/..%2Fadmin", "/october-7/a%2Fb", "/october-7/%7Eday", `/october-7/${"a".repeat(65)}`]) {
      expect(sentTo(path), path).toBeNull();
    }
  });
});

describe("which requests reach the proxy at all", () => {
  const matchers = config.matcher.map((source) => {
    // The same shape Next compiles: a named group is `:name(pattern)`.
    const pattern = source.replace(/:[a-z]+\(((?:[^()]|\([^()]*\))*)\)/g, "($1)");
    return new RegExp(`^${pattern}$`);
  });
  const reaches = (path: string) => matchers.some((m) => m.test(path));

  it("takes the homepage, date pages and names under them", () => {
    for (const path of ["/", "/october-7", "/february-29", "/october-7/sam-rivera", "/may-1/ana"]) expect(reaches(path), path).toBe(true);
  });

  it("skips everything else, so other pages pay nothing for it", () => {
    for (const path of ["/october", "/admin", "/api/board-version", "/how-it-works", "/october-7/sam/more", "/_next/static/x.js", "/claim"]) {
      expect(reaches(path), path).toBe(false);
    }
  });
});
