import { Avatar, Kicker, ThemeScope } from "@/components/ui";
import type { ThemeKey } from "@/config/themes";
import { formatLong, type MonthDay } from "@/lib/birthday";
import { firstName } from "@/lib/people";
import { birthdayShareText } from "@/lib/share";
import styles from "./LinkCard.module.css";

type Props = {
  md: MonthDay;
  /** The person the date's link shows: its #1. */
  person: { name: string; photoUrl: string | null; theme: ThemeKey };
  /** "TODAY'S BIRTHDAY" / "TOP BID". */
  kicker: string;
  /** Shown under the card, e.g. "mybday.lol/october-7". */
  displayUrl: string;
};

/**
 * How a date's link looks when shared: the 1.91:1 card in the person's colors,
 * then the title and URL underneath (SuccessDesktop.dc.html). The OG image
 * (SEO step) draws the same card.
 */
export function LinkCard({ md, person, kicker, displayUrl }: Props) {
  return (
    <ThemeScope theme={person.theme} className={styles.card}>
      <div className={styles.image}>
        <Avatar name={person.name} photoUrl={person.photoUrl} className={styles.avatar} />
        <div className={styles.text}>
          <Kicker className={styles.kicker}>{kicker}</Kicker>
          <p className={styles.date}>{formatLong(md)}</p>
          <p className={styles.name}>{person.name}</p>
        </div>
      </div>
      <div className={styles.footer}>
        <p className={styles.title}>{birthdayShareText(firstName(person.name))}</p>
        <p className={styles.url}>{displayUrl}</p>
      </div>
    </ThemeScope>
  );
}
