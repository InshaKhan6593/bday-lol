import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Short, URL-safe, unguessable id (62^10 ≈ 8×10^17). Used for public entry links. */
export function publicId(length = 10): string {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    const byte = bytes[i]!;
    // Reject bytes that would bias the distribution (256 % 62 != 0).
    if (byte < 248) out += ALPHABET[byte % 62];
  }
  return out.length === length ? out : publicId(length);
}
