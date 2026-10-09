import styles from "./home.module.css";

// Homepage wording (How it works has its own, decided 07 A5).
const STEPS = [
  ["Bid on your birthday", "Let everyone know it's your day, and make it easy for them to celebrate you."],
  ["Highest bid owns the homepage", "Until someone claims it with a higher bid. Yes, even on the day itself."],
  ["Get birthday gifts", "Friends and fans send gifts to your Venmo, Cash App, Amazon, or Throne."],
] as const;

export function Steps() {
  return (
    <section className={styles.section} aria-label="How it works">
      <ol className={styles.steps}>
        {STEPS.map(([title, body], i) => (
          <li key={title} className={styles.step}>
            <span className={styles.stepNumber}>{i + 1}</span>
            <span className={styles.stepTitle}>{title}</span>
            <span className={styles.stepBody}>{body}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
