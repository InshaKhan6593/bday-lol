// k6 load test for a deployed copy of the site (staging or a Vercel preview). Not for production.
//
//   k6 run -e BASE_URL=https://staging.example.com scripts/k6-load.js            # stress: ramp until it hurts
//   k6 run -e BASE_URL=... -e PROFILE=spike scripts/k6-load.js                    # a viral post / midnight ET
//   k6 run -e BASE_URL=... -e PROFILE=soak scripts/k6-load.js                     # steady traffic for 30 minutes
//
// Only GET requests: it never starts a checkout, so Stripe is not touched (its test mode is rate-limited).
// Install k6 from https://k6.io. For a quick local run without k6, use `pnpm load:test` (scripts/load-test.mjs).
import { check, sleep } from "k6";
import http from "k6/http";

const BASE = (__ENV.BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DATES = MONTHS.flatMap((m, i) => Array.from({ length: DAYS[i] }, (_, d) => `/${m}-${d + 1}`));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const PROFILES = {
  // Keep adding visitors: where p95 passes 1 s or errors start is the breaking point.
  stress: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: 200 },
    { duration: "2m", target: 500 },
    { duration: "2m", target: 1000 },
    { duration: "1m", target: 0 },
  ],
  // Almost nobody, then everybody at once.
  spike: [
    { duration: "30s", target: 10 },
    { duration: "10s", target: 800 },
    { duration: "2m", target: 800 },
    { duration: "30s", target: 10 },
  ],
  // Slow leaks (connections, memory) only show over time.
  soak: [
    { duration: "2m", target: 100 },
    { duration: "30m", target: 100 },
    { duration: "1m", target: 0 },
  ],
};

export const options = {
  stages: PROFILES[__ENV.PROFILE || "stress"],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
    "http_req_duration{page:date}": ["p(95)<1000"],
    "http_req_duration{page:home}": ["p(95)<1000"],
  },
};

/** One visitor: lands on a date page (search) or the homepage (a shared link), then looks around. */
export default function () {
  const r = Math.random();
  const [page, path] =
    r < 0.6 ? ["date", pick(DATES)] : r < 0.8 ? ["home", "/"] : r < 0.9 ? ["month", `/${pick(MONTHS)}`] : ["static", pick(["/how-it-works", "/terms", "/privacy"])];
  const res = http.get(BASE + path, { tags: { page } });
  check(res, { "status is 200": (x) => x.status === 200 });
  sleep(1 + Math.random() * 4);
}
