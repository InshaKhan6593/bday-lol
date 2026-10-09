import Link from "next/link";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Button.module.css";

export type ButtonVariant =
  /** Black fill, white text. The default action. */
  | "ink"
  /** White fill with ink outline. Secondary actions. */
  | "paper"
  /** Theme accent fill. The main call to action on dark bars. */
  | "accent"
  /** Underlined text, no box. Tertiary links like "Back to today". */
  | "text";

export type ButtonSize = "sm" | "md" | "lg" | "xl" | "2xl";
export type ButtonShape = "control" | "large" | "pill";

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  block?: boolean;
  /** White text for "text" variant on dark bars. */
  inverse?: boolean;
  /**
   * Turns ink-filled on hover. Only the ▲ Boost controls do this; every other
   * button keeps its colors (mockup exception to design rule 7).
   */
  hoverInvert?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  className?: string;
  children: ReactNode;
};

type AsButton = StyleProps & ComponentProps<"button"> & { href?: undefined; external?: undefined };
type AsLink = StyleProps & Omit<ComponentProps<typeof Link>, "className" | "children"> & { external?: false };
/** A plain <a> for other sites and schemes (gift links, Facebook, sms:). */
type AsExternal = StyleProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & {
  href: string;
  external: true;
};

export type ButtonProps = AsButton | AsLink | AsExternal;

function classes({ variant = "ink", size = "md", shape = "control", block, inverse, hoverInvert, className }: StyleProps) {
  return cx(
    styles.button,
    styles[variant],
    styles[`size-${size}`],
    styles[`shape-${shape}`],
    variant !== "text" && "lift",
    block && styles.block,
    inverse && styles.inverse,
    hoverInvert && styles.hoverInvert,
    className,
  );
}

/**
 * One button for the whole site. Renders a Next <Link> when given href, a plain
 * <a> when also marked external, otherwise a <button>. Lift-on-hover comes from the shared "lift" rule.
 */
export function Button(props: ButtonProps) {
  const { variant, size, shape, block, inverse, hoverInvert, iconStart, iconEnd, className, children, external, ...rest } =
    props;
  const cls = classes({ variant, size, shape, block, inverse, hoverInvert, className, children });
  const content = (
    <>
      {iconStart}
      <span className={styles.label}>{children}</span>
      {iconEnd}
    </>
  );

  if (external) {
    return (
      <a {...(rest as Omit<AsExternal, keyof StyleProps | "external">)} className={cls}>
        {content}
      </a>
    );
  }
  if ("href" in rest && rest.href !== undefined) {
    return (
      <Link {...(rest as Omit<AsLink, keyof StyleProps | "external">)} className={cls}>
        {content}
      </Link>
    );
  }
  const buttonProps = rest as ComponentProps<"button">;
  return (
    <button type="button" {...buttonProps} className={cls}>
      {content}
    </button>
  );
}
