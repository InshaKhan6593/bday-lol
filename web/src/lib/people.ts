function words(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
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
