import { describe, expect, it } from "vitest";
import { hourIn } from "./birthday";
import { readUnsubscribeToken, unsubscribeToken } from "./unsubscribe";

const SECRET = "a-test-secret-that-is-long-enough-123";

describe("unsubscribe links", () => {
  it("round-trips the email (lowercased) and category", () => {
    const token = unsubscribeToken(" Sam@Example.com ", "your_day", SECRET);
    expect(readUnsubscribeToken(token, SECRET)).toEqual({ email: "sam@example.com", category: "your_day" });
  });

  it("is URL-safe", () => {
    expect(unsubscribeToken("sam+bday@example.com", "reminders", SECRET)).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("rejects a token signed with another secret", () => {
    const token = unsubscribeToken("sam@example.com", "reminders", "another-secret");
    expect(readUnsubscribeToken(token, SECRET)).toBeNull();
  });

  it("rejects an edited email or category", () => {
    const token = unsubscribeToken("sam@example.com", "reminders", SECRET);
    const [, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify(["jess@example.com", "reminders"])).toString("base64url");
    expect(readUnsubscribeToken(`${forged}.${signature}`, SECRET)).toBeNull();
  });

  it("rejects junk", () => {
    for (const junk of [undefined, null, 42, "", "abc", "a.b", "a.b.c", "x".repeat(2_000)]) {
      expect(readUnsubscribeToken(junk, SECRET)).toBeNull();
    }
  });

  it("rejects a correctly signed payload with an unknown category", () => {
    // Signed with the real secret, but the category isn't one people can switch off.
    const token = unsubscribeToken("sam@example.com", "receipts" as never, SECRET);
    expect(readUnsubscribeToken(token, SECRET)).toBeNull();
  });
});

describe("hourIn", () => {
  it("reads the hour in Eastern Time across DST", () => {
    expect(hourIn(new Date("2026-10-07T12:05:00Z"), "America/New_York")).toBe(8); // EDT, UTC-4
    expect(hourIn(new Date("2026-12-07T12:05:00Z"), "America/New_York")).toBe(7); // EST, UTC-5
  });
});
