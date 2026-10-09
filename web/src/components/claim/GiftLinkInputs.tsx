"use client";

import { Button, Hint, IconButton, Input } from "@/components/ui";
import { giftLinkHint, parseGiftLink } from "@/lib/gifts";
import styles from "./claim.module.css";

type Props = {
  links: string[];
  max: number;
  onChange: (links: string[]) => void;
};

/** "Where should gifts go?": up to 3 links, each with a live hint naming the button it becomes. */
export function GiftLinkInputs({ links, max, onChange }: Props) {
  function update(index: number, value: string) {
    onChange(links.map((link, i) => (i === index ? value : link)));
  }

  return (
    <>
      {links.map((link, i) => {
        const hint = giftLinkHint(parseGiftLink(link));
        return (
          <div key={i} className={styles.linkRow}>
            <div className={styles.linkControls}>
              <Input
                aria-label="Gift link"
                name="giftLink"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Paste a Venmo, Cash App, Amazon, or Throne link"
                value={link}
                onChange={(event) => update(i, event.target.value)}
                className={styles.linkInput}
              />
              {i > 0 && (
                <IconButton
                  icon="close"
                  label="Remove this link"
                  size="xl"
                  onClick={() => onChange(links.filter((_, k) => k !== i))}
                />
              )}
            </div>
            {hint && <Hint tone={hint.tone}>{hint.text}</Hint>}
          </div>
        );
      })}
      {links.length < max && (
        <Button variant="text" size="sm" className={styles.addLink} onClick={() => onChange([...links, ""])}>
          + Add another
        </Button>
      )}
    </>
  );
}
