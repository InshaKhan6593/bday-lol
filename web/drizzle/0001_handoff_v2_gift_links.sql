ALTER TABLE "entries" DROP CONSTRAINT "entries_gift_links_max_chk";--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_gift_links_max_chk" CHECK (jsonb_array_length("entries"."gift_links") <= 4);--> statement-breakpoint
-- Handoff v2: one gift link per app (up to 4), and the Claim page starts on Sky.
UPDATE "board_types" SET "settings" = "settings" || '{"maxGiftLinks": 4, "claimTheme": "sky"}'::jsonb WHERE "slug" = 'birthday';
