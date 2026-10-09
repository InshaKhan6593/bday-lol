import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
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
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  className?: string;
  children: ReactNode;
};

type AsButton = StyleProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = StyleProps & Omit<ComponentProps<typeof Link>, "className" | "children">;

export type ButtonProps = AsButton | AsLink;

function classes({ variant = "ink", size = "md", shape = "control", block, inverse, className }: StyleProps) {
  return cx(
    styles.button,
    styles[variant],
    styles[`size-${size}`],
    styles[`shape-${shape}`],
    variant !== "text" && "lift",
    block && styles.block,
    inverse && styles.inverse,
    className,
  );
}

/**
 * One button for the whole site. Renders a Next <Link> when given href,
 * otherwise a <button>. Lift-on-hover comes from the shared "lift" rule.
 */
export function Button(props: ButtonProps) {
  const { variant, size, shape, block, inverse, iconStart, iconEnd, className, children, ...rest } = props;
  const cls = classes({ variant, size, shape, block, inverse, className, children });
  const content = (
    <>
      {iconStart}
      <span className={styles.label}>{children}</span>
      {iconEnd}
    </>
  );

  if ("href" in rest && rest.href !== undefined) {
    return (
      <Link {...(rest as Omit<AsLink, keyof StyleProps>)} className={cls}>
        {content}
      </Link>
    );
  }
  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type="button" {...buttonProps} className={cls}>
      {content}
    </button>
  );
}
