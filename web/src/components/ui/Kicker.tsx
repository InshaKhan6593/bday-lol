import type { ElementType, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Kicker.module.css";

type Props = {
  children: ReactNode;
  /** sm = labels on cards and bars, md = section labels, lg = homepage hero line. */
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "accent" | "muted";
  as?: ElementType;
  className?: string;
};

/** Small uppercase, widely tracked label that sits above a heading or value. */
export function Kicker({ children, size = "sm", tone = "ink", as: Tag = "div", className }: Props) {
  return <Tag className={cx(styles.kicker, styles[size], styles[tone], className)}>{children}</Tag>;
}
