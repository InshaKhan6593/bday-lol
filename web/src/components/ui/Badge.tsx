import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Badge.module.css";

type Props = {
  children: ReactNode;
  /** accent = filled theme pill ("On the homepage", "Top bid"); empty = dashed outline for a status like "Unclaimed" (design rule 8). */
  tone?: "accent" | "empty";
  className?: string;
};

/** Small uppercase pill. */
export function Badge({ children, tone = "accent", className }: Props) {
  return <span className={cx(styles.badge, tone === "empty" && styles.empty, className)}>{children}</span>;
}
