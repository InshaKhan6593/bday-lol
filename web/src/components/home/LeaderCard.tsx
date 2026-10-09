import { ShareButtons } from "@/components/share/ShareButtons";
import { Avatar, Button, Icon, Kicker, Surface } from "@/components/ui";
import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import { giftButtons } from "@/lib/gifts";
import { firstName } from "@/lib/people";
import { displayUrl } from "@/lib/routes";
import { birthdayShareText } from "@/lib/share";
import type { RankedEntry } from "@/server/leaderboard";
import { BoostButton } from "./BoostButton";
import styles from "./home.module.css";

type Props = {
  leader: RankedEntry;
  shareUrl: string;
  dateLabel: string;
  theme: ThemeKey;
  otherTotalsCents: number[];
  settings: BoardTypeSettings;
};

/** Homepage #1 card: who owns today, their gift links and share buttons. */
export function LeaderCard({ leader, shareUrl, dateLabel, theme, otherTotalsCents, settings }: Props) {
  const gifts = giftButtons(leader.giftLinks);

  return (
    <Surface as="section" radius="hero" elevation="hero" padding="hero" className={styles.heroCard}>
      <div className={styles.owner}>
        <Avatar name={leader.name} photoUrl={leader.photoUrl} size="lg" />
        <div className={styles.ownerText}>
          <h2 className={styles.ownerName}>{leader.name}</h2>
          {leader.bio && <p className={styles.ownerBio}>&quot;{leader.bio}&quot;</p>}
        </div>
        <BoostButton
          target={leader}
          otherTotalsCents={otherTotalsCents}
          dateLabel={dateLabel}
          theme={theme}
          settings={settings}
          className={styles.boost}
        />
      </div>

      <div className={styles.panels}>
        {gifts.length > 0 && (
          <Surface tone="ground" className={styles.giftPanel}>
            <h3 className={styles.panelTitle}>Send a birthday gift</h3>
            <div className={styles.giftGrid}>
              {gifts.map((gift) => (
                <Button
                  key={gift.url}
                  external
                  href={gift.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="xl"
                  className={styles.giftButton}
                  iconEnd={<Icon name="arrowUpRight" size={20} />}
                >
                  {gift.label}
                </Button>
              ))}
            </div>
            <p className={styles.note}>Gifts go straight to them. bday.lol never touches the money.</p>
          </Surface>
        )}

        <Surface tone="none" className={styles.sharePanel}>
          <div className={styles.shareHead}>
            <Kicker as="h3">Share this birthday</Kicker>
            <span className={styles.shareUrl}>{displayUrl(shareUrl)}</span>
          </div>
          <ShareButtons url={shareUrl} message={birthdayShareText(firstName(leader.name))} />
        </Surface>
      </div>
    </Surface>
  );
}
