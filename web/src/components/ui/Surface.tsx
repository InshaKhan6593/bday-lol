import Link from "next/link";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Surface.module.css";

export type SurfaceTone = "paper" | "ground" | "ink" | "none";
export type SurfaceRadius = "hero" | "section" | "card" | "tile";
export type SurfaceElevation = "none" | "lift" | "menu" | "section" | "hero";
export type SurfaceOutline = "solid" | "dashed" | "none";
export type SurfacePadding = "none" | "sm" | "md" | "lg" | "hero";

type StyleProps = {
  tone?: SurfaceTone;
  radius?: SurfaceRadius;
  elevation?: SurfaceElevation;
  outline?: SurfaceOutline;
  padding?: SurfacePadding;
  className?: string;
  children?: ReactNode;
};

type AsBlock = StyleProps &
  HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" | "aside"; href?: undefined };
type AsLink = StyleProps & Omit<ComponentProps<typeof Link>, "className" | "children">;

/**
 * Any contained box: cards, panels, dark bars, dialogs, popovers.
 * Paper/ground/ink fill + ink outline + optional hard shadow.
 * As a link it lifts on hover like a button.
 */
export function Surface(props: AsBlock | AsLink) {
  const {
    tone = "paper",
    radius = "card",
    elevation = "none",
    outline,
    padding = "md",
    className,
    children,
    ...rest
  } = props;
  // Dark bars have no outline by default; everything else does.
  const resolvedOutline = outline ?? (tone === "ink" ? "none" : "solid");
  const isLink = "href" in rest && rest.href !== undefined;
  const cls = cx(
    styles.surface,
    styles[`tone-${tone}`],
    styles[`radius-${radius}`],
    styles[`elevation-${elevation}`],
    styles[`outline-${resolvedOutline}`],
    styles[`padding-${padding}`],
    isLink && styles.link,
    isLink && "lift",
    className,
  );

  if (isLink) {
    return (
      <Link {...(rest as Omit<AsLink, keyof StyleProps>)} className={cls}>
        {children}
      </Link>
    );
  }
  const { as: Tag = "div", ...blockProps } = rest as Omit<AsBlock, keyof StyleProps>;
  return (
    <Tag {...blockProps} className={cls}>
      {children}
    </Tag>
  );
}
