// Fills famous_people from Wikidata + Wikipedia pageviews (what /api/cron/famous does in production).
// `pnpm famous:refresh` does all 12 months (a few minutes); `pnpm famous:refresh 10` only October.
import "./load-env";
import { db } from "@/db";
import { now } from "@/lib/clock";
import { refreshFamousMonth } from "@/server/famous";
import { wikidataProvider } from "@/server/famous-source";

const arg = process.argv[2];
const months = arg ? [Number(arg)] : Array.from({ length: 12 }, (_, i) => i + 1);
if (months.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) throw new Error(`Not a month: ${arg}`);

let failed = 0;
for (const month of months) {
  const started = Date.now();
  try {
    const run = await refreshFamousMonth(db, wikidataProvider, month, now());
    console.log(`Month ${month}: ${run.people} people on ${run.dates} dates (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  } catch (error) {
    failed++;
    console.error(`Month ${month} failed:`, error);
  }
}
process.exit(failed ? 1 : 0);
