function words(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

/**
 * Removes double quote marks wrapped around a bio ("Hi!" → Hi!). The homepage
 * #1 card adds its own pair, so typed quotes would show up doubled. Single
 * quotes stay: "kids' party" or "'90s kid" need their apostrophes.
 */
export function stripWrappingQuotes(text: string): string {
  return text.replace(/^["“”„«»\s]+|["“”„«»\s]+$/g, "");
}

/** "Jess Moreno" → "Jess". */
export function firstName(name: string): string {
  return words(name)[0] ?? name;
}

/** "Marcus Thompson" → "Marcus T." (Coming up cards). Single names stay as they are. */
export function shortName(name: string): string {
  const parts = words(name);
  if (parts.length < 2) return parts[0] ?? name;
  return `${parts[0]} ${parts.at(-1)![0]!.toUpperCase()}.`;
}
