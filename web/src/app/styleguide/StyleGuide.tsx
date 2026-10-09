"use client";

import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Chip,
  Field,
  Icon,
  IconButton,
  Input,
  Kicker,
  Select,
  Surface,
  Textarea,
  ThemeScope,
  type IconName,
} from "@/components/ui";
import { THEME_KEYS, THEMES, type ThemeKey } from "@/config/themes";
import { MONTHS } from "@/lib/birthday";
import { cx } from "@/lib/cx";
import styles from "./StyleGuide.module.css";

const TYPE_ROLES = [
  ["--text-display", "Display", "October 7", 800],
  ["--text-hero", "Hero", "One birthday.", 800],
  ["--text-h1", "H1", "Everyone celebrating", 800],
  ["--text-name", "Name", "Jess Moreno", 800],
  ["--text-number", "Number", "#287", 800],
  ["--text-h2", "H2", "Coming up", 800],
  ["--text-stat", "Stat", "$241", 800],
  ["--text-title", "Title", "Boost Jess Moreno", 800],
  ["--text-title-sm", "Title small", "Send a birthday gift", 800],
  ["--text-action", "Action", "Claim the top spot", 800],
  ["--text-lead", "Lead", "30 and still can't cook. Pizza money appreciated.", 400],
  ["--text-body", "Body", "Gifts go straight to them. bday.lol never touches the money.", 400],
  ["--text-note", "Note", "For your receipt and outbid alerts. Never shown.", 400],
  ["--text-caption", "Caption", "Under each date: the current top bid.", 400],
  ["--text-fine", "Fine", "Boosts are final and add to Jess's total.", 400],
] as const;

const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: String(i + 1), label }));
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

const ICONS: IconName[] = [
  "boost", "share", "facebook", "text", "link", "arrowUpRight", "arrowRight", "chevronLeft",
  "chevronRight", "chevronDown", "chevronUp", "check", "calendar", "search", "close", "plus", "upload", "menu",
];

export function StyleGuide() {
  const [theme, setTheme] = useState<ThemeKey>("lime");

  return (
    <ThemeScope theme={theme} paint>
      <main className={styles.page}>
        <header className={styles.intro}>
          <Kicker size="lg">bday.lol design language</Kicker>
          <h1 className={styles.display}>Neo-brutalist.</h1>
          <p className={styles.lead}>
            Ink outlines, hard shadows, one typeface, and color that only comes from the theme. Pick a
            theme to watch every surface follow it.
          </p>
        </header>

        <Section title="Themes" note={`${THEMES[theme].name}: ground + accent. The page fades in 0.3s.`}>
          <div className={styles.swatches} role="radiogroup" aria-label="Theme">
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
        </Section>

        <Section title="Type roles" note="Bricolage Grotesque · 400 / 600 / 800">
          <Surface radius="section" padding="lg" className={styles.stack}>
            {TYPE_ROLES.map(([token, name, sample, weight]) => (
              <div key={token} className={styles.typeRow}>
                <code className={styles.token}>{name}</code>
                <span
                  className={styles.typeSample}
                  style={{ fontSize: `var(${token})`, fontWeight: weight }}
                >
                  {sample}
                </span>
              </div>
            ))}
          </Surface>
        </Section>

        <Section title="Buttons" note="Hover lifts up-left with a hard shadow (mouse only). Click presses flat.">
          <div className={styles.row}>
            <Button variant="ink">Remind me</Button>
            <Button variant="paper" iconStart={<Icon name="share" size={20} />}>Share</Button>
            <Button variant="accent" size="2xl" shape="large">Claim the top spot</Button>
            <Button variant="ink" shape="pill">Claim your birthday</Button>
            <Button variant="paper" shape="pill" hoverInvert iconStart={<Icon name="boost" size={16} />}>
              Boost
            </Button>
            <Button variant="text">Back to today</Button>
            <Button variant="ink" disabled>Pay &amp; claim</Button>
          </div>
          <div className={styles.row}>
            <Chip>$2</Chip>
            <Chip pressed>$5</Chip>
            <Chip>$10</Chip>
            <Chip>$20</Chip>
            <Chip tone="accent">Take #1: +$16</Chip>
          </div>
          <div className={styles.row}>
            <IconButton icon="chevronLeft" label="Previous day" />
            <IconButton icon="chevronRight" label="Next day" />
            <IconButton icon="menu" label="Menu" size="md" />
            <IconButton icon="close" label="Close" size="sm" />
            <IconButton icon="close" label="Clear search" size="sm" tone="muted" />
          </div>
        </Section>

        <Section title="Surfaces" note="Paper, ground and ink fills. Shadows step down: hero 10, section 8, menu 6, lift 4.">
          <Surface radius="hero" elevation="hero" padding="hero" as="section" className={styles.hero}>
            <div className={styles.heroHead}>
              <Avatar name="Jess Moreno" size="lg" />
              <div className={styles.stackTight}>
                <span className={styles.name}>Jess Moreno</span>
                <span className={styles.bio}>&quot;30 and still can&apos;t cook. Pizza money appreciated.&quot;</span>
              </div>
              <Button variant="paper" shape="pill" iconStart={<Icon name="boost" size={16} />}>Boost</Button>
            </div>
            <Surface tone="ground" radius="card" className={styles.stack}>
              <span className={styles.titleSm}>Send a birthday gift</span>
              <Button variant="ink" size="xl" iconEnd={<Icon name="arrowUpRight" />}>
                Send on Venmo
              </Button>
              <span className={styles.note}>Gifts go straight to them. bday.lol never touches the money.</span>
            </Surface>
          </Surface>

          <Surface tone="ink" radius="section" padding="md" className={styles.bar}>
            <div className={styles.stackTight}>
              <Kicker tone="accent">Is today your birthday too?</Kicker>
              <span className={styles.onInk}>
                Own today for <strong className={styles.stat}>$241</strong>
              </span>
            </div>
            <div className={styles.stackTight}>
              <Kicker tone="muted">Day ends in</Kicker>
              <strong className={cx(styles.stat, "tabular")}>11:40:52</strong>
            </div>
            <Button variant="accent" size="2xl" shape="large">Claim the top spot</Button>
          </Surface>

          <div className={styles.grid}>
            <Surface href="/styleguide" radius="tile" padding="md" className={styles.stackTight}>
              <span className={styles.tileDate}>Oct 8</span>
              <span className={styles.muted}>Marcus T.</span>
              <strong>Claimed for $85</strong>
            </Surface>
            <Surface radius="section" elevation="section" padding="lg" className={styles.stackTight}>
              <span className={styles.titleLg}>Not your birthday today?</span>
              <span className={styles.muted}>We&apos;ll email you a week before yours.</span>
            </Surface>
            <Surface outline="dashed" radius="card" padding="lg" className={styles.center}>
              Nobody has claimed October 7 yet.
            </Surface>
          </div>
        </Section>

        <Section title="People and labels">
          <div className={styles.row}>
            <Avatar name="Jess Moreno" size="lg" />
            <Avatar name="Tyler Brooks" size="md" color={THEMES.sky.ground} />
            <Avatar name="Ana Reyes" size="sm" color={THEMES.apricot.ground} />
            <Avatar name="Chris Wu" size="xs" color={THEMES.mint.ground} />
            <Avatar size="lg" placeholder />
            <Badge>On the homepage</Badge>
            <Badge>Top bid</Badge>
            <Kicker>Share this birthday</Kicker>
          </div>
        </Section>

        <Section title="Fields">
          <Surface radius="hero" padding="hero" className={styles.form}>
            <div className={styles.formRow}>
              <Field label="Month">
<Select options={MONTH_OPTIONS} placeholder="Select" defaultValue="10" aria-label="Month" />
              </Field>
              <Field label="Day">
<Select options={DAY_OPTIONS} placeholder="–" aria-label="Day" />
              </Field>
            </div>
            <Field label="Your bid" aside="$241 or more to claim the homepage">
              <Input size="2xl" emphasis inputMode="numeric" defaultValue="$241" />
            </Field>
            <Field label="Name" hint="Surprising someone on their birthday? Use their name and photo.">
              <Input maxLength={40} defaultValue="Sam Rivera" />
            </Field>
            <Field label="One-line bio">
              <Textarea rows={2} maxLength={80} defaultValue="Turning 30 and still can't parallel park." />
            </Field>
            <Field label="Gift link" hint={'Your page will show a "Send on Venmo" button'} hintTone="strong">
              <Input defaultValue="venmo.com/u/samrivera" />
            </Field>
            <Field label="Gift link" hint="We can only use Venmo, Cash App, Amazon, or Throne links" hintTone="error">
              <Input defaultValue="paypal.me/sam" />
            </Field>
          </Surface>
        </Section>

        <Section title="Icons" note="Phosphor, Bold weight (phosphoricons.com). Drawn in currentColor. ▲ is solid.">
          <div className={styles.row}>
            {ICONS.map((name) => (
              <span key={name} className={styles.iconCell} title={name}>
                <Icon name={name} size={24} />
                <code>{name}</code>
              </span>
            ))}
          </div>
        </Section>
      </main>
    </ThemeScope>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.h2}>{title}</h2>
        {note && <p className={styles.muted}>{note}</p>}
      </div>
      {children}
    </section>
  );
}
