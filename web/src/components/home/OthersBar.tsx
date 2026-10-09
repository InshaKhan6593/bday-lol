import { Avatar, Icon, Surface } from "@/components/ui";
import { getTheme } from "@/config/themes";
import type { MonthDay } from "@/lib/birthday";
import { othersText } from "@/lib/homepage-copy";
import { routes } from "@/lib/routes";
import type { RankedEntry } from "@/server/leaderboard";
import styles from "./home.module.css";

type Props = { count: number; preview: RankedEntry[]; today: MonthDay; dateLabel: string };

/** Links to today's full list. Each avatar uses that person's own ground color. */
export function OthersBar({ count, preview, today, dateLabel }: Props) {
  return (
    <Surface href={routes.date(today)} radius="section" padding="none" className={styles.othersBar}>
      <div className={styles.othersLeft}>
        <div className={styles.avatarStack}>
          {preview.map((person) => (
            <Avatar
              key={person.id}
              name={person.name}
              photoUrl={person.photoUrl}
              color={getTheme(person.theme).ground}
              size="xs"
              className={styles.stacked}
            />
          ))}
        </div>
        <span className={styles.othersText}>{othersText(count, dateLabel)}</span>
      </div>
      <span className={styles.seeAll}>
        See everyone
        <Icon name="arrowRight" size={20} />
      </span>
    </Surface>
  );
}
