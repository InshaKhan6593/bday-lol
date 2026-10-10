import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Kicker, Surface, ThemeScope } from "@/components/ui";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { cx } from "@/lib/cx";
import type { LegalDoc } from "@/lib/legal";
import { routes } from "@/lib/routes";
import styles from "./legal.module.css";

type Props = { doc: LegalDoc; current: "terms" | "privacy" };

/** Terms of Service and Privacy Policy (Terms.dc.html / Privacy.dc.html): always Butter, text from the admin. */
export function LegalPageView({ doc, current }: Props) {
  const tabs = [
    { key: "terms", href: routes.terms, label: "Terms of Service" },
    { key: "privacy", href: routes.privacy, label: "Privacy Policy" },
  ] as const;

  return (
    <ThemeScope theme={BIRTHDAY_BOARD_TYPE.settings.defaultTheme} paint>
      <SiteHeader omit={["how"]} mobile="plain" />
      <main className={styles.main}>
        <div className={styles.head}>
          <Kicker size="md" className={styles.kicker}>
            Legal
          </Kicker>
          <h1 className={styles.h1}>{doc.title}</h1>
          {doc.updated && <p className={styles.updated}>Last updated: {doc.updated}</p>}
        </div>

        <nav aria-label="Legal pages" className={styles.tabs}>
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={tab.key === current ? "page" : undefined}
              className={cx(styles.tab, "lift")}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <Surface as="article" radius="section" elevation="section" padding="none" className={styles.article}>
          {doc.sections.map((section, i) => (
            <section key={`${section.heading ?? "intro"}-${i}`} className={styles.section}>
              {section.heading && <h2 className={styles.h2}>{section.heading}</h2>}
              {section.blocks.map((block, k) =>
                block.kind === "p" ? (
                  <p key={k} className={styles.p}>
                    {block.text}
                  </p>
                ) : (
                  <ul key={k} className={styles.ul}>
                    {block.items.map((item, n) => (
                      <li key={n}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
        </Surface>
      </main>
      <SiteFooter />
    </ThemeScope>
  );
}
