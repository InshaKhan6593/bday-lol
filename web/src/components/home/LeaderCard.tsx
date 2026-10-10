import { ShareButtons } from "@/components/share/ShareButtons";
import { Avatar, Button, Icon, Kicker, Surface } from "@/components/ui";
import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import { giftButtons } from "@/lib/gifts";
import { firstName, stripWrappingQuotes } from "@/lib/people";
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
  dayEnd: { endsAt: string; serverNow: string };
};

/** Homepage #1 card: who owns today, their gift links and share buttons. */
export function LeaderCard({ leader, shareUrl, dateLabel, theme, otherTotalsCents, settings, dayEnd }: Props) {
  const gifts = giftButtons(leader.giftLinks);
  const bio = stripWrappingQuotes(leader.bio);

  return (
    <Surface as="section" radius="hero" elevation="hero" padding="hero" className={styles.heroCard}>
      <div className={styles.owner}>
        <Avatar name={leader.name} photoUrl={leader.photoUrl} size="lg" />
        <div className={styles.ownerText}>
          <h2 className={styles.ownerName}>{leader.name}</h2>
          {/* The mockup quotes the #1's bio. Strip any quotes already in it (older or admin-added entries) so there's one pair. */}
          {bio && <p className={styles.ownerBio}>&quot;{bio}&quot;</p>}
        </div>
        <BoostButton
          // Only public fields cross to the browser (no internal ids).
          target={{ publicId: leader.publicId, name: leader.name, rank: leader.rank, totalCents: leader.totalCents }}
          dayEnd={dayEnd}
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
            <p className={styles.note}>Gifts go straight to them. mybday.lol never touches the money.</p>
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
