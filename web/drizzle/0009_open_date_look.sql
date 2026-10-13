-- An unclaimed date wears the open look (white page, Butter button) instead of Cloud.
-- Settings live on the board type's row, so the stored value changes too.
UPDATE "board_types"
SET "settings" = jsonb_set("settings", '{emptyTheme}', '"open"')
WHERE "settings"->>'emptyTheme' = 'cloud';
