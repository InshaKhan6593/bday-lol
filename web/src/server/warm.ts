import { after } from "next/server";
import { siteOrigin } from "@/lib/routes";
import { servedFromOldCopy } from "@/lib/warm";

/**
 * Asks for saved pages so they are built before a visitor needs them (lib/warm.ts says which).
 * A page is "warm" once the site has answered for it: the copy is saved and the next visitor gets
 * it from the nearest location with no wait.
 *
 * Warming is a favour, never a duty: a page that fails to warm is simply built by its next visitor,
 * as before. Nothing here throws.
 */

export type WarmOptions = {
  /** The site to ask, e.g. https://mybday.lol. */
  origin: string;
  fetch?: typeof fetch;
  /** Pages asked for at the same time. */
  concurrency?: number;
  /** Stop starting new pages after this long. */
  budgetMs?: number;
  /** Give up on one page after this long. */
  timeoutMs?: number;
  /**
   * After a change: an answer that still comes from the copy just thrown away is asked for once
   * more, a little later. Leave off for the nightly run, where an old copy is a fine answer.
   */
  expectFresh?: boolean;
  /** How long to wait before that second ask. */
  retryAfterMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export type WarmResult = {
  /** Pages given. */
  asked: number;
  /** Pages the site answered for. */
  warmed: number;
  /** Pages that failed or timed out, with why. */
  failed: Array<{ path: string; why: string }>;
  /** Pages never started because the time budget ran out. */
  skipped: number;
  ms: number;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function warmOne(path: string, options: Required<Pick<WarmOptions, "origin" | "fetch" | "timeoutMs">>): Promise<Response> {
  // Only ever this site's own pages: the path is one of ours, joined to our own origin.
  const response = await options.fetch(new URL(path, options.origin), {
    // A page that answers with a redirect (a personal link whose person left) is warm too.
    redirect: "manual",
    cache: "no-store",
    headers: { "user-agent": "mybday-warm/1" },
    signal: AbortSignal.timeout(options.timeoutMs),
  });
  // Read to the end, so the page is fully built and the connection is free for the next one.
  await response.arrayBuffer().catch(() => undefined);
  return response;
}

export async function warmPaths(paths: string[], options: WarmOptions): Promise<WarmResult> {
  const clock = options.now ?? Date.now;
  const sleep = options.sleep ?? wait;
  const one = { origin: options.origin, fetch: options.fetch ?? fetch, timeoutMs: options.timeoutMs ?? 10_000 };
  const started = clock();
  const budgetMs = options.budgetMs ?? 20_000;
  const unique = [...new Set(paths)];
  const result: WarmResult = { asked: unique.length, warmed: 0, failed: [], skipped: 0, ms: 0 };
  let next = 0;

  async function worker(): Promise<void> {
    while (next < unique.length) {
      if (clock() - started >= budgetMs) return;
      const path = unique[next++]!;
      try {
        let response = await warmOne(path, one);
        if (options.expectFresh && servedFromOldCopy(response.headers.get("x-vercel-cache"))) {
          await sleep(options.retryAfterMs ?? 1_000);
          response = await warmOne(path, one);
        }
        if (response.status >= 500) result.failed.push({ path, why: `status ${response.status}` });
        else result.warmed += 1;
      } catch (error) {
        result.failed.push({ path, why: error instanceof Error ? error.name : "error" });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(options.concurrency ?? 6, unique.length)) }, worker));
  result.skipped = unique.length - result.warmed - result.failed.length;
  result.ms = clock() - started;
  return result;
}

/**
 * After a change (a payment, an admin edit): builds the pages it shows on, once the answer to the
 * request that made the change has gone out, so nobody waits for this. Call it after the saved
 * copies have been thrown away (revalidatePath).
 */
export function warmAfterChange(paths: string[]): void {
  // A development server builds every page on every visit: nothing to warm, and no site to ask.
  if (process.env.NODE_ENV !== "production" || paths.length === 0) return;
  try {
    after(async () => {
      // Throwing the old copies away takes a moment to reach every location.
      await wait(400);
      const result = await warmPaths(paths, { origin: siteOrigin(), expectFresh: true, budgetMs: 15_000 });
      if (result.failed.length) console.warn("Pages not built ahead (their next visitor builds them):", result.failed);
    });
  } catch {
    // Outside a request (a script, a test) there is no "after": the next visitor builds the page.
  }
}
