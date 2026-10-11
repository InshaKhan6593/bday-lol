// A small load test with no dependencies: `node scripts/load-test.mjs [base url]` (pnpm load:test).
//
// For each kind of page it holds N visitors hitting the site back to back, raising N in stages, and
// prints requests per second, latency percentiles and errors per stage. It also samples how many
// Postgres connections are open (local Docker database only).
//
// Run it against a production build (`pnpm build && pnpm start -p 3100`), never `pnpm dev`, and never
// against the live site: use scripts/k6-load.js on a staging copy for that. Only GET requests: it
// never starts a checkout, so Stripe is not touched.
import { execFile } from "node:child_process";
import http from "node:http";
import https from "node:https";

const BASE = new URL(process.argv[2] ?? "http://localhost:3100");
const STAGES = (process.env.STAGES ?? "10,50,100,200,400").split(",").map(Number);
const SECONDS = Number(process.env.SECONDS ?? 8);
const client = BASE.protocol === "https:" ? https : http;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DATES = MONTHS.flatMap((m, i) => Array.from({ length: DAYS[i] }, (_, d) => `/${m}-${d + 1}`));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const SCENARIOS = {
  "Cached pages (How it works, Terms, month pages)": () => pick(["/how-it-works", "/terms", `/${pick(MONTHS)}`]),
  "Homepage (per request)": () => "/",
  "Date pages, all 366 at random (per request)": () => pick(DATES),
  "Mixed visitors (60% dates, 20% home, 10% months, 10% static)": () => {
    const r = Math.random();
    if (r < 0.6) return pick(DATES);
    if (r < 0.8) return "/";
    if (r < 0.9) return `/${pick(MONTHS)}`;
    return pick(["/how-it-works", "/terms", "/privacy"]);
  },
};

function get(path, agent) {
  return new Promise((resolve) => {
    const started = performance.now();
    const req = client.get({ host: BASE.hostname, port: BASE.port, path, agent, timeout: 30_000 }, (res) => {
      res.resume();
      res.on("end", () => resolve({ status: res.statusCode, ms: performance.now() - started }));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (error) => resolve({ status: error.message === "timeout" ? "timeout" : "error", ms: performance.now() - started }));
  });
}

/** Open connections on the local Docker Postgres, or null when it isn't there. */
function dbConnections() {
  return new Promise((resolve) => {
    execFile(
      "docker",
      ["exec", "bday-lol-db-1", "psql", "-U", "bday", "-d", "bday", "-tAc", "select count(*) from pg_stat_activity where datname = 'bday'"],
      (error, stdout) => resolve(error ? null : Number(stdout.trim())),
    );
  });
}

async function stage(nextPath, visitors) {
  const agent = new client.Agent({ keepAlive: true, maxSockets: visitors });
  const results = [];
  const until = performance.now() + SECONDS * 1000;
  let peakDb = 0;
  const sampler = setInterval(async () => {
    const n = await dbConnections();
    if (n !== null) peakDb = Math.max(peakDb, n);
  }, 1000);
  await Promise.all(
    Array.from({ length: visitors }, async () => {
      while (performance.now() < until) results.push(await get(nextPath(), agent));
    }),
  );
  clearInterval(sampler);
  agent.destroy();

  const ok = results.filter((r) => r.status === 200).map((r) => r.ms).sort((a, b) => a - b);
  const at = (p) => (ok.length ? Math.round(ok[Math.min(ok.length - 1, Math.floor((p / 100) * ok.length))]) : 0);
  const failed = {};
  for (const r of results) if (r.status !== 200) failed[r.status] = (failed[r.status] ?? 0) + 1;
  return {
    visitors,
    "req/s": Math.round(results.length / SECONDS),
    "p50 ms": at(50),
    "p95 ms": at(95),
    "p99 ms": at(99),
    failed: Object.keys(failed).length ? JSON.stringify(failed) : 0,
    "db conns (peak)": peakDb || "n/a",
  };
}

console.log(`Target ${BASE.origin}, ${SECONDS}s per stage, visitors per stage: ${STAGES.join(", ")}\n`);
for (const [name, nextPath] of Object.entries(SCENARIOS)) {
  // One warm-up pass so the first stage doesn't pay for cold caches.
  await stage(nextPath, 5);
  const rows = [];
  for (const visitors of STAGES) rows.push(await stage(nextPath, visitors));
  console.log(name);
  console.table(rows);
}
