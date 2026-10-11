"use client";

import { useState } from "react";
import { ColorIcon, Icon, Kicker, Surface, ThemeScope, type ColorIconName, type IconName, type IconSet } from "@/components/ui";
import { THEME_KEYS, THEMES, type ThemeKey } from "@/config/themes";
import { cx } from "@/lib/cx";
import styles from "./StyleGuide.module.css";

/** Every icon on the site. */
const ICON_ROWS: Array<{ label: string; name: IconName }> = [
  { label: "Boost", name: "boost" },
  { label: "Share", name: "share" },
  { label: "Facebook", name: "facebook" },
  { label: "Text", name: "text" },
  { label: "Copy link", name: "link" },
  { label: "Share menu", name: "upload" },
  { label: "Open link", name: "arrowUpRight" },
  { label: "Arrow", name: "arrowRight" },
  { label: "Back", name: "chevronLeft" },
  { label: "Next", name: "chevronRight" },
  { label: "Dropdown", name: "chevronDown" },
  { label: "Calendar", name: "calendar" },
  { label: "Search", name: "search" },
  { label: "Close", name: "close" },
  { label: "Plus", name: "plus" },
  { label: "Menu", name: "menu" },
];

/** The four share icons have a colored version in the suggested set. */
const COLORED: readonly string[] = ["share", "facebook", "text", "link"] satisfies ColorIconName[];

export function DesignOptions() {
  const [theme, setTheme] = useState<ThemeKey>("butter");

  return (
    <ThemeScope theme={theme} paint>
      <main className={cx(styles.page, styles.review)}>
        <header className={styles.intro}>
          <Kicker size="lg">mybday.lol · for review</Kicker>
          <h1 className={styles.display}>Design options.</h1>
          <p className={styles.lead}>
            The site follows the mockup. Here are two suggested changes, each next to what the site has now.
          </p>
        </header>

        <Section
          title="1. Icons"
          note="The site uses the mockup’s icons. The suggested set is drawn heavier, to match the thick outlines, and its four share icons take the person’s color."
        >
          <BeforeAfter shot="home" width={1280} height={1068} alt="The homepage’s #1 card with its share buttons" />

          <div className={styles.setHead}>
            <h3 className={styles.optionName}>Every icon</h3>
            <div className={styles.swatches} role="radiogroup" aria-label="Color">
              {THEME_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={key === theme}
                  aria-label={THEMES[key].name}
                  title={THEMES[key].name}
                  onClick={() => setTheme(key)}
                  className={cx(styles.swatch, key === theme && styles.swatchSelected)}
                  style={{ background: THEMES[key].ground }}
                >
                  <span className={styles.swatchAccent} style={{ background: THEMES[key].accent }} />
                </button>
              ))}
            </div>
          </div>
          <div className={styles.pairGrid}>
            {ICON_ROWS.map((row) => (
              <Surface key={row.label} padding="none" className={styles.pair}>
                <h4 className={styles.pairName}>{row.label}</h4>
                <div className={styles.pairIcons}>
                  <PairCell caption="Now">
                    <SetIcon name={row.name} set="mockup" />
                  </PairCell>
                  <PairCell caption="Suggested">
                    <SetIcon name={row.name} set="suggested" />
                  </PairCell>
                </div>
              </Surface>
            ))}
          </div>
          {/* Streamline's free icons (CC BY 4.0) need a credit wherever they are shown. */}
          <p className={styles.optionMeta}>
            Suggested set: Phosphor icons, and colored share icons by{" "}
            <a href="https://www.streamlinehq.com" target="_blank" rel="noopener noreferrer">
              Streamline
            </a>{" "}
            (free with a small “Icons by Streamline” credit in the footer).
          </p>
        </Section>

        <Section
          title="2. Gift link help"
          note="On the Claim page. Now: all four apps are listed under the rows. Suggested: one line under each row, only for the app picked there."
        >
          <BeforeAfter shot="claim" width={1280} height={754} alt="“Where should gifts go?” on the Claim page" />
        </Section>
      </main>
    </ThemeScope>
  );
}

/** Screenshots of the real page, taken with each version switched on (public/styleguide). */
function BeforeAfter({ shot, width, height, alt }: { shot: string; width: number; height: number; alt: string }) {
  return (
    <div className={styles.optionGrid}>
      <figure className={styles.shot}>
        <figcaption className={styles.shotCaption}>Before · on the site now</figcaption>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/styleguide/${shot}-now.webp`} alt={`${alt}, as it is now`} width={width} height={height} />
      </figure>
      <figure className={styles.shot}>
        <figcaption className={styles.shotCaption}>After · suggested</figcaption>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/styleguide/${shot}-suggested.webp`} alt={`${alt}, with the suggestion`} width={width} height={height} />
      </figure>
    </div>
  );
}

function SetIcon({ name, set }: { name: IconName; set: IconSet }) {
  if (set === "suggested" && COLORED.includes(name)) return <ColorIcon name={name as ColorIconName} set="suggested" />;
  return <Icon name={name} size={24} set={set} />;
}

function PairCell({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <span className={styles.pairCell}>
      <span className={styles.pairTile}>{children}</span>
      <span className={styles.pairCaption}>{caption}</span>
    </span>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.stackTight}>
        <h2 className={styles.h2}>{title}</h2>
        <p className={styles.optionNote}>{note}</p>
      </div>
      {children}
    </section>
  );
}
