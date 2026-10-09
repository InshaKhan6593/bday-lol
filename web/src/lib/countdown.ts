/** "11:40:52". Hours are not capped at 24 and never go below zero. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** The last stretch of a day when payers are warned to finish before midnight (07 B5). */
export const ENDING_SOON_MS = 30 * 60 * 1000;

/**
 * "Today ends in 12 min. Finish paying before midnight ET." in the last 30
 * minutes of today, so few payments cross midnight. Null otherwise.
 */
export function endingSoonText(msLeft: number): string | null {
  if (msLeft <= 0 || msLeft > ENDING_SOON_MS) return null;
  const minutes = Math.ceil(msLeft / 60_000);
  const left = minutes <= 1 ? "less than a minute" : `${minutes} min`;
  return `Today ends in ${left}. Finish paying before midnight ET.`;
}
