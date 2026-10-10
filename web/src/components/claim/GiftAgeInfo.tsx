"use client";

import { useState } from "react";
import styles from "./claim.module.css";

/**
 * The ⓘ next to "Where should gifts go?" (handoff v2 §6): the under-18 rule.
 * Opens on hover with a mouse and on tap; a second tap closes it.
 */
export function GiftAgeInfo() {
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.infoWrap}>
      <button
        type="button"
        className={styles.infoButton}
        aria-label="Gifts are for adults only"
        aria-expanded={open}
        aria-describedby="gift-age-tip"
        onClick={() => setOpen(!open)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      <span id="gift-age-tip" role="tooltip" data-open={open} className={styles.infoTip}>
        Gifts aren’t allowed for anyone under 18. If you’re adding your child, leave this blank.
      </span>
    </span>
  );
}
