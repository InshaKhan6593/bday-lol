import type { SVGProps } from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  ChatCircleTextIcon,
  CheckIcon,
  ExportIcon,
  FacebookLogoIcon,
  LinkIcon,
  ListIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShareNetworkIcon,
  TriangleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";
import { MOCKUP_DRAWINGS, SITE_ICON_SET, type IconSet } from "./mockup-icons";

/**
 * The site draws the client's mockup icons (mockup-icons.tsx, SITE_ICON_SET). This is the suggested
 * set, shown to the client on /styleguide: Phosphor (https://phosphoricons.com), Bold weight.
 * Bold strokes match the design language's thick 3px ink outlines.
 * Both sets draw in currentColor, so they follow the text color (white on black buttons).
 *
 * To add an icon: find it on phosphoricons.com, import "<Name>Icon" from
 * "@phosphor-icons/react/ssr" and give it a name below, then add its drawing to MOCKUP_DRAWINGS.
 */
const ICONS = {
  boost: TriangleIcon,
  share: ShareNetworkIcon,
  facebook: FacebookLogoIcon,
  text: ChatCircleTextIcon,
  link: LinkIcon,
  arrowUpRight: ArrowUpRightIcon,
  arrowRight: ArrowRightIcon,
  chevronLeft: CaretLeftIcon,
  chevronRight: CaretRightIcon,
  chevronDown: CaretDownIcon,
  chevronUp: CaretUpIcon,
  check: CheckIcon,
  calendar: CalendarBlankIcon,
  search: MagnifyingGlassIcon,
  close: XIcon,
  plus: PlusIcon,
  upload: ExportIcon,
  menu: ListIcon,
} satisfies Record<keyof typeof MOCKUP_DRAWINGS, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

/**
 * Only sizes that stay whole pixels on scaled screens (100%, 125%, 150%, 200%).
 * An 18px icon becomes 22.5px at Windows' 125% scaling and its edges blur.
 */
export type IconSize = 12 | 16 | 20 | 24 | 28 | 32;

/** The ▲ boost triangle is solid; everything else uses the bold outline. */
const DEFAULT_WEIGHT: Partial<Record<IconName, IconWeight>> = { boost: "fill" };

type Props = Omit<SVGProps<SVGSVGElement>, "name" | "ref"> & {
  name: IconName;
  size?: IconSize;
  /** Suggested set only. */
  weight?: IconWeight;
  /** Which drawings to use; the site's own set unless a page compares the two. */
  set?: IconSet;
};

export function Icon({ name, size = 20, weight, set = SITE_ICON_SET, ...rest }: Props) {
  if (set === "mockup") {
    const drawing: { strokeWidth: number; solid?: boolean; body: React.ReactNode } = MOCKUP_DRAWINGS[name];
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={drawing.solid ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={drawing.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
        // Inside a narrow flex button the drawing must keep its size, not shrink to nothing.
        style={{ flexShrink: 0, ...rest.style }}
      >
        {drawing.body}
      </svg>
    );
  }
  const Cmp = ICONS[name];
  return <Cmp size={size} weight={weight ?? DEFAULT_WEIGHT[name] ?? "bold"} aria-hidden="true" {...rest} />;
}
