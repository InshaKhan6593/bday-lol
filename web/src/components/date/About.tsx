import Link from "next/link";
import { Surface } from "@/components/ui";
import { formatLongNb, MONTHS, type MonthDay } from "@/lib/birthday";
import { adjacentDay } from "@/lib/date-page";
import { birthFlower, birthstone, zodiacSign } from "@/lib/facts";
import { routes } from "@/lib/routes";
import type { FamousPerson } from "@/server/famous";
import styles from "./date.module.css";

/**
 * "About [date] birthdays" (SEO content under the list): facts, famous people,
 * and links to the neighbouring days and the month page.
 * The "how common is it" card (FiveThirtyEight births data) comes with the SEO step.
 */
export function About({ md, famous }: { md: MonthDay; famous: FamousPerson[] }) {
  const label = formatLongNb(md);
  const month = MONTHS[md.month - 1]!;
  const prev = adjacentDay(md, -1);
  const next = adjacentDay(md, 1);
  const facts = [
    { key: "Zodiac sign", value: zodiacSign(md), sub: `Star sign for ${label}` },
    { key: "Birthstone", value: birthstone(md.month), sub: `${month} birthstone` },
    { key: "Birth flower", value: birthFlower(md.month), sub: `${month} birth flower` },
  ];

  return (
    <section aria-labelledby="about-title" className={styles.about}>
      <h2 id="about-title" className={styles.aboutTitle}>
        About {label} birthdays
      </h2>

      <div className={styles.factGrid}>
        {facts.map((fact) => (
          <Surface key={fact.key} padding="none" className={styles.fact}>
            <span className={styles.factKey}>{fact.key}</span>
            <span className={styles.factValue}>{fact.value}</span>
            <span className={styles.factSub}>{fact.sub}</span>
          </Surface>
        ))}
      </div>

      {famous.length > 0 && (
        <Surface className={styles.famous}>
          <h3 className={styles.famousTitle}>Famous people born on {label}</h3>
          <ul className={styles.famousList}>
            {famous.map((person) => (
              <li key={person.name} className={styles.famousRow}>
                <span>
                  <span className={styles.famousName}>{person.name}</span>
                  <span className={styles.famousWhat}>, {person.knownFor}</span>
                </span>
                <span className={styles.famousAge}>Age {person.age}</span>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      <nav aria-label="Nearby dates" className={styles.dayLinks}>
        <Link href={routes.date(prev)}>← {formatLongNb(prev)}</Link>
        <Link href={routes.month(md.month)}>All {month} birthdays</Link>
        <Link href={routes.date(next)}>{formatLongNb(next)} →</Link>
      </nav>
    </section>
  );
}
