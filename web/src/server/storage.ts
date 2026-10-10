import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_PHOTO_BYTES, sniffImage } from "@/lib/checkout";

export class PhotoError extends Error {}

/**
 * Saves a claim photo and returns its public URL. Photos arrive already
 * cropped to 512px by the browser; the server still checks the real file type
 * and size. Locally they go to public/uploads (git-ignored).
 */
export async function savePhoto(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength === 0) throw new PhotoError("That photo is empty.");
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new PhotoError("That photo is too large. Try a smaller one.");
  const ext = sniffImage(bytes);
  if (!ext) throw new PhotoError("Photos must be JPG, PNG or WebP.");

  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver !== "local") {
    // Supabase Storage is wired in the deploy step (11), together with the client's Supabase project.
    throw new Error(`STORAGE_DRIVER "${driver}" is not set up yet.`);
  }
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/${name}`;
}
