"use client";

import { useState } from "react";
import claimStyles from "@/components/claim/claim.module.css";
import { GiftLinkInputs } from "@/components/claim/GiftLinkInputs";
import { Button, ColorIcon, Icon, Kicker, Surface, ThemeScope } from "@/components/ui";
import { THEME_KEYS, THEMES, type ThemeKey } from "@/config/themes";
import type { GiftService } from "@/db/schema";
import { cx } from "@/lib/cx";
import type { GiftEntry } from "@/lib/gifts";
import { MOCKUP_ICONS, MockupSvg, type MockupIcon } from "./mockup-icons";
import styles from "./StyleGuide.module.css";

/** The suggested help: one line under a row, for the app picked in that row. */
const GIFT_ROW_HELP: Record<GiftService, string> = {
  venmo: "Your Venmo username, like @sam-rivera. A full link works too.",
  cashapp: "Your $cashtag, like $samrivera. A full link works too.",
  amazon: "Open your wishlist on Amazon, tap Share, and paste the link here.",
  throne: "Your Throne username, like @samrivera. A full link works too.",
};

const SHARE_LABELS = ["Share", "Facebook", "Text", "Copy link"] as const;
const mockupIcon = (label: string) => MOCKUP_ICONS.find((icon) => icon.label === label)!;

export function DesignOptions() {
  const [theme, setTheme] = useState<ThemeKey>("butter");

  return (
    <ThemeScope theme={theme} paint>
      <main className={styles.page}>
        <header className={styles.intro}>
          <Kicker size="lg">mybday.lol · for review</Kicker>
          <h1 className={styles.display}>Design options.</h1>
          <p className={styles.lead}>
            Two places where the site and the mockup differ, side by side. Pick a color to see them on any
            person’s page.
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
          note="The site uses a drawn icon set in place of the mockup’s line drawings: the same icon in each place, cleaner at every size. The four share icons take the person’s color."
        >
          <div className={styles.pairGrid}>
            {MOCKUP_ICONS.map((icon) => (
              <Surface key={icon.label} padding="none" className={styles.pair}>
                <div>
                  <h3 className={styles.pairName}>{icon.label}</h3>
                  <p className={styles.optionMeta}>{icon.where}</p>
                </div>
                <div className={styles.pairIcons}>
                  <PairCell caption="Mockup">
                    <MockupSvg icon={icon} />
                  </PairCell>
                  <PairCell caption="Site">
                    <BuiltIcon icon={icon} />
                  </PairCell>
                </div>
              </Surface>
            ))}
          </div>

          <div className={styles.optionGrid}>
            <Option name="Mockup · share buttons" meta="Line icons in ink.">
              <div className={styles.shareDemo}>
                {SHARE_LABELS.map((label) => (
                  <Button key={label} variant="paper" iconStart={<MockupSvg icon={mockupIcon(label)} />}>
                    {label}
                  </Button>
                ))}
              </div>
            </Option>
            <Option name="Site · share buttons" meta="Filled icons in the person’s color.">
              <div className={styles.shareDemo}>
                {SHARE_LABELS.map((label) => (
                  <Button key={label} variant="paper" iconStart={<BuiltIcon icon={mockupIcon(label)} />}>
                    {label}
                  </Button>
                ))}
              </div>
            </Option>
          </div>
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

function BuiltIcon({ icon }: { icon: MockupIcon }) {
  return "color" in icon.built ? <ColorIcon name={icon.built.color} /> : <Icon name={icon.built.icon} size={24} />;
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
