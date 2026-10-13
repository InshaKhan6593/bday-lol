import Link from "next/link";
import type { CSSProperties } from "react";
import { getTheme } from "@/config/themes";
import { toKey, type MonthDay } from "@/lib/birthday";
import { COMING_UP_NARROW_DAYS, comingUpCell, comingUpMonths, comingUpTipSide } from "@/lib/homepage-copy";
import { routes } from "@/lib/routes";
import type { ComingUpDay } from "@/server/homepage";
import styles from "./home.module.css";

type Props = { days: ComingUpDay[]; today: MonthDay; openBidCents: number };

/**
 * The days ahead as one strip: a bar cut into dates, each with its top bid under
 * it, a claimed date filled with its #1's color. Two weeks on a wide screen,
 * the first week on a phone.
 */
export function ComingUp({ days, today, openBidCents }: Props) {
  const wideMonths = comingUpMonths(days);
  const narrowMonths = comingUpMonths(days.slice(0, COMING_UP_NARROW_DAYS));
  // A narrow window shows the first week only, and that week has its own ends.
  const week = Math.min(days.length, COMING_UP_NARROW_DAYS);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.h2}>Coming up</h2>
        <Link href={routes.date(today)} className={styles.headLink}>
          Find your birthday
        </Link>
      </div>
      <div className={styles.strip}>
        <p className={styles.stripMonths}>
          <span className={styles.stripWide}>{wideMonths}</span>
          <span className={styles.stripNarrow}>{narrowMonths}</span>
        </p>
        <div className={styles.stripBar}>
          {days.map((day, i) => {
            const cell = comingUpCell(day, openBidCents);
            const fill = day.theme ? ({ "--day-ground": getTheme(day.theme).ground } as CSSProperties) : undefined;
            return (
              <Link
                key={toKey(day.md)}
                href={routes.date(day.md)}
                prefetch={false}
                aria-label={cell.label}
                data-claimed={cell.claimed ? "" : undefined}
                data-later={i >= COMING_UP_NARROW_DAYS ? "" : undefined}
                data-tip={comingUpTipSide(i, days.length)}
                data-tip-week={i < week ? comingUpTipSide(i, week) : undefined}
                className={styles.stripDay}
                style={fill}
              >
                <span className={styles.stripNum}>{day.md.day}</span>
                <span className={styles.stripSub}>{cell.sub}</span>
                <span className={styles.stripTip} aria-hidden="true">
                  {cell.tip}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
