/** Share targets for a page URL. Kept pure so they can be tested. */

export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/** Opens the phone's messages app with the text filled in. "?&body=" works on iOS and Android. */
export function smsShareUrl(message: string, url: string): string {
  return `sms:?&body=${encodeURIComponent(`${message} ${url}`)}`;
}

/** "It's Jess's birthday on mybday.lol" (copy from the OG card). */
export function birthdayShareText(firstName: string): string {
  return `It's ${firstName}'s birthday on mybday.lol`;
}
