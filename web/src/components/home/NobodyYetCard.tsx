import { InviteButtons } from "@/components/share/ShareButtons";
import { Avatar, Surface } from "@/components/ui";
import styles from "./home.module.css";

/** Replaces the #1 card when nobody has bid on today yet. */
export function NobodyYetCard({ shareUrl }: { shareUrl: string }) {
  return (
    <Surface as="section" radius="hero" elevation="hero" padding="hero" className={styles.heroCard}>
      <div className={styles.owner}>
        <Avatar placeholder size="lg" />
        <div className={styles.ownerText}>
          <h2 className={styles.ownerName}>Nobody yet.</h2>
          <p className={styles.ownerBio}>Today is wide open. The highest bid gets the homepage.</p>
        </div>
      </div>

      <Surface tone="ground" className={styles.invite}>
        <div className={styles.inviteText}>
          <h3 className={styles.panelTitle}>Know someone born today?</h3>
          <p className={styles.inviteSub}>Send them the link so they can claim it first.</p>
        </div>
        <InviteButtons
          url={shareUrl}
          message="Is today your birthday? Claim it on bday.lol"
          className={styles.inviteActions}
        />
      </Surface>
    </Surface>
  );
}
