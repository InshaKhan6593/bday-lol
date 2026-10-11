import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_PHOTO_BYTES, sniffImage } from "@/lib/checkout";

export class PhotoError extends Error {}

const CONTENT_TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

/**
 * Saves a claim photo and returns its public URL. Photos arrive already
 * cropped to 512px by the browser; the server still checks the real file type
 * and size. Locally they go to public/uploads (git-ignored), in production to
 * a public Supabase Storage bucket.
 */
export async function savePhoto(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength === 0) throw new PhotoError("That photo is empty.");
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new PhotoError("That photo is too large. Try a smaller one.");
  const ext = sniffImage(bytes);
  if (!ext) throw new PhotoError("Photos must be JPG, PNG or WebP.");

  const name = `${randomUUID()}.${ext}`;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "supabase") return saveToSupabase(name, bytes, CONTENT_TYPES[ext]);
  if (driver !== "local") throw new Error(`STORAGE_DRIVER "${driver}" is not supported.`);

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/${name}`;
}

/**
 * Uploads through Supabase Storage's REST API with the service-role key (server only), so the bucket
 * needs no upload policy. The bucket must be public: the returned URL is read by browsers and email clients.
 */
async function saveToSupabase(name: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const base = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "photos";
  if (!base || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed for STORAGE_DRIVER=supabase.");

  const res = await fetch(`${base}/storage/v1/object/${bucket}/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": contentType,
      // File names are random and never reused, so a year is safe.
      "Cache-Control": "max-age=31536000",
    },
    body: Buffer.from(bytes),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Supabase Storage upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return `${base}/storage/v1/object/public/${bucket}/${name}`;
}
