import type { ReactNode } from "react";

/**
 * Which icons the site draws.
 * - "mockup": the client's own line drawings from the mockup (what the site uses now).
 * - "suggested": Phosphor Bold plus the colored share icons, shown to the client on /styleguide.
 *   Switching to it is this one line; the footer then shows the icon credit the colored set requires.
 */
export type IconSet = "mockup" | "suggested";
export const SITE_ICON_SET: IconSet = "mockup";

type Drawing = { strokeWidth: number; solid?: boolean; body: ReactNode };

/**
 * The mockup's icons: 24px line drawings, copied from its source. The mockup has no "check" or
 * "chevronUp"; those two are drawn here in the same style.
 */
export const MOCKUP_DRAWINGS = {
  boost: { strokeWidth: 2, solid: true, body: <path d="M12 4l9 15H3z" /> },
  share: {
    strokeWidth: 2.4,
    body: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4" />
        <path d="M15.4 6.5l-6.8 4" />
      </>
    ),
  },
  facebook: { strokeWidth: 2.4, body: <path d="M15 3h-2a4 4 0 0 0-4 4v3H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z" /> },
  text: { strokeWidth: 2.4, body: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /> },
  link: {
    strokeWidth: 2.4,
    body: (
      <>
        <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </>
    ),
  },
  arrowUpRight: {
    strokeWidth: 2.6,
    body: (
      <>
        <path d="M7 17L17 7" />
        <path d="M8 7h9v9" />
      </>
    ),
  },
  arrowRight: {
    strokeWidth: 2.6,
    body: (
      <>
        <path d="M5 12h14" />
        <path d="M13 6l6 6-6 6" />
      </>
    ),
  },
  chevronLeft: { strokeWidth: 2.6, body: <path d="M15 18l-6-6 6-6" /> },
  chevronRight: { strokeWidth: 2.6, body: <path d="M9 18l6-6-6-6" /> },
  chevronDown: { strokeWidth: 3, body: <path d="M6 9l6 6 6-6" /> },
  chevronUp: { strokeWidth: 3, body: <path d="M6 15l6-6 6 6" /> },
  check: { strokeWidth: 3, body: <path d="M5 12.5l4.5 4.5L19 7" /> },
  calendar: {
    strokeWidth: 2.4,
    body: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
      </>
    ),
  },
  search: {
    strokeWidth: 2.4,
    body: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </>
    ),
  },
  close: {
    strokeWidth: 3,
    body: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </>
    ),
  },
  plus: { strokeWidth: 2.4, body: <path d="M12 5v14M5 12h14" /> },
  upload: {
    strokeWidth: 2.4,
    body: (
      <>
        <path d="M4 12v8h16v-8" />
        <path d="M12 3v13" />
        <path d="M7 8l5-5 5 5" />
      </>
    ),
  },
  menu: {
    strokeWidth: 2.6,
    body: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
  },
} satisfies Record<string, Drawing>;
