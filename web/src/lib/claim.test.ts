import { describe, expect, it } from "vitest";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import {
  bidError,
  bidHint,
  claimMinCents,
  claimTarget,
  parseClaimParams,
  squareCrop,
  targetBox,
  validateClaim,
  withMonth,
  type ClaimInput,
} from "./claim";
import {
  giftEntryHint,
  nextUnusedService,
  parseGiftEntry,
  parseGiftLink,
  switchGiftApp,
  typeInGiftRow,
} from "./gifts";
import { stripWrappingQuotes } from "./people";

const settings = BIRTHDAY_BOARD_TYPE.settings;
const ranked = [
  { name: "Jess Moreno", totalCents: 24_000 },
  { name: "Tyler Brooks", totalCents: 22_500 },
];

describe("claim URL", () => {
  it("reads the date and rank from Claim this rank", () => {
    expect(parseClaimParams({ date: "october-7", rank: "2" })).toEqual({ md: { month: 10, day: 7 }, rank: 2 });
    expect(parseClaimParams({ date: "february-29" })).toEqual({ md: { month: 2, day: 29 }, rank: 1 });
  });

  it("ignores bad or repeated values", () => {
    expect(parseClaimParams({})).toEqual({ md: null, rank: 1 });
    expect(parseClaimParams({ date: "october", rank: "0" })).toEqual({ md: null, rank: 1 });
    expect(parseClaimParams({ date: "february-30", rank: "-2" })).toEqual({ md: null, rank: 1 });
    expect(parseClaimParams({ date: ["october-7", "october-8"], rank: "2.5" })).toEqual({ md: null, rank: 1 });
  });

  it("keeps the day when switching month, or moves to the month's last day", () => {
    expect(withMonth({ month: 10, day: 7 }, 3)).toEqual({ month: 3, day: 7 });
    expect(withMonth({ month: 10, day: 31 }, 11)).toEqual({ month: 11, day: 30 });
    expect(withMonth({ month: 1, day: 31 }, 2)).toEqual({ month: 2, day: 29 });
  });
});

describe("claim target", () => {
  it("is the #1 by default", () => {
    const target = claimTarget(ranked, 1);
    expect(target).toEqual({ rank: 1, name: "Jess Moreno", totalCents: 24_000 });
    expect(claimMinCents(target, settings)).toBe(24_100);
    expect(targetBox(target)).toEqual({ label: "Current leader", name: "Jess Moreno", amount: "$240" });
    expect(bidHint(target, 24_100)).toBe("$241 or more to claim the homepage");
  });

  it("is rank N after Claim #N", () => {
    const target = claimTarget(ranked, 2);
    expect(claimMinCents(target, settings)).toBe(22_600);
    expect(targetBox(target)).toEqual({ label: "Current #2", name: "Tyler Brooks", amount: "$225" });
    expect(bidHint(target, 22_600)).toBe("$226 or more to take #2");
  });

  it("falls back to the #1 when rank N is gone, and to nobody on an empty date", () => {
    expect(claimTarget(ranked, 5).rank).toBe(1);
    const empty = claimTarget([], 3);
    expect(empty).toEqual({ rank: 1, name: null, totalCents: null });
    expect(claimMinCents(empty, settings)).toBe(500);
    expect(targetBox(empty)).toEqual({ label: "Current leader", name: "Nobody yet", amount: "$0" });
    expect(bidHint(empty, 500)).toBe("$5 or more to claim the homepage");
  });

  it("explains a bid that is too low (07 B23)", () => {
    const leader = claimTarget(ranked, 1);
    expect(bidError(24_000, 24_100, leader)).toBe("Bid at least $241 to take the homepage.");
    expect(bidError(24_100, 24_100, leader)).toBeNull();
    expect(bidError(0, 22_600, claimTarget(ranked, 2))).toBe("Bid at least $226 to take #2.");
  });
});

describe("gift links", () => {
  it("detects each service and stores a clean https URL", () => {
    expect(parseGiftLink("venmo.com/u/sam")).toEqual({
      kind: "ok",
      link: { service: "venmo", url: "https://venmo.com/u/sam" },
    });
    expect(parseGiftLink(" https://cash.app/$samr ")).toEqual({
      kind: "ok",
      link: { service: "cashapp", url: "https://cash.app/$samr" },
    });
    expect(parseGiftLink("http://www.amazon.com/hz/wishlist/ls/ABC123#top")).toEqual({
      kind: "ok",
      link: { service: "amazon", url: "https://www.amazon.com/hz/wishlist/ls/ABC123" },
    });
    expect(parseGiftLink("https://a.co/d/xyz")).toMatchObject({ kind: "ok", link: { service: "amazon" } });
    expect(parseGiftLink("throne.com/sam")).toMatchObject({ kind: "ok", link: { service: "throne" } });
  });

  it("rejects look-alike hosts, other schemes and bare domains", () => {
    for (const bad of [
      "venmo.com.evil.example/u/sam",
      "notvenmo.com/u/sam",
      "https://evil.example/?r=venmo.com",
      "javascript:alert(1)//venmo.com",
      "ftp://venmo.com/u/sam",
      "https://user:pw@venmo.com/u/sam",
      "https://venmo.com:8443/u/sam",
      "venmo.com",
      "https://throne.com/",
      "venmo.com/u/sam smith",
      "paypal.me/sam",
    ]) {
      expect(parseGiftLink(bad), bad).toEqual({ kind: "bad" });
    }
    expect(parseGiftLink("   ")).toEqual({ kind: "empty" });
  });

});

describe("gift rows: app + username (handoff v2)", () => {
  it("builds the button link from the username", () => {
    expect(parseGiftEntry({ service: "venmo", value: "sam-rivera" })).toEqual({
      kind: "ok",
      link: { service: "venmo", url: "https://venmo.com/u/sam-rivera" },
    });
    expect(parseGiftEntry({ service: "cashapp", value: "samr" })).toEqual({
      kind: "ok",
      link: { service: "cashapp", url: "https://cash.app/$samr" },
    });
    expect(parseGiftEntry({ service: "throne", value: "@samr" })).toEqual({
      kind: "ok",
      link: { service: "throne", url: "https://throne.com/samr" },
    });
  });

  it("takes Amazon only as a wishlist link, and full links for any app", () => {
    expect(parseGiftEntry({ service: "amazon", value: "samr" })).toEqual({ kind: "bad" });
    expect(parseGiftEntry({ service: "amazon", value: "amazon.com/hz/wishlist/ls/ABC" })).toEqual({
      kind: "ok",
      link: { service: "amazon", url: "https://amazon.com/hz/wishlist/ls/ABC" },
    });
    expect(parseGiftEntry({ service: "venmo", value: "https://venmo.com/u/sam" }).kind).toBe("ok");
    // A Cash App link in the Venmo row is wrong.
    expect(parseGiftEntry({ service: "venmo", value: "cash.app/$sam" })).toEqual({ kind: "bad" });
  });

  it("checks usernames per app", () => {
    expect(parseGiftEntry({ service: "venmo", value: "a" }).kind).toBe("bad");
    expect(parseGiftEntry({ service: "cashapp", value: "1sam" }).kind).toBe("bad");
    expect(parseGiftEntry({ service: "throne", value: "sam rivera" }).kind).toBe("bad");
    expect(parseGiftEntry({ service: "venmo", value: "   " })).toEqual({ kind: "empty" });
  });

  it("drops a typed @ or $, and switches the app when a full link is pasted", () => {
    expect(typeInGiftRow({ service: "venmo", value: "" }, "@sam", [])).toEqual({ service: "venmo", value: "sam" });
    expect(typeInGiftRow({ service: "cashapp", value: "" }, "$$sam", [])).toEqual({ service: "cashapp", value: "sam" });
    expect(typeInGiftRow({ service: "venmo", value: "" }, "cash.app/$sam", [])).toEqual({
      service: "cashapp",
      value: "cash.app/$sam",
    });
    // Cash App is already used in another row: the row keeps its app.
    expect(typeInGiftRow({ service: "venmo", value: "" }, "cash.app/$sam", ["cashapp"]).service).toBe("venmo");
    expect(switchGiftApp({ service: "amazon", value: "@sam" }, "venmo")).toEqual({ service: "venmo", value: "sam" });
  });

  it("adds the next unused app, and none once all four are in", () => {
    expect(nextUnusedService([{ service: "venmo", value: "" }])).toBe("cashapp");
    expect(nextUnusedService([{ service: "cashapp", value: "" }, { service: "venmo", value: "" }])).toBe("amazon");
    const all = (["venmo", "cashapp", "amazon", "throne"] as const).map((service) => ({ service, value: "" }));
    expect(nextUnusedService(all)).toBeNull();
  });

  it("words the hint under each row like the mockup", () => {
    expect(giftEntryHint({ service: "venmo", value: "sam" })).toEqual({
      text: "Your spot will show a “Send on Venmo” button",
      tone: "strong",
    });
    expect(giftEntryHint({ service: "amazon", value: "amazon.com/hz/wishlist/ls/A" })?.text).toBe(
      "Your spot will show a “Shop my Amazon wishlist” button",
    );
    expect(giftEntryHint({ service: "venmo", value: "x" })).toEqual({ text: "Please enter a correct @username", tone: "error" });
    expect(giftEntryHint({ service: "cashapp", value: "9" })?.text).toBe("Please enter a correct $cashtag");
    expect(giftEntryHint({ service: "amazon", value: "nope" })?.text).toBe("Please enter a correct wishlist link");
    expect(giftEntryHint({ service: "throne", value: "a b" })?.text).toBe("Please enter a correct username");
    expect(giftEntryHint({ service: "throne", value: "" })).toBeNull();
  });
});

describe("claim form", () => {
  const target = claimTarget(ranked, 1);
  const good: ClaimInput = {
    md: { month: 10, day: 7 },
    bid: "$241",
    name: "  Sam   Rivera ",
    bio: "Turning 25 today. Tacos over cake, always and forever.",
    giftLinks: [
      { service: "venmo", value: "sam" },
      { service: "cashapp", value: "" },
    ],
    theme: "butter",
    email: " Sam@Example.com ",
  };

  it("accepts a good claim and tidies it", () => {
    const result = validateClaim(good, 24_100, target, settings);
    expect(result).toEqual({
      ok: true,
      claim: {
        md: { month: 10, day: 7 },
        amountCents: 24_100,
        name: "Sam Rivera",
        bio: "Turning 25 today. Tacos over cake, always and forever.",
        giftLinks: [{ service: "venmo", url: "https://venmo.com/u/sam" }],
        theme: "butter",
        email: "sam@example.com",
      },
    });
  });

  it("allows no bio and no gift links", () => {
    const noLinks = { ...good, bio: "", giftLinks: [{ service: "venmo" as const, value: "" }] };
    expect(validateClaim(noLinks, 24_100, target, settings).ok).toBe(true);
  });

  it("reports every problem at once", () => {
    const result = validateClaim(
      {
        ...good,
        bid: "$240",
        name: "   ",
        bio: "x".repeat(81),
        giftLinks: [{ service: "venmo", value: "paypal.me/sam" }],
        theme: "neon",
        email: "sam@",
      },
      24_100,
      target,
      settings,
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        bid: "Bid at least $241 to take the homepage.",
        name: "Add a name to continue.",
        bio: "Bios can be up to 80 characters.",
        giftLinks: "Please enter a correct @username",
        theme: "Pick a color.",
        email: "Enter your email for the receipt.",
      },
    });
  });

  it("allows one link for each of the four apps", () => {
    const four = [
      { service: "venmo", value: "aa" },
      { service: "cashapp", value: "bb" },
      { service: "throne", value: "cc" },
      { service: "amazon", value: "a.co/d/e" },
    ] as const;
    const result = validateClaim({ ...good, giftLinks: [...four] }, 24_100, target, settings);
    expect(result.ok && result.claim.giftLinks.map((l) => l.service)).toEqual(["venmo", "cashapp", "throne", "amazon"]);
  });

  it("enforces the length limit and one link per app on the server too", () => {
    const twice = [
      { service: "venmo", value: "aa" },
      { service: "venmo", value: "bb" },
    ] as const;
    const result = validateClaim({ ...good, name: "N".repeat(41), giftLinks: [...twice] }, 24_100, target, settings);
    expect(result).toEqual({
      ok: false,
      errors: { name: "Names can be up to 40 characters.", giftLinks: "Add one link per app." },
    });
  });
});

describe("bio quotes", () => {
  it("strips double quotes typed around a bio, so the homepage shows one pair", () => {
    expect(stripWrappingQuotes('"Turning 25 today"')).toBe("Turning 25 today");
    expect(stripWrappingQuotes("“Turning 25 today”")).toBe("Turning 25 today");
    expect(stripWrappingQuotes('""Hi!""')).toBe("Hi!");
    expect(stripWrappingQuotes(' " Tacos over cake " ')).toBe("Tacos over cake");
    expect(stripWrappingQuotes("«Bonjour»")).toBe("Bonjour");
  });

  it("keeps quotes inside the bio and apostrophes at the edges", () => {
    expect(stripWrappingQuotes('My motto: "eat cake"!')).toBe('My motto: "eat cake"!');
    expect(stripWrappingQuotes("'90s kid")).toBe("'90s kid");
    expect(stripWrappingQuotes("Throwing the kids' party")).toBe("Throwing the kids' party");
    expect(stripWrappingQuotes('"""')).toBe("");
  });

  it("is applied when a claim is checked", () => {
    const result = validateClaim(
      {
        md: { month: 10, day: 7 },
        bid: "$5",
        name: "Sam",
        bio: '  "Turning 25 today."  ',
        giftLinks: [],
        theme: "butter",
        email: "sam@example.com",
      },
      500,
      claimTarget([], 1),
      settings,
    );
    expect(result.ok && result.claim.bio).toBe("Turning 25 today.");
  });
});

describe("photo crop", () => {
  it("cuts the centered square", () => {
    expect(squareCrop(4032, 3024)).toEqual({ x: 504, y: 0, size: 3024 });
    expect(squareCrop(1080, 1920)).toEqual({ x: 0, y: 420, size: 1080 });
    expect(squareCrop(512, 512)).toEqual({ x: 0, y: 0, size: 512 });
  });
});
