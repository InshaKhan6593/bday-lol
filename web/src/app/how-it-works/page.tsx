import type { Metadata } from "next";
import { connection } from "next/server";
import styles from "@/components/how/how.module.css";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button, Icon, Surface, ThemeScope } from "@/components/ui";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { zonedDate } from "@/lib/birthday";
import { now } from "@/lib/clock";
import { faqJsonLd, howItWorksFaq, howItWorksSteps, jsonLdScript } from "@/lib/how-it-works";
import { routes } from "@/lib/routes";
import { HOW_DESCRIPTION, HOW_TITLE, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: HOW_TITLE, description: HOW_DESCRIPTION, path: routes.howItWorks });

/** How it works: 3 steps, the FAQ and a "Find your date" bar. Always Butter. */
export default async function HowItWorksPage() {
  // Rendered per request so "Find your date" points at today's date page after midnight ET.
  await connection();
  const settings = BIRTHDAY_BOARD_TYPE.settings;
  const today = zonedDate(now(), settings.timezone);
  const steps = howItWorksSteps(settings);
  const faq = howItWorksFaq(settings);

  return (
    <ThemeScope theme={settings.defaultTheme} paint>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faq)) }} />
      <SiteHeader omit={["how"]} current="how" />
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.h1}>
            One birthday.
            <br />
            The whole internet.
          </h1>
          <p className={styles.intro}>
            Every day, mybday.lol shows one person on its homepage. Whoever bids the most on that date gets the spot,
            until someone outbids them.
          </p>
        </div>

        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <Surface as="li" key={step.title} radius="section" elevation="section" padding="none" className={styles.step}>
              <span className={styles.stepNumber}>{i + 1}</span>
              <h2 className={styles.stepTitle}>{step.title}</h2>
              <p className={styles.stepBody}>{step.body}</p>
            </Surface>
          ))}
        </ol>

        <section className={styles.faq} aria-labelledby="questions">
          <h2 id="questions" className={styles.h2}>
            Questions
          </h2>
          {faq.map((item) => (
            <details key={item.q} className={styles.item}>
              <summary className={styles.question}>
                <span>{item.q}</span>
                <span className={styles.plus}>
                  <Icon name="plus" size={20} />
                </span>
              </summary>
              <p className={styles.answer}>{item.a}</p>
            </details>
          ))}
        </section>

        <Surface tone="ink" radius="section" padding="none" className={styles.bottomBar}>
          <p className={styles.bottomTitle}>When’s your birthday?</p>
          <Button href={routes.date(today)} variant="accent" size="xl" shape="large" className={styles.bottomCta}>
            Find your date
          </Button>
        </Surface>
      </main>
      <SiteFooter />
    </ThemeScope>
  );
}
