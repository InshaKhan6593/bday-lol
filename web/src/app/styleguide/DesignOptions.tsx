"use client";

import { useState } from "react";
import claimStyles from "@/components/claim/claim.module.css";
import { GiftLinkInputs } from "@/components/claim/GiftLinkInputs";
import { Button, ColorIcon, Icon, Kicker, Surface, ThemeScope, type ColorIconName, type IconName, type IconSet } from "@/components/ui";
import { THEME_KEYS, THEMES, type ThemeKey } from "@/config/themes";
import type { GiftService } from "@/db/schema";
import { cx } from "@/lib/cx";
import type { GiftEntry } from "@/lib/gifts";
import styles from "./StyleGuide.module.css";

/** The suggested help: one line under a row, for the app picked in that row. */
const GIFT_ROW_HELP: Record<GiftService, string> = {
  venmo: "Your Venmo username, like @sam-rivera. A full link works too.",
  cashapp: "Your $cashtag, like $samrivera. A full link works too.",
  amazon: "Open your wishlist on Amazon, tap Share, and paste the link here.",
  throne: "Your Throne username, like @samrivera. A full link works too.",
};

/** Every icon on the site, and where it shows up. The four share icons have a colored version in the suggested set. */
const ICON_ROWS: Array<{ label: string; where: string; name: IconName }> = [
  { label: "Boost", where: "Boost pills and buttons", name: "boost" },
  { label: "Share", where: "Share buttons", name: "share" },
  { label: "Facebook", where: "Share buttons", name: "facebook" },
  { label: "Text", where: "Share buttons", name: "text" },
  { label: "Copy link", where: "Share buttons", name: "link" },
  { label: "Share menu", where: "Each person’s row", name: "upload" },
  { label: "Open link", where: "Gift buttons", name: "arrowUpRight" },
  { label: "Arrow", where: "Coming up, links", name: "arrowRight" },
  { label: "Back", where: "Previous day, back", name: "chevronLeft" },
  { label: "Next", where: "Next day, menu rows", name: "chevronRight" },
  { label: "Dropdown", where: "Month, day, gift menu", name: "chevronDown" },
  { label: "Calendar", where: "Pick a date", name: "calendar" },
  { label: "Search", where: "Find a name", name: "search" },
  { label: "Close", where: "Popups, remove a link", name: "close" },
  { label: "Plus", where: "Add a photo, FAQ", name: "plus" },
  { label: "Menu", where: "Phone header", name: "menu" },
];

const SHARE_BUTTONS: Array<{ label: string; name: ColorIconName }> = [
  { label: "Share", name: "share" },
  { label: "Facebook", name: "facebook" },
  { label: "Text", name: "text" },
  { label: "Copy link", name: "link" },
];
const COLORED: readonly string[] = SHARE_BUTTONS.map((button) => button.name);

export function DesignOptions() {
  const [theme, setTheme] = useState<ThemeKey>("butter");

  return (
    <ThemeScope theme={theme} paint>
      <main className={styles.page}>
        <header className={styles.intro}>
          <Kicker size="lg">mybday.lol · for review</Kicker>
          <h1 className={styles.display}>Design options.</h1>
          <p className={styles.lead}>
            The site follows the mockup. Here are two suggested changes, each next to what the site has now.
            Pick a color to see them on any person’s page.
          </p>
          <div className={cx(styles.swatches, styles.optionSwatches)} role="radiogroup" aria-label="Theme">
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
        </header>

        <Section
          title="1. Icons"
note="The site uses the mockup’s icons. The suggested set is drawn heavier, to match the thick outlines, and stays sharp at small sizes. Its four share icons take the person’s color."
        >
          <div className={styles.pairGrid}>
            {ICON_ROWS.map((row) => (
              <Surface key={row.label} padding="none" className={styles.pair}>
                <div>
                  <h3 className={styles.pairName}>{row.label}</h3>
                  <p className={styles.optionMeta}>{row.where}</p>
                </div>
                <div className={styles.pairIcons}>
                  <PairCell caption="Site now">
                    <SetIcon name={row.name} set="mockup" />
                  </PairCell>
                  <PairCell caption="Suggested">
                    <SetIcon name={row.name} set="suggested" />
                  </PairCell>
                </div>
              </Surface>
            ))}
          </div>

          <div className={styles.optionGrid}>
            <Option name="Mockup · on the site now" meta="Share buttons with line icons in ink.">
              <div className={styles.shareDemo}>
                {SHARE_BUTTONS.map((button) => (
                  <Button key={button.label} variant="paper" iconStart={<SetIcon name={button.name} set="mockup" />}>
                    {button.label}
                  </Button>
                ))}
              </div>
            </Option>
            <Option name="Suggested · colored share icons" meta="Filled icons in the person’s color.">
              <div className={styles.shareDemo}>
                {SHARE_BUTTONS.map((button) => (
                  <Button key={button.label} variant="paper" iconStart={<SetIcon name={button.name} set="suggested" />}>
                    {button.label}
                  </Button>
                ))}
              </div>
            </Option>
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
          note="Under “Where should gifts go?” on the Claim page. The site has the mockup’s list today. Both boxes work: pick an app, type a username, add a row."
        >
          <div className={styles.optionGrid}>
            <GiftOption name="Mockup · on the site now" meta="All four apps listed under the rows, whichever one is picked.">
              {(rows, setRows) => (
                <>
                  <GiftLinkInputs rows={rows} onChange={setRows} />
                  <dl className={claimStyles.accepted}>
                    <dt>Venmo</dt>
                    <dd>your @username</dd>
                    <dt>Cash App</dt>
                    <dd>your $cashtag</dd>
                    <dt>Amazon</dt>
                    <dd>your wishlist link</dd>
                    <dt>Throne</dt>
                    <dd>your username</dd>
                    <dd className={claimStyles.acceptedNote}>Full links work too.</dd>
                  </dl>
                </>
              )}
            </GiftOption>
            <GiftOption
              name="Suggested · help follows the row"
              meta="One line under each row, only for the app picked there. It gives way to the confirmation or the error."
            >
              {(rows, setRows) => <GiftLinkInputs rows={rows} onChange={setRows} rowHelp={(s) => GIFT_ROW_HELP[s]} />}
            </GiftOption>
          </div>
        </Section>
      </main>
    </ThemeScope>
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

function Option({ name, meta, children }: { name: string; meta: string; children: React.ReactNode }) {
  return (
    <Surface padding="none" className={styles.option}>
      <div>
        <h3 className={styles.optionName}>{name}</h3>
        <p className={styles.optionMeta}>{meta}</p>
      </div>
      {children}
    </Surface>
  );
}

function GiftOption({
  name,
  meta,
  children,
}: {
  name: string;
  meta: string;
  children: (rows: GiftEntry[], setRows: (rows: GiftEntry[]) => void) => React.ReactNode;
}) {
  const [rows, setRows] = useState<GiftEntry[]>([{ service: "venmo", value: "" }]);
  return (
    <Option name={name} meta={meta}>
      <div className={styles.giftDemo}>{children(rows, setRows)}</div>
    </Option>
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
