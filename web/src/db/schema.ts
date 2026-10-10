import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { BoardSettings, BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";

/**
 * Data model (client build note): a general "board" with "entries" and "boosts",
 * not hardcoded to birthdays.
 *
 *   board_types ─< boards ─< entries ─< payments (claim / boost / comp)
 *                         │          ├─< alert_subscriptions
 *                         │          └─< outbid_alerts
 *                         └─< leader_log
 *
 * Money is stored in integer cents (USD). Only whole dollars are accepted.
 * Emails are stored lowercased.
 */

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const tstz = (name: string) => timestamp(name, { withTimezone: true });

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** pending = waiting for payment, live = on the board, removed = taken down by admin. */
export const entryStatus = pgEnum("entry_status", ["pending", "live", "removed"]);

/** claim = paid claim, boost = paid boost, comp = free admin entry (no Stripe). */
export const paymentKind = pgEnum("payment_kind", ["claim", "boost", "comp"]);

export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "expired", "refunded"]);

export const reminderSource = pgEnum("reminder_source", ["signup", "claim"]);

export const emailCategory = pgEnum("email_category", ["reminders", "your_day", "boost_digest"]);

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------

/** A kind of leaderboard. "birthday" today, maybe "fundraiser" later. */
export const boardTypes = pgTable("board_types", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  settings: jsonb("settings").$type<BoardTypeSettings>().notNull(),
  createdAt: createdAt(),
});

/**
 * One leaderboard instance: a key within a type, for one period.
 * Birthday example: type=birthday, key="10-07", period="2027".
 * Old boards are never deleted (a "Past winners" section may come later).
 * Rows are created the first time someone claims the date for that period.
 */
export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    boardTypeId: integer("board_type_id").notNull().references(() => boardTypes.id),
    key: text("key").notNull(),
    period: text("period").notNull(),
    opensAt: tstz("opens_at").notNull(),
    closesAt: tstz("closes_at").notNull(),
    /** Per-board overrides of the type settings. Empty for birthdays. */
    settings: jsonb("settings").$type<BoardSettings>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("boards_type_key_period_uq").on(t.boardTypeId, t.key, t.period),
    index("boards_type_closes_idx").on(t.boardTypeId, t.closesAt),
    check("boards_window_chk", sql`${t.closesAt} > ${t.opensAt}`),
  ],
);

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export type GiftService = "venmo" | "cashapp" | "amazon" | "throne";
export type GiftLink = { service: GiftService; url: string };

/**
 * One person on one board. Rank = total, highest first. Ties go to whoever
 * reached that total first (total_reached_at).
 */
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short public id used in URLs (boost links in emails). */
    publicId: varchar("public_id", { length: 16 }).notNull().unique(),
    /** Personal link name, unique on its board: mybday.lol/october-7/sam-rivera. Set when the entry goes live. */
    slug: varchar("slug", { length: 60 }),
    boardId: uuid("board_id").notNull().references(() => boards.id),
    name: varchar("name", { length: 40 }).notNull(),
    bio: varchar("bio", { length: 80 }).notNull().default(""),
    photoUrl: text("photo_url"),
    theme: text("theme").$type<ThemeKey>().notNull(),
    giftLinks: jsonb("gift_links").$type<GiftLink[]>().notNull().default([]),
    /** A child added by a parent (07 D4): first name only, never gift links. */
    isMinor: boolean("is_minor").notNull().default(false),
    /** Never shown publicly. Used for receipts and outbid alerts. */
    ownerEmail: text("owner_email"),
    totalCents: integer("total_cents").notNull().default(0),
    totalReachedAt: tstz("total_reached_at"),
    status: entryStatus("status").notNull().default("pending"),
    /** Free admin entry for influencers. Looks identical, excluded from revenue. */
    isComped: boolean("is_comped").notNull().default(false),
    createdAt: createdAt(),
    liveAt: tstz("live_at"),
    updatedAt: tstz("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    // Leaderboard order for live entries on a board.
    index("entries_ranking_idx")
      .on(t.boardId, t.totalCents.desc(), t.totalReachedAt.asc())
      .where(sql`${t.status} = 'live'`),
    index("entries_owner_email_idx").on(t.ownerEmail),
    uniqueIndex("entries_board_slug_uq").on(t.boardId, t.slug).where(sql`${t.slug} IS NOT NULL`),
    check("entries_total_whole_dollars_chk", sql`${t.totalCents} >= 0 AND ${t.totalCents} % 100 = 0`),
    check("entries_name_len_chk", sql`char_length(${t.name}) BETWEEN 1 AND 40`),
    check("entries_gift_links_max_chk", sql`jsonb_array_length(${t.giftLinks}) <= 4`),
    check("entries_minor_no_gifts_chk", sql`NOT ${t.isMinor} OR jsonb_array_length(${t.giftLinks}) = 0`),
    check("entries_live_has_total_chk", sql`${t.status} <> 'live' OR ${t.totalReachedAt} IS NOT NULL`),
  ],
);

// ---------------------------------------------------------------------------
// Payments (every claim, boost and comp is its own row)
// ---------------------------------------------------------------------------

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id").notNull().references(() => entries.id),
    kind: paymentKind("kind").notNull(),
    status: paymentStatus("status").notNull().default("pending"),
    /** USD cents credited to the entry's total. */
    amountCents: integer("amount_cents").notNull(),
    /** Payer email (form email for claims, Stripe email for boosts). Null for comps. */
    email: text("email"),
    /** Boost box: "Email me if [name] gets passed". */
    alertOptIn: boolean("alert_opt_in").notNull().default(false),
    stripeSessionId: text("stripe_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    /** What the payer actually saw with Adaptive Pricing, e.g. GBP 400. */
    presentmentCurrency: varchar("presentment_currency", { length: 3 }),
    presentmentAmount: integer("presentment_amount"),
    /** Set when this boost was included in a "You got boosted" digest. */
    digestSentAt: tstz("digest_sent_at"),
    createdAt: createdAt(),
    paidAt: tstz("paid_at"),
  },
  (t) => [
    index("payments_entry_idx").on(t.entryId),
    index("payments_paid_at_idx").on(t.paidAt).where(sql`${t.status} = 'paid'`),
    index("payments_digest_pending_idx")
      .on(t.entryId)
      .where(sql`${t.kind} = 'boost' AND ${t.status} = 'paid' AND ${t.digestSentAt} IS NULL`),
    check("payments_amount_chk", sql`${t.amountCents} > 0 AND ${t.amountCents} % 100 = 0`),
    check("payments_stripe_chk", sql`${t.kind} = 'comp' OR ${t.stripeSessionId} IS NOT NULL`),
  ],
);

// ---------------------------------------------------------------------------
// #1 history (powers "Held the homepage 9:12 AM – 2:40 PM" and outbid alerts)
// ---------------------------------------------------------------------------

export const leaderLog = pgTable(
  "leader_log",
  {
    id: serial("id").primaryKey(),
    boardId: uuid("board_id").notNull().references(() => boards.id),
    entryId: uuid("entry_id").notNull().references(() => entries.id),
    startedAt: tstz("started_at").notNull(),
    endedAt: tstz("ended_at"),
  },
  (t) => [
    index("leader_log_board_idx").on(t.boardId, t.startedAt),
    // At most one current #1 per board.
    uniqueIndex("leader_log_one_open_uq").on(t.boardId).where(sql`${t.endedAt} IS NULL`),
  ],
);

// ---------------------------------------------------------------------------
// Alerts and emails
// ---------------------------------------------------------------------------

/** People who ticked "Email me if [name] gets passed". Per entry, so per board year. */
export const alertSubscriptions = pgTable(
  "alert_subscriptions",
  {
    entryId: uuid("entry_id").notNull().references(() => entries.id),
    email: text("email").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.email] })],
);

/**
 * Outbid alerts waiting to be sent. The cron sends rows whose due_at has passed
 * and works out the latest amount needed at send time. One pending row per
 * (entry, recipient); due_at is pushed back to respect "max 1 per 15 min".
 */
export const outbidAlerts = pgTable(
  "outbid_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id").notNull().references(() => entries.id),
    email: text("email").notNull(),
    dueAt: tstz("due_at").notNull(),
    sentAt: tstz("sent_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("outbid_alerts_pending_uq").on(t.entryId, t.email).where(sql`${t.sentAt} IS NULL`),
    index("outbid_alerts_due_idx").on(t.dueAt).where(sql`${t.sentAt} IS NULL`),
  ],
);

/** Yearly birthday reminders: homepage signups and auto-added claimers. */
export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    month: smallint("month").notNull(),
    day: smallint("day").notNull(),
    source: reminderSource("source").notNull(),
    lastSentYear: integer("last_sent_year"),
    unsubscribedAt: tstz("unsubscribed_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("reminders_email_date_uq").on(t.email, t.month, t.day),
    index("reminders_date_idx").on(t.month, t.day),
    check("reminders_month_chk", sql`${t.month} BETWEEN 1 AND 12`),
    check("reminders_day_chk", sql`${t.day} BETWEEN 1 AND 31`),
  ],
);

/** "Unsubscribe" clicks for non-transactional email categories. */
export const emailSuppressions = pgTable(
  "email_suppressions",
  {
    email: text("email").notNull(),
    category: emailCategory("category").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.email, t.category] })],
);

/** Every email sent. dedupe_key stops the same email going out twice. */
export const emailLog = pgTable(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    to: text("to").notNull(),
    dedupeKey: text("dedupe_key").unique(),
    providerId: text("provider_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    sentAt: tstz("sent_at").notNull().defaultNow(),
  },
  (t) => [index("email_log_to_type_idx").on(t.to, t.type, t.sentAt)],
);

// ---------------------------------------------------------------------------
// Editable pages (handoff v2 §11): Terms and Privacy, edited in the admin
// ---------------------------------------------------------------------------

/** Markdown for pages the client edits without a deploy. A missing row means "use the built-in text". */
export const sitePages = pgTable("site_pages", {
  /** "terms", "privacy" (and the FAQ later). */
  slug: text("slug").primaryKey(),
  body: text("body").notNull(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// "About [date] birthdays": famous people (refreshed monthly)
// ---------------------------------------------------------------------------

export const famousPeople = pgTable(
  "famous_people",
  {
    id: serial("id").primaryKey(),
    /** Month-day key, "10-07". */
    key: text("key").notNull(),
    /** Id in the source, e.g. Wikidata "Q12345". */
    sourceId: text("source_id").notNull(),
    source: text("source").notNull().default("wikidata"),
    name: text("name").notNull(),
    knownFor: text("known_for").notNull(),
    birthDate: date("birth_date").notNull(),
    pageviews: integer("pageviews").notNull().default(0),
    rank: smallint("rank").notNull(),
    refreshedAt: tstz("refreshed_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("famous_people_key_source_uq").on(t.key, t.source, t.sourceId),
    index("famous_people_key_rank_idx").on(t.key, t.rank),
  ],
);

/** People the admin hid. Survives monthly refreshes. */
export const famousHidden = pgTable(
  "famous_hidden",
  {
    source: text("source").notNull().default("wikidata"),
    sourceId: text("source_id").notNull(),
    name: text("name").notNull(),
    hiddenAt: tstz("hidden_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.source, t.sourceId] })],
);

// ---------------------------------------------------------------------------
// Relations (for the Drizzle query API)
// ---------------------------------------------------------------------------

export const boardTypesRelations = relations(boardTypes, ({ many }) => ({
  boards: many(boards),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  type: one(boardTypes, { fields: [boards.boardTypeId], references: [boardTypes.id] }),
  entries: many(entries),
  leaderLog: many(leaderLog),
}));

export const entriesRelations = relations(entries, ({ one, many }) => ({
  board: one(boards, { fields: [entries.boardId], references: [boards.id] }),
  payments: many(payments),
  alertSubscriptions: many(alertSubscriptions),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  entry: one(entries, { fields: [payments.entryId], references: [entries.id] }),
}));

export const leaderLogRelations = relations(leaderLog, ({ one }) => ({
  board: one(boards, { fields: [leaderLog.boardId], references: [boards.id] }),
  entry: one(entries, { fields: [leaderLog.entryId], references: [entries.id] }),
}));

export const alertSubscriptionsRelations = relations(alertSubscriptions, ({ one }) => ({
  entry: one(entries, { fields: [alertSubscriptions.entryId], references: [entries.id] }),
}));
