import { and, eq, gt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, type Executor } from "@/db";
import { adminLogins } from "@/db/schema";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MS,
  LOGIN_WINDOW_MS,
  isValidSession,
  loginAllowed,
  sessionToken,
  verifyPassword,
} from "@/lib/admin-auth";
import { now } from "@/lib/clock";
import { routes } from "@/lib/routes";
import { unsubscribeSecret } from "./email/suppressions";

/**
 * The admin's sign-in (07 B14): one password (ADMIN_PASSWORD_HASH), a signed httpOnly cookie, and a
 * limit on wrong passwords. Every admin page and every admin action calls requireAdmin() itself:
 * nothing is protected by being hard to find.
 */

/** Is the visitor signed in as the admin? */
export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return isValidSession(token, unsubscribeSecret(), now().getTime());
}

/** For pages: sends anyone who isn't signed in to the sign-in page. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect(routes.admin.login);
}

/** Wrong passwords inside the window, from this address and from everyone. */
export async function recentFails(db: Executor, ip: string, instant: Date): Promise<{ fromThisIp: number; total: number }> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      fromThisIp: sql<number>`(count(*) filter (where ${adminLogins.ip} = ${ip}))::int`,
    })
    .from(adminLogins)
    .where(and(eq(adminLogins.ok, false), gt(adminLogins.at, new Date(instant.getTime() - LOGIN_WINDOW_MS))));
  return { fromThisIp: row?.fromThisIp ?? 0, total: row?.total ?? 0 };
}

/** Any fixed number: the advisory lock that puts sign-in tries in single file. */
const SIGN_IN_LOCK = 760_612_001;

export type SignInResult = { ok: true } | { ok: false; error: string };

/** Checks a password try and records it. Kept apart from the cookie so it can be tested. */
export async function checkPassword(db: Executor, password: string, ip: string, instant: Date): Promise<SignInResult> {
  if (!process.env.ADMIN_PASSWORD_HASH) return { ok: false, error: "The admin isn’t set up yet: ADMIN_PASSWORD_HASH is missing." };
  const hash = process.env.ADMIN_PASSWORD_HASH;
  // One try at a time, across every server instance: tries sent together would otherwise all read
  // the same count before any of them had recorded a failure, and each get a guess past the limit.
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${SIGN_IN_LOCK})`);
    if (!loginAllowed(await recentFails(tx, ip, instant))) {
      return { ok: false, error: "Too many wrong passwords. Wait 15 minutes and try again." };
    }
    const ok = verifyPassword(password, hash);
    await tx.insert(adminLogins).values({ ip, ok, at: instant });
    return ok ? { ok: true } : { ok: false, error: "That password isn’t right." };
  });
}

/** The caller's address, as the host reports it. */
async function callerIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function signIn(password: string): Promise<SignInResult> {
  const instant = now();
  const result = await checkPassword(db, password, await callerIp(), instant);
  if (!result.ok) return result;
  const expires = instant.getTime() + ADMIN_SESSION_MS;
  (await cookies()).set(ADMIN_COOKIE, sessionToken(expires, unsubscribeSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    expires: new Date(expires),
  });
  return { ok: true };
}

export async function signOut(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { httpOnly: true, path: "/admin", maxAge: 0 });
}
