import type { ReactNode } from "react";
import type { ColorIconName, IconName } from "@/components/ui";

/**
 * The icons as drawn in the client's mockup (hand-written 24px line drawings), kept only for the
 * side-by-side on /styleguide. The site itself uses `Icon` (Phosphor Bold) and `ColorIcon`.
 */
export type MockupIcon = {
  label: string;
  where: string;
  strokeWidth: number;
  solid?: boolean;
  body: ReactNode;
  built: { icon: IconName } | { color: ColorIconName };
};

export const MOCKUP_ICONS: MockupIcon[] = [
  { label: "Boost", where: "Boost pills and buttons", strokeWidth: 2, solid: true, body: <path d="M12 4l9 15H3z" />, built: { icon: "boost" } },
  {
    label: "Share",
    where: "Share buttons",
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
    built: { color: "share" },
  },
  {
    label: "Facebook",
    where: "Share buttons",
    strokeWidth: 2.4,
    body: <path d="M15 3h-2a4 4 0 0 0-4 4v3H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z" />,
    built: { color: "facebook" },
  },
  {
    label: "Text",
    where: "Share buttons",
    strokeWidth: 2.4,
    body: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
    built: { color: "text" },
  },
  {
    label: "Copy link",
    where: "Share buttons",
    strokeWidth: 2.4,
    body: (
      <>
        <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </>
    ),
    built: { color: "link" },
  },
  {
    label: "Share menu",
    where: "Each person’s row",
    strokeWidth: 2.4,
    body: (
      <>
        <path d="M4 12v8h16v-8" />
        <path d="M12 3v13" />
        <path d="M7 8l5-5 5 5" />
      </>
    ),
    built: { icon: "upload" },
  },
  {
    label: "Open link",
    where: "Gift buttons",
    strokeWidth: 2.6,
    body: (
      <>
        <path d="M7 17L17 7" />
        <path d="M8 7h9v9" />
      </>
    ),
    built: { icon: "arrowUpRight" },
  },
  {
    label: "Arrow",
    where: "Coming up, links",
    strokeWidth: 2.6,
    body: (
      <>
        <path d="M5 12h14" />
        <path d="M13 6l6 6-6 6" />
      </>
    ),
    built: { icon: "arrowRight" },
  },
  { label: "Back", where: "Previous day, back", strokeWidth: 2.6, body: <path d="M15 18l-6-6 6-6" />, built: { icon: "chevronLeft" } },
  { label: "Next", where: "Next day, menu rows", strokeWidth: 2.6, body: <path d="M9 18l6-6-6-6" />, built: { icon: "chevronRight" } },
  { label: "Dropdown", where: "Month, day, gift menu", strokeWidth: 3, body: <path d="M6 9l6 6 6-6" />, built: { icon: "chevronDown" } },
  {
    label: "Calendar",
    where: "Pick a date",
    strokeWidth: 2.4,
    body: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
      </>
    ),
    built: { icon: "calendar" },
  },
  {
    label: "Search",
    where: "Find a name",
    strokeWidth: 2.4,
    body: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </>
    ),
    built: { icon: "search" },
  },
  {
    label: "Close",
    where: "Popups, remove a link",
    strokeWidth: 3,
    body: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </>
    ),
    built: { icon: "close" },
  },
  { label: "Plus", where: "Add a photo, FAQ", strokeWidth: 2.4, body: <path d="M12 5v14M5 12h14" />, built: { icon: "plus" } },
  {
    label: "Menu",
    where: "Phone header",
    strokeWidth: 2.6,
    body: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    built: { icon: "menu" },
  },
];

/** One mockup icon, drawn in currentColor like the site's own icons. */
export function MockupSvg({ icon, size = 24 }: { icon: MockupIcon; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={icon.solid ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={icon.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icon.body}
    </svg>
  );
}
