import type { Metadata } from "next";
import { listNames } from "./about";
import { formatLong, isLeapDay, MONTHS, toSlug, type MonthDay } from "./birthday";
import { commonness, monthExtremes } from "./commonness";
import { birthFlower, birthstone, ordinal, zodiacSign } from "./facts";
import { formatUsd } from "./money";
import { absoluteUrl, routes } from "./routes";

/**
 * Titles, descriptions, social tags and structured data for the public pages
 * (06-seo.md). Lengths follow claude-seo's quality gates: titles 30–60
 * characters, descriptions 120–160, every one unique, and no description that
 * just restates its title.
 */

export const SITE_NAME = "mybday.lol";
export const DESCRIPTION_MIN = 120;
export const DESCRIPTION_MAX = 160;

/**
 * Joins sentences in order while they fit in 160 characters, skipping any that
 * would overflow, then adds extras until it reaches 120. Sentences are written
 * most important first, so the shortened version keeps what matters.
 */
export function fitDescription(sentences: string[], extras: string[] = []): string {
  let text = "";
  for (const s of [...sentences, ...extras]) {
    const isExtra = !sentences.includes(s);
    if (isExtra && text.length >= DESCRIPTION_MIN) break;
    const next = text ? `${text} ${s}` : s;
    if (next.length <= DESCRIPTION_MAX) text = next;
  }
  return text;
}

type Social = { title: string; description: string; path: string; type?: "website" | "article" };

/**
 * Canonical + Open Graph + Twitter for a page. The share image comes from the
 * route's opengraph-image file, which Next adds on its own.
 */
export function pageMetadata({ title, description, path, type = "website" }: Social, absoluteTitle = false): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: SITE_NAME, type, locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
  };
}

// ---------------------------------------------------------------------------
// Date pages
// ---------------------------------------------------------------------------

/** "October 7 Birthday: Famous People, Facts & Who's #1" (≤ 54 characters for every date). */
export function dateTitle(md: MonthDay): string {
  return `${formatLong(md)} Birthday: Famous People, Facts & Who's #1`;
}

type DateFacts = {
  md: MonthDay;
  year: number;
  famous: string[];
  leader: { name: string; totalCents: number } | null;
  openBidCents: number;
};

export function dateDescription({ md, year, famous, leader, openBidCents }: DateFacts): string {
  const label = formatLong(md);
  const c = commonness(md);
  const sentences = [
    famous.length ? `Born on ${label}: ${listNames(famous.slice(0, 3))}.` : null,
    isLeapDay(md)
      ? "The rarest birthday of all, here once every four years."
      : `It's the ${ordinal(c.rank)} most common birthday in the US.`,
    leader
      ? `${leader.name} leads the ${year} board with ${formatUsd(leader.totalCents)}.`
      : `Nobody has claimed it for ${year} yet. Bids start at ${formatUsd(openBidCents)}.`,
  ].filter((s): s is string => s !== null);
  // Three names if everything fits, else two, else one (long names, long leader names).
  for (const n of [3, 2, 1]) {
    if (!famous.length) break;
    const born = `Born on ${label}: ${listNames(famous.slice(0, n))}.`;
    sentences[0] = born;
    if (sentences.join(" ").length <= DESCRIPTION_MAX) break;
  }
  return fitDescription(sentences, [
    `Star sign ${zodiacSign(md)}, birthstone ${birthstone(md.month).toLowerCase()}.`,
    "See the live birthday board.",
    `Bid to own ${label}.`,
  ]);
}

// ---------------------------------------------------------------------------
// Month pages
// ---------------------------------------------------------------------------

/** "October Birthdays: Famous People, Facts & Top Bids" */
export function monthTitle(month: number): string {
  return `${MONTHS[month - 1]} Birthdays: Famous People, Facts & Top Bids`;
}

export function monthDescription(month: number, claimed: number, days: number): string {
  const name = MONTHS[month - 1]!;
  const { most, least } = monthExtremes(month);
  return fitDescription(
    [
      `${name}'s most common birthday is ${formatLong(most)} and its rarest is ${formatLong(least)}.`,
      `Birthstone ${birthstone(month).toLowerCase()}, flower ${birthFlower(month).toLowerCase()}.`,
      claimed ? `${claimed} of ${days} dates have a #1 so far.` : `All ${days} dates are still open to claim.`,
    ],
    [`Famous birthdays and facts for all ${days} days.`, "See who owns each date."],
  );
}

// ---------------------------------------------------------------------------
// Structured data (JSON-LD, one @graph per page)
// ---------------------------------------------------------------------------

const id = (path: string, fragment: string) => `${absoluteUrl(path)}#${fragment}`;
const ORGANIZATION_ID = () => id(routes.home, "organization");
const WEBSITE_ID = () => id(routes.home, "website");

function breadcrumbs(items: Array<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList",
    "@id": id(items[items.length - 1]!.path, "breadcrumb"),
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Homepage: who runs the site and what the site is. */
export function homeJsonLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID(),
        name: SITE_NAME,
        url: absoluteUrl(routes.home),
        logo: absoluteUrl("/icon"),
        email: process.env.EMAIL_REPLY_TO ?? "mybdaylol@gmail.com",
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID(),
        name: SITE_NAME,
        url: absoluteUrl(routes.home),
        description,
        inLanguage: "en-US",
        publisher: { "@id": ORGANIZATION_ID() },
      },
    ],
  };
}

type FamousForSchema = { name: string; knownFor: string; birthDate: string; source: string; sourceId: string };

/** Date page: breadcrumb, the page, and its famous people linked to their Wikidata entries. */
export function dateJsonLd(md: MonthDay, title: string, description: string, famous: FamousForSchema[]) {
  const path = routes.date(md);
  const month = MONTHS[md.month - 1]!;
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbs([
        { name: "Home", path: routes.home },
        { name: `${month} birthdays`, path: routes.month(md.month) },
        { name: `${formatLong(md)} birthdays`, path },
      ]),
      {
        "@type": "WebPage",
        "@id": absoluteUrl(path),
        url: absoluteUrl(path),
        name: title,
        description,
        inLanguage: "en-US",
        isPartOf: { "@id": WEBSITE_ID() },
        breadcrumb: { "@id": id(path, "breadcrumb") },
        ...(famous.length > 0 && {
          mainEntity: {
            "@type": "ItemList",
            name: `Famous people born on ${formatLong(md)}`,
            itemListElement: famous.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Person",
                name: p.name,
                description: p.knownFor,
                birthDate: p.birthDate,
                ...(p.source === "wikidata" && { sameAs: `https://www.wikidata.org/wiki/${p.sourceId}` }),
              },
            })),
          },
        }),
      },
    ],
  };
}

/** Month page: breadcrumb and the collection of its date pages. */
export function monthJsonLd(month: number, title: string, description: string, days: MonthDay[]) {
  const path = routes.month(month);
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbs([
        { name: "Home", path: routes.home },
        { name: `${MONTHS[month - 1]} birthdays`, path },
      ]),
      {
        "@type": "CollectionPage",
        "@id": absoluteUrl(path),
        url: absoluteUrl(path),
        name: title,
        description,
        inLanguage: "en-US",
        isPartOf: { "@id": WEBSITE_ID() },
        breadcrumb: { "@id": id(path, "breadcrumb") },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: days.length,
          itemListElement: days.map((md, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: absoluteUrl(`/${toSlug(md)}`),
            name: `${formatLong(md)} birthdays`,
          })),
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Other pages
// ---------------------------------------------------------------------------

/** Homepage title (the layout template adds " | mybday.lol"). */
export const HOME_TITLE = "Birthday Leaderboard: Bid to Own Today's Spot";

export function homeDescription(today: MonthDay, leader: { name: string; totalCents: number } | null): string {
  const label = formatLong(today);
  return fitDescription(
    [
      leader
        ? `Today is ${label} and ${leader.name} owns it with ${formatUsd(leader.totalCents)}.`
        : `Today is ${label} and nobody owns it yet.`,
      "Every date has its own board: bid for the top spot, boost friends and send gifts straight to them.",
    ],
    // Shorter fallbacks for when a long leader name squeezes out the second sentence (names go up to 40 characters).
    ["Every date has its own birthday board.", "Bid for the top spot and send gifts straight to them.", "Outbid anyone, any time."],
  );
}

export const HOW_TITLE = "How It Works: Bids, Boosts and Birthday Gifts";
export const HOW_DESCRIPTION =
  "Bid on any date, boost friends up the board and send gifts that go straight to them. How the birthday leaderboard works, with answers to common questions.";

export const TERMS_TITLE = "Terms of Service: Bids, Boosts and Listings";
export const TERMS_DESCRIPTION =
  "The rules for bidding, boosting and listing birthdays: bids and boosts are final, boards reset every year, and gift money goes straight to the birthday person.";

export const PRIVACY_TITLE = "Privacy Policy: What We Collect and Why";
export const PRIVACY_DESCRIPTION =
  "What we collect when you claim a birthday, boost someone or ask for reminders, why we need it, who processes it, and how to get your listing or data removed.";

/**
 * When the page templates' own text last changed (the About paragraph, month
 * intros, FAQ). The sitemap uses it as lastmod for pages with no newer data.
 * Bump it when that copy changes.
 */
export const CONTENT_UPDATED = new Date("2026-10-10T00:00:00Z");
