import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { THEMES } from "@/config/themes";

/**
 * The site icon (browser tab, search results, home screen): a bold ink "b" on
 * Butter with the site's ink outline. A stand-in until the client has a logo.
 */
export async function brandIcon(px: number): Promise<ImageResponse> {
  const bold = await readFile(join(process.cwd(), "src/assets/fonts/BricolageGrotesque-Bold.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: THEMES.butter.ground,
          border: `${Math.round(px / 16)}px solid #141414`,
          borderRadius: Math.round(px * 0.22),
          color: "#141414",
          fontFamily: "Bricolage",
          fontSize: Math.round(px * 0.78),
          fontWeight: 800,
          lineHeight: 1,
          paddingBottom: Math.round(px * 0.08),
        }}
      >
        b
      </div>
    ),
    { width: px, height: px, fonts: [{ name: "Bricolage", data: bold, weight: 800, style: "normal" }] },
  );
}
