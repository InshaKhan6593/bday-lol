import type { CSSProperties, ReactNode } from "react";
import { getTheme, type ThemeKey } from "@/config/themes";
import { cx } from "@/lib/cx";
import styles from "./ThemeScope.module.css";

type Props = {
  theme: ThemeKey;
  /** Paint the ground color as this element's background (page shells). */
  paint?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Sets --ground and --accent for everything inside. Changing the theme fades
 * colors over 0.3s (design rule 4: color only comes from the theme).
 */
export function ThemeScope({ theme, paint = false, className, children }: Props) {
  const t = getTheme(theme);
  const style = { "--ground": t.ground, "--accent": t.accent } as CSSProperties;
  return (
    <div style={style} className={cx(paint && styles.paint, className)}>
      {/* Page shells also color the document, so overscroll on phones matches. */}
      {paint && <style>{`html,body{background-color:${t.ground}}`}</style>}
      {children}
    </div>
  );
}
