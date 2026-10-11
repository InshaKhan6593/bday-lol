import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_MS,
  LOGIN_MAX_FAILS_PER_IP,
  LOGIN_MAX_FAILS_TOTAL,
  hashPassword,
  isValidSession,
  loginAllowed,
  sessionToken,
  verifyPassword,
} from "./admin-auth";

const SECRET = "a-long-random-secret-for-tests-0123456789";
const NOW = new Date("2026-10-12T12:00:00Z").getTime();

describe("admin password", () => {
  it("matches the password it was made from, and nothing else", () => {
    const stored = hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt:")).toBe(true);
    // Safe to paste into an env file, where "$name" would be read as another variable.
    expect(stored).not.toContain("$");
    expect(stored).not.toContain("correct horse");
    expect(verifyPassword("correct horse battery", stored)).toBe(true);
    expect(verifyPassword("correct horse batterY", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("salts: the same password hashes differently each time", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("never matches a missing or broken hash", () => {
    for (const stored of [undefined, "", "plain-password", "scrypt:only-salt", "bcrypt:a:b", "scrypt:a:b:c", "scrypt:c2FsdA:c2hvcnQ"]) {
      expect(verifyPassword("anything", stored), String(stored)).toBe(false);
    }
  });
});

describe("admin session", () => {
  it("accepts its own cookie until it expires", () => {
    const token = sessionToken(NOW + ADMIN_SESSION_MS, SECRET);
    expect(isValidSession(token, SECRET, NOW)).toBe(true);
    expect(isValidSession(token, SECRET, NOW + ADMIN_SESSION_MS - 1)).toBe(true);
    expect(isValidSession(token, SECRET, NOW + ADMIN_SESSION_MS)).toBe(false);
  });

  it("refuses a cookie whose expiry was edited", () => {
    const token = sessionToken(NOW + 1_000, SECRET);
    const signature = token.split(".")[1];
    expect(isValidSession(`${NOW + 999_999_999}.${signature}`, SECRET, NOW)).toBe(false);
  });

  it("refuses a cookie signed with another secret, and anything malformed", () => {
    expect(isValidSession(sessionToken(NOW + 1_000, "another-secret"), SECRET, NOW)).toBe(false);
    for (const bad of [undefined, null, 42, "", "abc", "123", "123.", ".sig", "1.2.3", "x".repeat(300)]) {
      expect(isValidSession(bad, SECRET, NOW), String(bad)).toBe(false);
    }
  });

  it("is off without a secret", () => {
    expect(isValidSession(sessionToken(NOW + 1_000, SECRET), undefined, NOW)).toBe(false);
  });

  it("can't be reused as an unsubscribe signature (its own signing label)", () => {
    const token = sessionToken(NOW + 1_000, SECRET);
    expect(token.split(".")[1]).not.toBe(sessionToken(NOW + 1_001, SECRET).split(".")[1]);
  });
});

describe("login rate limit", () => {
  it("allows tries until an address has too many wrong passwords", () => {
    expect(loginAllowed({ fromThisIp: 0, total: 0 })).toBe(true);
    expect(loginAllowed({ fromThisIp: LOGIN_MAX_FAILS_PER_IP - 1, total: 10 })).toBe(true);
    expect(loginAllowed({ fromThisIp: LOGIN_MAX_FAILS_PER_IP, total: 10 })).toBe(false);
  });

  it("stops everyone when wrong passwords come from many addresses at once", () => {
    expect(loginAllowed({ fromThisIp: 0, total: LOGIN_MAX_FAILS_TOTAL })).toBe(false);
  });
});
