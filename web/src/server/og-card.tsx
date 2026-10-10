import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTheme, type ThemeKey } from "@/config/themes";
import { initials } from "@/lib/people";
import { absoluteUrl, displayUrl, siteOrigin } from "@/lib/routes";

/**
 * Share images (Open Graph / X cards): the 1.91:1 card from the Success page's
 * "How your link looks when shared" preview, drawn at 1200×630 (06-seo.md).
 * Theme ground, avatar, kicker, the date and a name, the site in the corner.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#141414";
const fonts = async () => {
  const dir = join(process.cwd(), "src/assets/fonts");
  const [bold, semi] = await Promise.all([
    readFile(join(dir, "BricolageGrotesque-Bold.ttf")),
    readFile(join(dir, "BricolageGrotesque-SemiBold.ttf")),
  ]);
  return [
    { name: "Bricolage", data: bold, weight: 800 as const, style: "normal" as const },
    { name: "Bricolage", data: semi, weight: 600 as const, style: "normal" as const },
  ];
};

/** A listing photo as a data URL, or null (missing, slow or broken) so the card falls back to initials. */
async function photoData(photoUrl: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  try {
    const res = await fetch(absoluteUrl(photoUrl), { signal: AbortSignal.timeout(3000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export type CardInput = {
  theme: ThemeKey;
  /** "TODAY'S BIRTHDAY", "UP FOR GRABS"… */
  kicker: string;
  /** The big line: "October 7". */
  headline: string;
  /** Under it: the person's name, or a short fact. */
  line: string;
  /** The circle: a person (photo or initials) or a symbol for pages without one. */
  avatar: { name: string; photoUrl: string | null } | { symbol: string };
  /** Shown bottom right, e.g. "mybday.lol/october-7". */
  path: string;
};

export async function cardImage(card: CardInput): Promise<ImageResponse> {
  const theme = getTheme(card.theme);
  const photo = "name" in card.avatar ? await photoData(card.avatar.photoUrl) : null;
  const circleText = "name" in card.avatar ? initials(card.avatar.name) || "?" : card.avatar.symbol;
  // The text column is ~730px wide; Bricolage Bold runs ~0.56em a character.
  const headlineSize = Math.min(124, Math.floor(730 / (card.headline.length * 0.56)));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: theme.ground,
          color: INK,
          fontFamily: "Bricolage",
          padding: "64px 72px 48px",
          border: `10px solid ${INK}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 52, flex: 1 }}>
          <div
            style={{
              width: 252,
              height: 252,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: `8px solid ${INK}`,
              background: theme.accent,
              overflow: "hidden",
              fontSize: circleText.length > 2 ? 76 : 96,
              fontWeight: 800,
            }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>
              <img src={photo} width={252} height={252} alt="" style={{ objectFit: "cover" }} />
            ) : (
              circleText
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {card.kicker}
            </div>
            <div style={{ fontSize: headlineSize, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 0.95 }}>
              {card.headline}
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 8 }}>
              {card.line}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 30 }}>
          <div style={{ fontWeight: 800, fontSize: 40, letterSpacing: "-0.02em" }}>mybday.lol</div>
          <div style={{ fontWeight: 600 }}>{displayUrl(siteOrigin() + card.path)}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
