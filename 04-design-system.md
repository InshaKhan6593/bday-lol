# 04: Design system (from the mockup source)

The client wants a **pixel-for-pixel** match. When this file and a `resources/mockup-source/*.dc.html` file differ, the HTML file wins.

## Typography
- **One font: Bricolage Grotesque** (Google Fonts), loaded with `opsz,wght@12..96,400;12..96,600;12..96,800`. Fallback: `system-ui, sans-serif`.
- Only three weights are used: **400** (body), **600** (labels, secondary links), **800** (headings, buttons, numbers).
- Headings use tight negative letter-spacing (-0.02em to -0.055em). Uppercase kickers use positive tracking (0.08em to 0.18em).
- Countdown and numbers use `font-variant-numeric: tabular-nums`.
- Common sizes: body 17px, small 13–15px, buttons 17–20px. The home H1 is `clamp(52px, 11vw, 160px)`.

## Core colors
| Token | Hex | Use |
|---|---|---|
| ink | `#141414` | All text, borders, shadows, black buttons and bars |
| white | `#FFFFFF` | Cards, inputs, secondary buttons |
| text-2 | `#333333` | Secondary text |
| text-3 | `#4A4A4A` | Tertiary text and footnotes |
| on-dark-2 | `#D6D6D6` | Secondary text on black bars |
| on-dark-3 | `#BDBDBD` | "DAY ENDS IN" label |
| divider | `#EFEFEF` | Famous-people row separators |
| clear-btn | `#F0F0F0` | Search clear button |
| error | `#B3132B` | Invalid gift link hint |
| overlay | `rgba(20,20,20,0.55)` | Boost box backdrop |

## The 12 themes (single shared list, this order)
| # | Name | Ground (page background) | Accent (buttons and badges) |
|---|---|---|---|
| 1 | Blush | `#FFC9C9` | `#4CC9C0` |
| 2 | Apricot | `#FFD3AE` | `#6FA8FF` |
| 3 | **Butter** (default: home when empty, How it works, Claim start) | `#FFEC94` | `#A88BFF` |
| 4 | Lime | `#E4F5A1` | `#FF7AB8` |
| 5 | Mint | `#BDEFD0` | `#FF8A8A` |
| 6 | Seafoam | `#B2E9E3` | `#FF9A5C` |
| 7 | Sky | `#BFD8FF` | `#FFA34D` |
| 8 | Periwinkle | `#CACFFF` | `#FFD53D` |
| 9 | Lavender | `#DFCFFF` | `#C8EB52` |
| 10 | Orchid | `#F3C9F5` | `#5ED68E` |
| 11 | Bubblegum | `#FFC6DF` | `#9BE36B` |
| 12 | **Cloud** (Find page fallback when a date has no bids) | `#E6E8EE` | `#FF6FAE` |

Where each part of a theme is used:
- Page background = ground.
- Avatar fallback circle = accent on the #1 card. List avatars use **each person's own ground** color.
- Black-bar kicker text and CTA button = accent.
- "On the homepage"/"Top bid" badge, hover tooltips, gift-menu options and the "Take #1" chip = accent of the **page's** #1.
- Gift panel, Boost result box and the nobody-yet link box = ground.
- Color changes **fade over 0.3s**.

## Shape language (neo-brutalist)
- **Borders**: `3px solid #141414` everywhere. Calendar cells and badges use 2px. Dashed borders mark empty or placeholder states (photo slot, "?" avatar, "Gifts open" pill, empty or no-match boxes).
- **Radii**: pills `999px`. Big cards 28 (home #1 card, claim form). Cards 22–24. Buttons 14–16. Small controls 10–12.
- **Hard offset shadows** (no blur): hero card / Boost box `10px 10px 0 #141414`. Section cards `8px 8px 0`. Gift menu `6px 6px 0`. Tooltips and hover `4px 4px 0`.

## Hover and press (client requirement)
```css
a[href][style*="border-radius"], button[style*="border-radius"], .bz-chip {
  transition: transform .12s ease, box-shadow .12s ease, background-color .25s ease;
}
@media (hover: hover) {           /* mouse devices only */
  :hover { transform: translate(-2px,-2px); box-shadow: 4px 4px 0 #141414; }
}
:active { transform: translate(0,0); box-shadow: none; }
```
Button colors don't change on hover. **Exceptions** in the mockup: the homepage ▲ Boost button and the ▲ total pills turn **black with white text** on hover.
This applies to every button and clickable card, including the Boost amount chips.

## Layout
- Header padding: desktop `24px clamp(16px,4vw,56px)`, mobile `16px`.
- Main max-width: Home **1180**, Find **980**, How **980**, Claim **1180**, Success **1240**. Side padding `clamp(16px,4vw,56px)`.
- Mockup breakpoints: desktop board 1440, mobile board 390. The layouts mostly use flex-wrap and `auto-fit` grids. The mobile files differ in specific places (header, row layout, font sizes, column counts), so build responsive components that reproduce **both** boards exactly.
- Touch targets: 44–60px tall.

## Icons
The mockup uses hand-drawn inline 24×24 SVG strokes for: share (3 nodes), Facebook "f", speech bubble (text), link (copy), ↗ arrow (gift), → arrow, ◀ ▶ chevrons, calendar, search, ✕, + (photo / FAQ), ▼ chevron (selects / gift menu), upload-share (row share), hamburger, and a filled ▲.
**We replaced them with Phosphor (Bold)**. Same icon in each place, cleaner drawing. See the decisions below.

## Implementation decisions
Decided 2026-10-09 while building the foundation. The code is in `web/src/styles/tokens.css` and `web/src/components/ui/`.

| Topic | Decision | Why |
|---|---|---|
| Overall look | **Keep the client's look exactly**: rounded pastel shapes, Bricolage Grotesque | He asked for pixel-for-pixel. We compared it with the square, multi-font style that [neubrutalism.com](https://neubrutalism.com/) prefers: the rounded version suits a birthday site better, and Syne (that site's display font) is ~1.6× too wide for the giant homepage date |
| How the design is coded | **Design language, not copied values.** The 8 rules sit at the top of `tokens.css`. Components use role tokens (`--text-title`, `--radius-card`, `--shadow-section`…) and shared primitives (Button, Surface, Avatar, Badge, Kicker, Field, Select, Icon, ThemeScope) | One place to change the look. The pixel values still come from the mockup |
| Theme color | `<ThemeScope theme="…">` sets `--ground` and `--accent`. Everything colored reads those two values, and changes fade over 0.3s | Matches rule "color only comes from the theme" |
| Hover and press | One shared `lift` class (lift 2px up-left + 4px shadow on mouse devices, press flat) | Client requirement, applied consistently |
| Icons | **[Phosphor](https://phosphoricons.com), Bold weight** (`<Icon name="share" />`, `@phosphor-icons/react/ssr`). ▲ Boost uses the solid style | The mockup's icons looked rough. Bold strokes match the 3px borders, and the set includes brand logos (Facebook). **Tell the client** (line in the client message, `private/README.md`) |
| Dropdowns and popups | **[Radix UI](https://www.radix-ui.com)** primitives styled with our tokens. Month/Day uses `<Select>`: white menu panel, ink outline, 6px shadow (same as the mockup's "Send a gift" menu), highlighted row = theme ground + ink outline, picked row = black + ✓ | Native `<select>` lists are drawn by the browser or phone and can't be styled. Radix gives keyboard, screen-reader and touch support. Use it for the gift menu, calendar popover, Boost dialog and tooltips too |
| "Unclaimed" on Coming up cards | A small **dashed tag** ("UNCLAIMED", the `Badge` primitive's `empty` tone) instead of grey text in the name slot. Names ("Marcus T.") stay exactly as in the mockup | Decided 2026-10-09: it's a status, not a person, and plain grey text read like a name. Dashed already means "empty / not yet" in the design (rule 8, like "Gifts open"). **Tell the client** as FYI |
| Reference | [neubrutalism.com](https://neubrutalism.com/), a guide to the style. Our tokens already follow its core rules (one stroke-width token, tiered hard shadows, loud headings with calm body text, state not shown by color alone, visible focus) | Useful checklist. Before launch: run its contrast check on all 12 themes |
