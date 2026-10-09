/**
 * The app's single source of "now".
 *
 * In development, DEV_NOW (ISO 8601) pins the clock so we can test midnight
 * rollover, Feb 29 and scheduled emails without waiting for real dates.
 * It is ignored in production.
 */
export function now(): Date {
  const pinned = process.env.NODE_ENV !== "production" ? process.env.DEV_NOW : undefined;
  if (pinned) {
    const date = new Date(pinned);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`DEV_NOW is not a valid date: "${pinned}"`);
    }
    return date;
  }
  return new Date();
}
