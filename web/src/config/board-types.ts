import type { ThemeKey } from "./themes";

/**
 * Settings stored on a board type (and optionally overridden per board).
 * Keeping rules here instead of in code is the client's build note:
 * "Keep dates, colors and wording as settings on the board where you can."
 */
export type BoardTypeSettings = {
  /** How often a key gets a fresh board. Birthdays reset every year. */
  period: "yearly";
  /** IANA time zone that defines when a day starts and ends. */
  timezone: string;
  /** Minimum claim on a board with no entries. */
  minOpenBidCents: number;
  /** Amount above someone's total needed to pass them. */
  minStepCents: number;
  /** Smallest boost (covers Stripe fees). */
  minBoostCents: number;
  /** Quick amounts shown in the Boost box. */
  boostChipsCents: number[];
  /** Default selected Boost chip. */
  defaultBoostCents: number;
  maxGiftLinks: number;
  nameMaxLength: number;
  bioMaxLength: number;
  /** Theme when nobody has bid (homepage, claim page start, how it works). */
  defaultTheme: ThemeKey;
  /** Theme for a board with no entries on the Find page. */
  emptyTheme: ThemeKey;
  /** Theme the Claim page starts on before a color is picked (handoff v2: Sky). */
  claimTheme: ThemeKey;
};

export type BoardSettings = Partial<BoardTypeSettings>;

export const BIRTHDAY_BOARD_TYPE = {
  slug: "birthday",
  name: "Birthdays",
  settings: {
    period: "yearly",
    timezone: "America/New_York",
    minOpenBidCents: 500,
    minStepCents: 100,
    minBoostCents: 200,
    boostChipsCents: [200, 500, 1000, 2000],
    defaultBoostCents: 500,
    // One per app: Venmo, Cash App, Amazon, Throne (handoff v2).
    maxGiftLinks: 4,
    nameMaxLength: 40,
    bioMaxLength: 80,
    defaultTheme: "butter",
    emptyTheme: "cloud",
    claimTheme: "sky",
  },
} as const satisfies { slug: string; name: string; settings: BoardTypeSettings };
