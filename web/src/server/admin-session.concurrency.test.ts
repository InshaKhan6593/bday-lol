import { randomUUID } from "node:crypto";
import { like } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { adminLogins } from "@/db/schema";
import { hashPassword, LOGIN_MAX_FAILS_PER_IP } from "@/lib/admin-auth";
import { assertLocalDatabase } from "../../scripts/load-env";
import { checkPassword } from "./admin-session";

/**
 * Wrong passwords sent at the same moment. On the real pool each try is its own connection, so
 * without the sign-in lock they would all read the same count and every one would get a guess.
 * The tries are dated far in the future, so rows already in the local database don't count.
 */
const RUN = randomUUID().slice(0, 8);
const IP = `concurrency-${RUN}`;
const LATER = new Date("2099-01-01T12:00:00Z");

afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await db.delete(adminLogins).where(like(adminLogins.ip, `concurrency-${RUN}%`));
});

describe("sign-in tries at the same moment", () => {
  it("lets one address guess only as often as the limit allows", async () => {
    assertLocalDatabase();
    vi.stubEnv("ADMIN_PASSWORD_HASH", hashPassword("the right password"));

    const results = await Promise.all(Array.from({ length: 20 }, () => checkPassword(db, "a wrong guess", IP, LATER)));

    const guessed = results.filter((r) => !r.ok && r.error === "That password isn’t right.").length;
    expect(guessed).toBe(LOGIN_MAX_FAILS_PER_IP);
    expect(results.filter((r) => !r.ok && r.error.startsWith("Too many")).length).toBe(20 - LOGIN_MAX_FAILS_PER_IP);
    const rows = await db.select().from(adminLogins).where(like(adminLogins.ip, IP));
    expect(rows).toHaveLength(LOGIN_MAX_FAILS_PER_IP);
  });
});
