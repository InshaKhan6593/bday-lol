"use client";

import { useMediaQuery } from "@/components/date/useMediaQuery";
import { Button, Hint, IconButton, Input, Select } from "@/components/ui";
import {
  GIFT_ENTRY,
  GIFT_SERVICE_ORDER,
  GIFT_SERVICES,
  giftEntryHint,
  looksLikeLink,
  nextUnusedService,
  switchGiftApp,
  typeInGiftRow,
  type GiftEntry,
} from "@/lib/gifts";
import type { GiftService } from "@/db/schema";
import { cx } from "@/lib/cx";
import styles from "./claim.module.css";

type Props = {
  rows: GiftEntry[];
  onChange: (rows: GiftEntry[]) => void;
};

/**
 * "Where should gifts go?" (handoff v2): each row is an app dropdown plus one
 * box. Venmo and Throne show a fixed @, Cash App a fixed $, Amazon takes the
 * wishlist link. One row per app, so up to four; apps used in another row are
 * greyed out. Pasting a full link switches the row to that link's app.
 */
export function GiftLinkInputs({ rows, onChange }: Props) {
  const usedElsewhere = (index: number): GiftService[] => rows.filter((_, i) => i !== index).map((r) => r.service);
  const update = (index: number, row: GiftEntry) => onChange(rows.map((r, i) => (i === index ? row : r)));
  const next = nextUnusedService(rows);
  // Phones get short placeholders so they fit next to the dropdown.
  const mobile = useMediaQuery("(max-width: 640px)");

  return (
    <>
      {rows.map((row, i) => {
        const entry = GIFT_ENTRY[row.service];
        const hint = giftEntryHint(row);
        const prefix = entry.prefix && !looksLikeLink(row.value) ? entry.prefix : null;
        const taken = usedElsewhere(i);
        return (
          <div key={i} className={styles.linkRow}>
            <div className={styles.linkControls}>
              <Select
                aria-label="Gift app"
                className={styles.appSelect}
                value={row.service}
                onValueChange={(service) => update(i, switchGiftApp(row, service as GiftService))}
                options={GIFT_SERVICE_ORDER.map((s) => ({
                  value: s,
                  label: GIFT_SERVICES[s].short,
                  disabled: taken.includes(s),
                }))}
              />
              <span className={styles.handleBox}>
                {prefix && (
                  <span aria-hidden="true" className={styles.handlePrefix}>
                    {prefix}
                  </span>
                )}
                <Input
                  aria-label={entry.inputLabel}
                  aria-invalid={hint?.tone === "error" ? true : undefined}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={row.value}
                  onChange={(event) => update(i, typeInGiftRow(row, event.target.value, taken))}
                  className={cx(styles.handleInput, prefix && styles.handleInputPrefixed)}
                  placeholder={mobile ? entry.placeholderShort : entry.placeholder}
                />
              </span>
              {i > 0 && (
                <IconButton
                  icon="close"
                  label="Remove this link"
                  size="xl"
                  onClick={() => onChange(rows.filter((_, k) => k !== i))}
                />
              )}
            </div>
            {hint && <Hint tone={hint.tone}>{hint.text}</Hint>}
          </div>
        );
      })}
      {next && (
        <Button
          variant="text"
          size="sm"
          className={styles.addLink}
          onClick={() => onChange([...rows, { service: next, value: "" }])}
        >
          + Add another
        </Button>
      )}
    </>
  );
}
