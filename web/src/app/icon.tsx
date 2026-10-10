import { brandIcon } from "@/server/brand-icon";

// Google shows a site's favicon in results; it asks for a multiple of 48px.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return brandIcon(192);
}
