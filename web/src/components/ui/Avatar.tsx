import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";
import styles from "./Avatar.module.css";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

type Props = {
  name?: string;
  photoUrl?: string | null;
  /** Fallback fill behind the initials. Defaults to the theme accent. */
  color?: string;
  size?: AvatarSize;
  /** Dashed "?" circle for an empty spot. */
  placeholder?: boolean;
  className?: string;
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Round photo with an ink outline. Falls back to initials, or "?" when empty. */
export function Avatar({ name = "", photoUrl, color, size = "md", placeholder, className }: Props) {
  const style = color ? ({ "--avatar-fill": color } as CSSProperties) : undefined;
  const cls = cx(styles.avatar, styles[size], placeholder && styles.placeholder, className);

  if (placeholder) {
    return (
      <div aria-hidden="true" className={cls}>
        ?
      </div>
    );
  }
  if (photoUrl) {
    // Photos are already square-cropped at upload.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} className={cx(cls, styles.photo)} style={style} />;
  }
  return (
    <div aria-hidden="true" className={cls} style={style}>
      {initials(name)}
    </div>
  );
}
