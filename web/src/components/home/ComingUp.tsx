import Link from "next/link";
import type { CSSProperties } from "react";
import { Badge, Surface } from "@/components/ui";
import { getTheme } from "@/config/themes";
import { formatShort, toKey, type MonthDay } from "@/lib/birthday";
import { COMING_UP_CARD_DAYS, comingUpCell, comingUpCopy, comingUpMonths } from "@/lib/homepage-copy";
import { routes } from "@/lib/routes";
import type { ComingUpDay } from "@/server/homepage";
import styles from "./home.module.css";

type Props = { days: ComingUpDay[]; today: MonthDay; openBidCents: number };

/**
 * The days ahead, drawn twice and shown by screen width (home.module.css):
 * wide screens get the mockup's four cards; a phone gets the whole week as one
 * strip, a bar cut into dates with the top bid under each.
 */
export function ComingUp({ days, today, openBidCents }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.h2}>Coming up</h2>
        <Link href={routes.date(today)} className={styles.headLink}>
          Find your birthday
        </Link>
      </div>

      <div className={styles.upcomingGrid}>
        {days.slice(0, COMING_UP_CARD_DAYS).map((day) => {
          const copy = comingUpCopy(day, openBidCents);
          return (
            <Surface key={toKey(day.md)} href={routes.date(day.md)} radius="tile" padding="none" className={styles.dayCard}>
              <span className={styles.dayDate}>{formatShort(day.md)}</span>
              {copy.claimed ? (
                <span className={styles.dayOwner}>{copy.owner}</span>
              ) : (
                <Badge tone="empty" className={styles.dayTag}>
                  {copy.owner}
                </Badge>
              )}
              <span className={styles.dayPrice}>{copy.price}</span>
            </Surface>
          );
        })}
      </div>

      <div className={styles.strip}>
        <p className={styles.stripMonths}>{comingUpMonths(days)}</p>
        <div className={styles.stripBar}>
          {days.map((day) => {
            const cell = comingUpCell(day, openBidCents);
            const fill = day.theme ? ({ "--day-ground": getTheme(day.theme).ground } as CSSProperties) : undefined;
            return (
              <Link
                key={toKey(day.md)}
                href={routes.date(day.md)}
                prefetch={false}
                aria-label={cell.label}
                data-claimed={cell.claimed ? "" : undefined}
                className={styles.stripDay}
                style={fill}
              >
                <span className={styles.stripNum}>{day.md.day}</span>
                <span className={styles.stripSub}>{cell.sub}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
