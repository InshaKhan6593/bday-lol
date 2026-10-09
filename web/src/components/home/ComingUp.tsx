import Link from "next/link";
import { Surface } from "@/components/ui";
import { formatShort, type MonthDay } from "@/lib/birthday";
import { comingUpCopy } from "@/lib/homepage-copy";
import { routes } from "@/lib/routes";
import type { ComingUpDay } from "@/server/homepage";
import styles from "./home.module.css";

type Props = { days: ComingUpDay[]; today: MonthDay; openBidCents: number };

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
        {days.map((day) => {
          const copy = comingUpCopy(day, openBidCents);
          return (
            <Surface key={formatShort(day.md)} href={routes.date(day.md)} radius="tile" padding="none" className={styles.dayCard}>
              <span className={styles.dayDate}>{formatShort(day.md)}</span>
              <span className={styles.dayOwner}>{copy.owner}</span>
              <span className={styles.dayPrice}>{copy.price}</span>
            </Surface>
          );
        })}
      </div>
    </section>
  );
}
