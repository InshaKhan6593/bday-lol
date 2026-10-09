import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";
import styles from "./IconButton.module.css";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName;
  /** Required: icon-only buttons need a spoken label. */
  label: string;
  size?: "sm" | "md" | "lg";
  /** "muted" = borderless grey square (search clear button). */
  tone?: "paper" | "muted";
};

/** Square outlined button holding a single icon (arrows, close, menu, share). */
export function IconButton({ icon, label, size = "lg", tone = "paper", className, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(styles.iconButton, styles[size], styles[tone], tone === "paper" && "lift", className)}
      {...rest}
    >
      <Icon name={icon} size={size === "lg" ? 20 : 16} />
    </button>
  );
}
