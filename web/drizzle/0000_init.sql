CREATE TYPE "public"."email_category" AS ENUM('reminders', 'your_day', 'boost_digest');--> statement-breakpoint
CREATE TYPE "public"."entry_status" AS ENUM('pending', 'live', 'removed');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('claim', 'boost', 'comp');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."reminder_source" AS ENUM('signup', 'claim');--> statement-breakpoint
CREATE TABLE "alert_subscriptions" (
	"entry_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_subscriptions_entry_id_email_pk" PRIMARY KEY("entry_id","email")
);
--> statement-breakpoint
CREATE TABLE "board_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"settings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "board_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_type_id" integer NOT NULL,
	"key" text NOT NULL,
	"period" text NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boards_window_chk" CHECK ("boards"."closes_at" > "boards"."opens_at")
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"to" text NOT NULL,
	"dedupe_key" text,
	"provider_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_log_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "email_suppressions" (
	"email" text NOT NULL,
	"category" "email_category" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_suppressions_email_category_pk" PRIMARY KEY("email","category")
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(16) NOT NULL,
	"board_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"bio" varchar(80) DEFAULT '' NOT NULL,
	"photo_url" text,
	"theme" text NOT NULL,
	"gift_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"owner_email" text,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"total_reached_at" timestamp with time zone,
	"status" "entry_status" DEFAULT 'pending' NOT NULL,
	"is_comped" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"live_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "entries_total_whole_dollars_chk" CHECK ("entries"."total_cents" >= 0 AND "entries"."total_cents" % 100 = 0),
	CONSTRAINT "entries_name_len_chk" CHECK (char_length("entries"."name") BETWEEN 1 AND 40),
	CONSTRAINT "entries_gift_links_max_chk" CHECK (jsonb_array_length("entries"."gift_links") <= 3),
	CONSTRAINT "entries_live_has_total_chk" CHECK ("entries"."status" <> 'live' OR "entries"."total_reached_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "famous_hidden" (
	"source" text DEFAULT 'wikidata' NOT NULL,
	"source_id" text NOT NULL,
	"name" text NOT NULL,
	"hidden_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "famous_hidden_source_source_id_pk" PRIMARY KEY("source","source_id")
);
--> statement-breakpoint
CREATE TABLE "famous_people" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"source_id" text NOT NULL,
	"source" text DEFAULT 'wikidata' NOT NULL,
	"name" text NOT NULL,
	"known_for" text NOT NULL,
	"birth_date" date NOT NULL,
	"pageviews" integer DEFAULT 0 NOT NULL,
	"rank" smallint NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leader_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outbid_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"email" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"kind" "payment_kind" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"email" text,
	"alert_opt_in" boolean DEFAULT false NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"presentment_currency" varchar(3),
	"presentment_amount" integer,
	"digest_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "payments_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "payments_amount_chk" CHECK ("payments"."amount_cents" > 0 AND "payments"."amount_cents" % 100 = 0),
	CONSTRAINT "payments_stripe_chk" CHECK ("payments"."kind" = 'comp' OR "payments"."stripe_session_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"month" smallint NOT NULL,
	"day" smallint NOT NULL,
	"source" "reminder_source" NOT NULL,
	"last_sent_year" integer,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_month_chk" CHECK ("reminders"."month" BETWEEN 1 AND 12),
	CONSTRAINT "reminders_day_chk" CHECK ("reminders"."day" BETWEEN 1 AND 31)
);
--> statement-breakpoint
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_board_type_id_board_types_id_fk" FOREIGN KEY ("board_type_id") REFERENCES "public"."board_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leader_log" ADD CONSTRAINT "leader_log_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leader_log" ADD CONSTRAINT "leader_log_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbid_alerts" ADD CONSTRAINT "outbid_alerts_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_type_key_period_uq" ON "boards" USING btree ("board_type_id","key","period");--> statement-breakpoint
CREATE INDEX "boards_type_closes_idx" ON "boards" USING btree ("board_type_id","closes_at");--> statement-breakpoint
CREATE INDEX "email_log_to_type_idx" ON "email_log" USING btree ("to","type","sent_at");--> statement-breakpoint
CREATE INDEX "entries_ranking_idx" ON "entries" USING btree ("board_id","total_cents" DESC NULLS LAST,"total_reached_at") WHERE "entries"."status" = 'live';--> statement-breakpoint
CREATE INDEX "entries_owner_email_idx" ON "entries" USING btree ("owner_email");--> statement-breakpoint
CREATE UNIQUE INDEX "famous_people_key_source_uq" ON "famous_people" USING btree ("key","source","source_id");--> statement-breakpoint
CREATE INDEX "famous_people_key_rank_idx" ON "famous_people" USING btree ("key","rank");--> statement-breakpoint
CREATE INDEX "leader_log_board_idx" ON "leader_log" USING btree ("board_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leader_log_one_open_uq" ON "leader_log" USING btree ("board_id") WHERE "leader_log"."ended_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "outbid_alerts_pending_uq" ON "outbid_alerts" USING btree ("entry_id","email") WHERE "outbid_alerts"."sent_at" IS NULL;--> statement-breakpoint
CREATE INDEX "outbid_alerts_due_idx" ON "outbid_alerts" USING btree ("due_at") WHERE "outbid_alerts"."sent_at" IS NULL;--> statement-breakpoint
CREATE INDEX "payments_entry_idx" ON "payments" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "payments_paid_at_idx" ON "payments" USING btree ("paid_at") WHERE "payments"."status" = 'paid';--> statement-breakpoint
CREATE INDEX "payments_digest_pending_idx" ON "payments" USING btree ("entry_id") WHERE "payments"."kind" = 'boost' AND "payments"."status" = 'paid' AND "payments"."digest_sent_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_email_date_uq" ON "reminders" USING btree ("email","month","day");--> statement-breakpoint
CREATE INDEX "reminders_date_idx" ON "reminders" USING btree ("month","day");