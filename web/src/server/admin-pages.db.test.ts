import { afterEach, describe, expect, it, vi } from "vitest";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { adminLogins } from "@/db/schema";
import { LOGIN_MAX_FAILS_PER_IP, LOGIN_WINDOW_MS, hashPassword } from "@/lib/admin-auth";
import { faqToMarkdown, howItWorksFaq, parseFaqMarkdown } from "@/lib/how-it-works";
import { inRollback } from "@/test/db";
import { checkPassword, recentFails } from "./admin-session";
import {
  defaultPageBody,
  getEditablePage,
  getFaq,
  getLegalPage,
  isEditablePage,
  pageBodyError,
  resetSitePage,
  saveSitePage,
} from "./site-pages";

const NOON = new Date("2026-10-12T12:00:00-04:00");
const original = howItWorksFaq(BIRTHDAY_BOARD_TYPE.settings);

describe("the FAQ as editable text", () => {
  it("survives being turned into text and read back", () => {
    expect(parseFaqMarkdown(faqToMarkdown(original))).toMatchObject(original);
    expect(original).toHaveLength(10);
  });

  it("reads questions in order, joins an answer's lines, and drops a question with no answer", () => {
    const text = "Intro that is ignored.\r\n\r\n## First?\r\nLine one\r\nline two.\r\n\r\n## Empty?\r\n\r\n##   Second?  \n\nYes.\n";
    expect(parseFaqMarkdown(text)).toMatchObject([
      { q: "First?", a: "Line one line two." },
      { q: "Second?", a: "Yes." },
    ]);
  });

  it("finds nothing in text without a question line", () => {
    expect(parseFaqMarkdown("just some words\n# one hash is a title, not a question")).toEqual([]);
  });
});

describe("admin: pages", () => {
  it("starts from the original text and shows the saved one after an edit", async () => {
    await inRollback(async (tx) => {
      expect(await getEditablePage(tx, "faq")).toEqual({ body: defaultPageBody("faq"), edited: false, updatedAt: null });
      expect(await getFaq(tx)).toEqual(original);

      await saveSitePage(tx, "faq", "## New question?\n\nNew answer.\n", NOON);
      expect(await getFaq(tx)).toEqual([{ q: "New question?", a: "New answer.", blocks: [{ kind: "p", text: "New answer." }] }]);
      expect(await getEditablePage(tx, "faq")).toMatchObject({ edited: true, updatedAt: NOON.toISOString() });

      await resetSitePage(tx, "faq");
      expect(await getFaq(tx)).toEqual(original);
    });
  });

  it("saves Terms without touching Privacy or the FAQ", async () => {
    await inRollback(async (tx) => {
      await saveSitePage(tx, "terms", "# Terms\n\n## 1. One rule\n\nBe kind.\n", NOON);
      expect((await getLegalPage(tx, "terms")).sections.map((s) => s.heading)).toContain("1. One rule");
      expect((await getEditablePage(tx, "privacy")).edited).toBe(false);
      expect(await getFaq(tx)).toEqual(original);
    });
  });

  it("falls back to the original questions if a saved FAQ has none left", async () => {
    await inRollback(async (tx) => {
      await saveSitePage(tx, "faq", "no questions at all", NOON);
      expect(await getFaq(tx)).toEqual(original);
    });
  });

  it("refuses text that would leave a page empty", () => {
    expect(pageBodyError("faq", "   ")).not.toBeNull();
    expect(pageBodyError("faq", "words but no question")).not.toBeNull();
    expect(pageBodyError("faq", "## Q?\n\nA.")).toBeNull();
    expect(pageBodyError("terms", "")).not.toBeNull();
    expect(pageBodyError("terms", defaultPageBody("terms"))).toBeNull();
    expect(pageBodyError("privacy", "x".repeat(200_001))).not.toBeNull();
  });

  it("only knows its three pages", () => {
    expect(["terms", "privacy", "faq"].every(isEditablePage)).toBe(true);
    for (const bad of ["home", "", undefined, 3, "__proto__"]) expect(isEditablePage(bad), String(bad)).toBe(false);
  });
});

describe("the FAQ with formatting", () => {
  it("keeps an answer's paragraphs, bullets and bold, and gives search engines plain text", () => {
    const [faq] = parseFaqMarkdown("## How do **gifts** work?\n\nYou add a *link*.\n\n- Venmo\n- __Cash App__\n");
    expect(faq).toEqual({
      q: "How do gifts work?",
      a: "You add a link. Venmo Cash App",
      blocks: [
        { kind: "p", text: "You add a *link*." },
        { kind: "ul", items: ["Venmo", "__Cash App__"] },
      ],
    });
  });
});

describe("admin: sign-in", () => {
  afterEach(() => vi.unstubAllEnvs());
  const withPassword = () => vi.stubEnv("ADMIN_PASSWORD_HASH", hashPassword("the right password"));

  it("lets the right password in and records every try", async () => {
    withPassword();
    await inRollback(async (tx) => {
      expect(await checkPassword(tx, "wrong", "1.1.1.1", NOON)).toEqual({ ok: false, error: "That password isn’t right." });
      expect(await checkPassword(tx, "the right password", "1.1.1.1", NOON)).toEqual({ ok: true });
      expect((await tx.select().from(adminLogins)).map((r) => r.ok)).toEqual([false, true]);
    });
  });

  it("stops an address after too many wrong passwords, even with the right one, until the window passes", async () => {
    withPassword();
    await inRollback(async (tx) => {
      for (let i = 0; i < LOGIN_MAX_FAILS_PER_IP; i++) await checkPassword(tx, "wrong", "1.1.1.1", NOON);
      const blocked = await checkPassword(tx, "the right password", "1.1.1.1", NOON);
      expect(blocked).toMatchObject({ ok: false });
      expect(blocked.ok === false && blocked.error).toMatch(/Too many/);
      // A blocked try isn't recorded, so it can't keep the block alive.
      expect(await recentFails(tx, "1.1.1.1", NOON)).toEqual({ fromThisIp: LOGIN_MAX_FAILS_PER_IP, total: LOGIN_MAX_FAILS_PER_IP });
      // Someone else can still sign in.
      expect(await checkPassword(tx, "the right password", "2.2.2.2", NOON)).toEqual({ ok: true });
      // And so can the first address, once the wrong tries are older than the window.
      const later = new Date(NOON.getTime() + LOGIN_WINDOW_MS + 1_000);
      expect(await checkPassword(tx, "the right password", "1.1.1.1", later)).toEqual({ ok: true });
    });
  });

  it("is closed to everyone until a password hash is set", async () => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    await inRollback(async (tx) => {
      expect(await checkPassword(tx, "anything", "1.1.1.1", NOON)).toMatchObject({ ok: false });
      expect(await tx.select().from(adminLogins)).toEqual([]);
    });
  });
});
