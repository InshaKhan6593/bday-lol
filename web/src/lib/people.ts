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

/** How a name is saved: trimmed, with runs of spaces collapsed ("  Sam   Rivera " → "Sam Rivera"). */
export function cleanName(name: string): string {
  return words(name).join(" ");
}

/**
 * The name used in "Outrank Isla for $6", "Boost Isla", "It's Isla's birthday"
 * (handoff v2 §14): the first word, so "Mary-Catherine Lee" → "Mary-Catherine".
 * A first word that is a single letter or ends in a period ("J.", "Dr.") isn't
 * a first name, so the full name is used instead.
 */
export function firstName(name: string): string {
  const parts = words(name);
  const first = parts[0];
  if (!first) return name.trim();
  if (parts.length > 1 && (first.length < 2 || first.endsWith("."))) return parts.join(" ");
  return first;
}

/** "Marcus Thompson" → "Marcus T." (Coming up cards). Single names stay as they are. */
export function shortName(name: string): string {
  const parts = words(name);
  if (parts.length < 2) return parts[0] ?? name;
  return `${parts[0]} ${parts.at(-1)![0]!.toUpperCase()}.`;
}

/**
 * The name part of a personal link (handoff v2 §14): mybday.lol/october-7/lucia-gomez.
 * Accents and symbols are stripped; a name with nothing usable left becomes "birthday".
 */
export function personSlug(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || "birthday";
}

/** Two people with the same name on one date get -2, -3… ("sam-rivera", "sam-rivera-2"). */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}
