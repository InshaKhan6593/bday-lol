import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Badge.module.css";

/** Small uppercase accent pill, e.g. "On the homepage" / "Top bid". */
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx(styles.badge, className)}>{children}</span>;
}
