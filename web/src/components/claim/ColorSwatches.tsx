"use client";

import type { CSSProperties } from "react";
import { THEME_KEYS, THEMES, type ThemeKey } from "@/config/themes";
import { cx } from "@/lib/cx";
import styles from "./claim.module.css";

type Props = {
  value: ThemeKey;
  onChange: (theme: ThemeKey) => void;
};

/** The 12 theme swatches. Picking one recolors the whole page (0.3s fade). */
export function ColorSwatches({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Your color" className={styles.swatches}>
      {THEME_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={THEMES[key].name}
          aria-pressed={key === value}
          onClick={() => onChange(key)}
          className={cx(styles.swatch, "lift")}
          style={{ "--swatch": THEMES[key].ground } as CSSProperties}
        />
      ))}
    </div>
  );
}
