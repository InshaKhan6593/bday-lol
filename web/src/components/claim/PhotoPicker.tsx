"use client";

import { useEffect, useRef, useState } from "react";
import { Hint, Icon } from "@/components/ui";
import { PHOTO_SIZE, squareCrop } from "@/lib/claim";
import { cx } from "@/lib/cx";
import styles from "./claim.module.css";

export type Photo = { blob: Blob; url: string };

/**
 * Crops a photo to a centered square and shrinks it to 512px in the browser
 * (decided, 07 B7). Re-encoding through a canvas also drops EXIF data, so
 * GPS tags from phone photos never leave the device.
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { x, y, size } = squareCrop(bitmap.width, bitmap.height);
  const out = Math.min(PHOTO_SIZE, size);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, x, y, size, size, 0, 0, out, out);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Encode failed"))), "image/jpeg", 0.86),
  );
}

type Props = {
  photo: Photo | null;
  onChange: (photo: Photo | null) => void;
};

/** The dashed "Add photo" circle. Shows the photo once picked: tap it to change, or × to remove. */
export function PhotoPicker({ photo, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);

  // Free the previous preview URL when the photo changes or the form goes away.
  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo.url);
  }, [photo]);

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await toSquareJpeg(file);
      setError(false);
      onChange({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError(true);
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={styles.photoSlot}>
      <button
        type="button"
        aria-label={photo ? "Change photo" : "Add photo"}
        onClick={() => input.current?.click()}
        className={cx(styles.photoButton, photo && styles.photoButtonFilled, "lift")}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="" className={styles.photoImage} />
        ) : (
          <Icon name="plus" size={24} />
        )}
      </button>
      {photo && (
        <button
          type="button"
          aria-label="Remove photo"
          onClick={() => {
            setError(false);
            onChange(null);
          }}
          className={cx(styles.photoRemove, "lift")}
        >
          <Icon name="close" size={16} />
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void pick(event.target.files?.[0])}
      />
      {error && (
        <Hint tone="error" className={styles.photoError}>
          That photo didn’t work. Try a JPG or PNG.
        </Hint>
      )}
    </div>
  );
}
