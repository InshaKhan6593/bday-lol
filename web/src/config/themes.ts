/**
 * The 12 color themes. One shared list for the whole site, in this order.
 * A theme = "ground" (page background) + "accent" (buttons, badges, tooltips).
 */
export const THEMES = {
  blush: { name: "Blush", ground: "#FFC9C9", accent: "#4CC9C0" },
  apricot: { name: "Apricot", ground: "#FFD3AE", accent: "#6FA8FF" },
  butter: { name: "Butter", ground: "#FFEC94", accent: "#A88BFF" },
  lime: { name: "Lime", ground: "#E4F5A1", accent: "#FF7AB8" },
  mint: { name: "Mint", ground: "#BDEFD0", accent: "#FF8A8A" },
  seafoam: { name: "Seafoam", ground: "#B2E9E3", accent: "#FF9A5C" },
  sky: { name: "Sky", ground: "#BFD8FF", accent: "#FFA34D" },
  periwinkle: { name: "Periwinkle", ground: "#CACFFF", accent: "#FFD53D" },
  lavender: { name: "Lavender", ground: "#DFCFFF", accent: "#C8EB52" },
  orchid: { name: "Orchid", ground: "#F3C9F5", accent: "#5ED68E" },
  bubblegum: { name: "Bubblegum", ground: "#FFC6DF", accent: "#9BE36B" },
  cloud: { name: "Cloud", ground: "#E6E8EE", accent: "#FF6FAE" },
} as const;

export type ThemeKey = keyof typeof THEMES;
export type Theme = (typeof THEMES)[ThemeKey];

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

export function isThemeKey(value: string): value is ThemeKey {
  return value in THEMES;
}

export function getTheme(key: string | null | undefined, fallback: ThemeKey = "butter"): Theme {
  return key && isThemeKey(key) ? THEMES[key] : THEMES[fallback];
}
