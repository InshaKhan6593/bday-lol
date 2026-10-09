import { Button, Kicker, Surface } from "@/components/ui";
import type { MonthDay } from "@/lib/birthday";
import { formatUsd } from "@/lib/money";
import { routes } from "@/lib/routes";
import { Countdown } from "./Countdown";
import styles from "./home.module.css";

type Props = {
  empty: boolean;
  today: MonthDay;
  /** Top total + $1, or the opening bid when empty. */
  ownPriceCents: number;
  dayEndsAt: string;
  serverNow: string;
};

/** Black "Claim the top spot" bar with the price to own today and the countdown. */
export function ClaimBar({ empty, today, ownPriceCents, dayEndsAt, serverNow }: Props) {
  return (
    <Surface tone="ink" radius="section" padding="none" className={styles.claimBar}>
      <div className={styles.claimPrice}>
        <Kicker tone="accent">{empty ? "Is today your birthday?" : "Is today your birthday too?"}</Kicker>
        <p className={styles.ownLine}>
          Own today for<span className={styles.ownPrice}>{formatUsd(ownPriceCents)}</span>
        </p>
      </div>
      <div className={styles.claimTimer}>
        <Kicker tone="muted">Day ends in</Kicker>
        <Countdown endsAt={dayEndsAt} serverNow={serverNow} className={styles.countdown} />
      </div>
      <Button href={routes.claim(today)} variant="accent" size="2xl" shape="large" className={styles.claimCta}>
        {empty ? "Claim today first" : "Claim the top spot"}
      </Button>
    </Surface>
  );
}
