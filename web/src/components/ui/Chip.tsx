import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import styles from "./Chip.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Selected chip: ink fill, white text. */
  pressed?: boolean;
  /** "accent" = theme accent fill, e.g. the Boost box's "Take #1" chip. */
  tone?: "paper" | "accent";
  block?: boolean;
};

/** Outlined choice chip (Boost amounts). Toggles ink when pressed. */
export function Chip({ pressed, tone = "paper", block, className, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx(styles.chip, styles[tone], pressed && styles.pressed, block && styles.block, "lift", className)}
      {...rest}
    />
  );
}
