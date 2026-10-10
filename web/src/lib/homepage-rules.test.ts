import { describe, expect, it } from "vitest";
import { boostBoxTop, boostResultLine, parseAmountCents, rankWithTotal, takeTopBoost } from "./boost";
import { formatCountdown } from "./countdown";
import { giftButtons } from "./gifts";
import { comingUpCopy, othersText } from "./homepage-copy";
import { formatUsd, minToTakeTop } from "./money";
import { cleanName, firstName, personSlug, shortName, uniqueSlug } from "./people";
import { parseReminderInput } from "./reminders";
import { birthdayShareText, facebookShareUrl, smsShareUrl } from "./share";

const rules = { minOpenBidCents: 500, minStepCents: 100, minBoostCents: 200 };

describe("money", () => {
  it("formats whole dollars with separators", () => {
    expect(formatUsd(24_000)).toBe("$240");
    expect(formatUsd(1_250_000)).toBe("$12,500");
  });

  it("prices today at top + $1, or $5 when empty", () => {
    expect(minToTakeTop(24_000, rules)).toBe(24_100);
    expect(minToTakeTop(null, rules)).toBe(500);
  });
});

describe("names", () => {
  it("shortens to first name + last initial", () => {
    expect(shortName("Marcus Thompson")).toBe("Marcus T.");
    expect(shortName("Mary-Catherine Featherstonehaugh-Worthington")).toBe("Mary-Catherine F.");
    expect(shortName("Cher")).toBe("Cher");
    expect(firstName("Jess Moreno")).toBe("Jess");
  });

  it("picks the first name like the handoff says", () => {
    expect(firstName("  Isla   Brown ")).toBe("Isla");
    expect(firstName("Mary-Catherine Lee")).toBe("Mary-Catherine");
    expect(firstName("Dr. Sam Rivera")).toBe("Dr. Sam Rivera");
    expect(firstName("J. Cole")).toBe("J. Cole");
    expect(firstName("Maya")).toBe("Maya");
    expect(cleanName("  Sam   Rivera ")).toBe("Sam Rivera");
  });

  it("makes personal link slugs like the handoff says", () => {
    expect(personSlug("Lucía Gómez")).toBe("lucia-gomez");
    expect(personSlug("  Isla  Brown ")).toBe("isla-brown");
    expect(personSlug("Mary-Catherine O'Neil")).toBe("mary-catherine-o-neil");
    expect(personSlug("Zoë 🎂")).toBe("zoe");
    expect(personSlug("🎉🎉")).toBe("birthday");
    expect(personSlug("x".repeat(60))).toHaveLength(48);
    expect(uniqueSlug("sam-rivera", [])).toBe("sam-rivera");
    expect(uniqueSlug("sam-rivera", ["sam-rivera", "sam-rivera-2"])).toBe("sam-rivera-3");
  });
});

describe("gift buttons", () => {
  it("uses the full label for one link and short names for more", () => {
    expect(giftButtons([{ service: "venmo", url: "u" }])).toEqual([{ url: "u", label: "Send on Venmo" }]);
    expect(
      giftButtons([
        { service: "venmo", url: "a" },
        { service: "cashapp", url: "b" },
      ]).map((g) => g.label),
    ).toEqual(["Venmo", "Cash App"]);
  });
});

describe("boost box", () => {
  const base = { minBoostCents: 200, firstName: "Ana" };

  it("matches the mockup wording", () => {
    // Jess $240 (#1), Tyler $225 (#2), Ana $150 (#3).
    const ana = { ...base, rank: 3, totalCents: 15_000, otherTotalsCents: [24_000, 22_500] };
    expect(boostResultLine({ ...ana, amountCents: 100 })).toBe("Boosts start at $2.");
    expect(boostResultLine({ ...ana, amountCents: 500 })).toBe("New total $155. Stays at #3.");
    expect(boostResultLine({ ...ana, amountCents: 8_000 })).toBe("New total $230. Moves Ana up to #2.");
    expect(boostResultLine({ ...ana, amountCents: 9_100 })).toBe("New total $241. Takes #1!");
    const jess = { ...base, firstName: "Jess", rank: 1, totalCents: 24_000, otherTotalsCents: [22_500] };
    expect(boostResultLine({ ...jess, amountCents: 500 })).toBe("New total $245. Keeps Jess at #1.");
  });

  it("never passes someone by matching their total", () => {
    expect(rankWithTotal(24_000, [24_000, 22_500])).toBe(2);
    expect(rankWithTotal(24_100, [24_000, 22_500])).toBe(1);
  });

  it("takes #1 for at least the minimum boost", () => {
    expect(takeTopBoost(24_000, 15_000, 200)).toBe(9_100);
    expect(takeTopBoost(10_000, 10_000, 200)).toBe(200);
  });

  it("opens next to the button but always fully on screen", () => {
    expect(boostBoxTop(600, 900)).toBe(300); // 300px above the button
    expect(boostBoxTop(850, 900)).toBe(340); // pulled up so the bottom fits
    expect(boostBoxTop(120, 900)).toBe(16); // never above the top edge
    expect(boostBoxTop(500, 500)).toBe(16); // short screens: pinned to the top
  });

  it("reads the other amount as whole dollars", () => {
    expect(parseAmountCents("$12.6")).toBe(1_300);
    expect(parseAmountCents("")).toBe(0);
    expect(parseAmountCents("abc")).toBe(0);
  });
});

describe("reminder signup form", () => {
  it("accepts a valid date and lowercases the email", () => {
    expect(parseReminderInput({ month: "3", day: "14", email: "  You@Email.com " })).toEqual({
      ok: true,
      md: { month: 3, day: 14 },
      email: "you@email.com",
    });
  });

  it("accepts Feb 29 (birthdays have no year)", () => {
    expect(parseReminderInput({ month: "2", day: "29", email: "a@b.co" }).ok).toBe(true);
  });

  it("rejects a missing or impossible date", () => {
    for (const [month, day] of [[null, null], ["2", "30"], ["4", "31"], ["13", "1"], ["1", "0"]]) {
      expect(parseReminderInput({ month, day, email: "a@b.co" })).toEqual({
        ok: false,
        message: "Pick your birthday month and day.",
      });
    }
  });

  it("rejects a bad email", () => {
    for (const email of ["", "nope", "a@b", "a @b.co", null]) {
      expect(parseReminderInput({ month: "3", day: "14", email })).toEqual({
        ok: false,
        message: "Enter a valid email.",
      });
    }
  });
});

describe("countdown", () => {
  it("shows HH:MM:SS until midnight", () => {
    expect(formatCountdown(((11 * 60 + 40) * 60 + 52) * 1000)).toBe("11:40:52");
    expect(formatCountdown(999)).toBe("00:00:00");
    expect(formatCountdown(24 * 3600 * 1000)).toBe("24:00:00");
  });

  it("never goes negative after the day ends", () => {
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });
});

describe("share links", () => {
  const url = "https://mybday.lol/october-7";

  it("builds the Facebook sharer link", () => {
    expect(facebookShareUrl(url)).toBe("https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fmybday.lol%2Foctober-7");
  });

  it("puts the message and link in the text message body", () => {
    const message = birthdayShareText("Jess");
    expect(message).toBe("It's Jess's birthday on mybday.lol");
    expect(decodeURIComponent(smsShareUrl(message, url).replace("sms:?&body=", ""))).toBe(
      "It's Jess's birthday on mybday.lol https://mybday.lol/october-7",
    );
  });
});

describe("homepage copy", () => {
  it("counts the others celebrating today", () => {
    expect(othersText(7, "October 7")).toBe("7 other people are celebrating October 7");
    expect(othersText(1, "October 7")).toBe("1 other person is celebrating October 7");
  });

  it("labels coming-up dates as claimed or open", () => {
    expect(comingUpCopy({ leaderName: "Marcus Thompson", topTotalCents: 8_500 }, 500)).toEqual({
      owner: "Marcus T.",
      price: "Claimed for $85",
      claimed: true,
    });
    expect(comingUpCopy({ leaderName: null, topTotalCents: null }, 500)).toEqual({
      owner: "Unclaimed",
      price: "Claim for $5",
      claimed: false,
    });
  });
});
