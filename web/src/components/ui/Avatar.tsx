import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";
import { initials } from "@/lib/people";
import styles from "./Avatar.module.css";

export type AvatarSize = "xs" | "sm" | "md" | "card" | "lg";

type Props = {
  name?: string;
  photoUrl?: string | null;
  /** Fallback fill behind the initials. Defaults to the theme accent. */
  color?: string;
  size?: AvatarSize;
  /** Dashed "?" circle for an empty spot. */
  placeholder?: boolean;
  /** The page's main photo (the homepage #1): fetched first. Every other photo loads when it nears the screen. */
  priority?: boolean;
  className?: string;
};

export { initials } from "@/lib/people";

/** Round photo with an ink outline. Falls back to initials, or "?" when empty. */
export function Avatar({ name = "", photoUrl, color, size = "md", placeholder, priority, className }: Props) {
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
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={cx(cls, styles.photo)}
        style={style}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
      />
    );
  }
  return (
    <div aria-hidden="true" className={cls} style={style}>
      {initials(name)}
    </div>
  );
}
