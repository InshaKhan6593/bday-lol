import { cx } from "@/lib/cx";
import styles from "./ColorIcon.module.css";

/**
 * Colored share icons: Streamline "Plump Color" (https://www.streamlinehq.com, CC BY 4.0, credited in the
 * site footer), redrawn in the design language: ink outlines and the theme's --accent as the fill, so they
 * recolor with every person's theme. The Facebook square takes the theme color too (chosen for the look;
 * Meta's own guidelines only allow its blue, black or white, so switch FILL to INK there if that matters).
 *
 * `tile` puts the icon on a small white square, for black buttons where an ink outline would disappear.
 */

export type ColorIconName = "share" | "facebook" | "text" | "link";

const INK = "var(--color-ink)";
const FILL = "var(--accent)";
const PAPER = "var(--color-paper)";

function Glyph({ name }: { name: ColorIconName }) {
  const line = { stroke: INK, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "share":
      return (
        <>
          <path
            fill={FILL}
            d="M45 36a9 9 0 1 1-18 0a9 9 0 0 1 18 0m0-24a9 9 0 1 1-18 0a9 9 0 0 1 18 0M21 24a9 9 0 1 1-18 0a9 9 0 0 1 18 0"
          />
          <path
            {...line}
            d="M21 24a9 9 0 1 1-18 0a9 9 0 0 1 18 0m24-12a9 9 0 1 1-18 0a9 9 0 0 1 18 0m0 24a9 9 0 1 1-18 0a9 9 0 0 1 18 0M27.948 16.025l-7.896 3.949m7.896 12l-7.896-3.949"
          />
        </>
      );
    case "facebook":
      return (
        <>
          <path
            fill={FILL}
            {...line}
            d="M3.539 39.743c.208 2.555 2.163 4.51 4.718 4.718C11.485 44.723 16.636 45 24 45s12.515-.277 15.743-.539c2.555-.208 4.51-2.163 4.718-4.718C44.723 36.515 45 31.364 45 24s-.277-12.515-.539-15.743c-.208-2.555-2.163-4.51-4.718-4.718C36.515 3.277 31.364 3 24 3s-12.515.277-15.743.539c-2.555.208-4.51 2.163-4.718 4.718C3.277 11.485 3 16.636 3 24s.277 12.515.539 15.743"
          />
          <path
            fill={PAPER}
            {...line}
            d="M29.516 44.945V30.04h5.539c.888 0 1.687-.584 1.817-1.463a12.9 12.9 0 0 0-.015-3.715c-.128-.862-.896-1.43-1.768-1.43h-5.573c0-4.994.831-5.72 5.515-5.811c.899-.017 1.705-.61 1.836-1.5c.22-1.495.132-2.802-.006-3.72c-.127-.85-.888-1.403-1.746-1.395c-8.279.072-12.994 1.051-12.994 12.426h-4.288c-.834 0-1.574.522-1.7 1.346c-.136.888-.218 2.175.009 3.74c.13.904.944 1.522 1.858 1.522h4.121v14.955a279 279 0 0 0 7.395-.05"
          />
        </>
      );
    case "text":
      return (
        <>
          <path
            fill={FILL}
            {...line}
            d="M8.248 38.537c-2.55-.177-4.539-2.081-4.762-4.627C3.24 31.12 3 26.885 3 21s.24-10.121.486-12.91c.223-2.546 2.212-4.45 4.762-4.627C11.475 3.238 16.628 3 24 3s12.525.238 15.752.463c2.55.177 4.539 2.081 4.762 4.627C44.76 10.88 45 15.115 45 21s-.24 10.121-.486 12.91c-.223 2.546-2.212 4.45-4.762 4.627c-3.003.21-7.674.43-14.248.46l-7.202 6.173C17.004 46.282 15 45.36 15 43.652v-4.785a179 179 0 0 1-6.752-.33Z"
          />
          <path
            fill={PAPER}
            {...line}
            d="M32.898 12.123c1.165.048 2.052.862 2.09 2.028a27 27 0 0 1-.001 1.71c-.038 1.155-.914 1.96-2.068 2.01c-1.525.065-4.223.129-8.919.129c-4.674 0-7.369-.061-8.898-.123c-1.165-.048-2.052-.862-2.09-2.028a27 27 0 0 1 0-1.698c.038-1.166.925-1.98 2.09-2.028C16.632 12.061 19.326 12 24 12s7.369.061 8.898.123ZM24.99 24.087c1.156.053 1.978.896 2.002 2.055a42 42 0 0 1 0 1.733c-.025 1.145-.833 1.978-1.976 2.033c-1.032.05-2.613.092-5.016.092c-2.383 0-3.957-.04-4.99-.087c-1.156-.053-1.978-.896-2.002-2.055a42 42 0 0 1 0-1.716c.024-1.159.846-2.002 2.003-2.055C16.043 24.039 17.618 24 20 24c2.383 0 3.957.04 4.99.087Z"
          />
        </>
      );
    case "link":
      return (
        <>
          <path
            fill={FILL}
            {...line}
            d="M40.399 7.648c-6.167-6.166-16.164-6.166-22.33 0l-2.382 2.382a4 4 0 0 0 0 5.657l1.786 1.786a4 4 0 0 0 5.657 0l2.382-2.381a5.263 5.263 0 0 1 7.443 7.443l-2.382 2.382a4 4 0 0 0 0 5.657l1.787 1.786a4 4 0 0 0 5.657 0l2.382-2.382c6.166-6.166 6.166-16.164 0-22.33"
          />
          <path
            fill={FILL}
            {...line}
            d="M7.647 40.398c-6.166-6.166-6.166-16.164 0-22.33l2.382-2.382a4 4 0 0 1 5.657 0l1.786 1.787a4 4 0 0 1 0 5.657l-2.382 2.382a5.263 5.263 0 0 0 7.444 7.443l2.382-2.382a4 4 0 0 1 5.657 0l1.786 1.786a4 4 0 0 1 0 5.657l-2.382 2.382c-6.166 6.166-16.164 6.166-22.33 0"
          />
          <path
            fill={PAPER}
            {...line}
            d="M15.091 32.954a5.263 5.263 0 0 1 0-7.443l10.42-10.42a5.263 5.263 0 0 1 7.444 7.443l-10.42 10.42a5.263 5.263 0 0 1-7.444 0"
          />
        </>
      );
  }
}

type Props = {
  name: ColorIconName;
  /** Whole pixels only (rule: icons stay crisp on scaled screens). */
  size?: 20 | 24 | 28;
  /** White square behind the icon, for black buttons. */
  tile?: boolean;
  className?: string;
};

export function ColorIcon({ name, size = 24, tile = false, className }: Props) {
  const svg = (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" strokeWidth={3.5} aria-hidden="true" className={styles.svg}>
      <Glyph name={name} />
    </svg>
  );
  if (!tile) return <span className={cx(styles.plain, className)}>{svg}</span>;
  return <span className={cx(styles.tile, className)}>{svg}</span>;
}
