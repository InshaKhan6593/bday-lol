import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName, type IconSize } from "./Icon";
import styles from "./IconButton.module.css";

type StyleProps = {
  icon: IconName;
  /** Required: icon-only buttons need a spoken label. */
  label: string;
  size?: "sm" | "md" | "lg";
  /** "muted" = borderless grey square (search clear button). */
  tone?: "paper" | "muted";
  /** Glyph size. Defaults to 20 for lg buttons and 16 otherwise. */
  iconSize?: IconSize;
  className?: string;
};

type AsButton = StyleProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: undefined };
/** A Next <Link> styled the same, e.g. the date page's ◀ ▶ day arrows. */
type AsLink = StyleProps & Omit<ComponentProps<typeof Link>, "className" | "children">;

/** Square outlined button holding a single icon (arrows, close, menu, share). */
export function IconButton(props: AsButton | AsLink) {
  const { icon, label, size = "lg", tone = "paper", iconSize, className, ...rest } = props;
  const cls = cx(styles.iconButton, styles[size], styles[tone], tone === "paper" && "lift", className);
  const glyph = <Icon name={icon} size={iconSize ?? (size === "lg" ? 20 : 16)} />;

  if ("href" in rest && rest.href !== undefined) {
    return (
      <Link aria-label={label} {...(rest as Omit<AsLink, keyof StyleProps>)} className={cls}>
        {glyph}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} className={cls} {...(rest as Omit<AsButton, keyof StyleProps>)}>
      {glyph}
    </button>
  );
}
