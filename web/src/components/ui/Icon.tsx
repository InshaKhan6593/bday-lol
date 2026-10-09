import type { SVGProps } from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  ChatCircleIcon,
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

/**
 * The site's icon set: Phosphor (https://phosphoricons.com), Bold weight.
 * Bold strokes match the design language's thick 3px ink outlines.
 * Icons draw in currentColor, so they follow the text color (white on black buttons).
 *
 * To add an icon: find it on phosphoricons.com, import "<Name>Icon" from
 * "@phosphor-icons/react/ssr" and give it a name below.
 */
const ICONS = {
  boost: TriangleIcon,
  share: ShareNetworkIcon,
  facebook: FacebookLogoIcon,
  text: ChatCircleIcon,
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
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

/** The ▲ boost triangle is solid; everything else uses the bold outline. */
const DEFAULT_WEIGHT: Partial<Record<IconName, IconWeight>> = { boost: "fill" };

type Props = Omit<SVGProps<SVGSVGElement>, "name" | "ref"> & {
  name: IconName;
  size?: number;
  weight?: IconWeight;
};

export function Icon({ name, size = 20, weight, ...rest }: Props) {
  const Cmp = ICONS[name];
  return <Cmp size={size} weight={weight ?? DEFAULT_WEIGHT[name] ?? "bold"} aria-hidden="true" {...rest} />;
}
