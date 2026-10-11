"use client";

import { Button, Checkbox, FileInput, Text, TextInput, Textarea } from "@mantine/core";
import { useEffect, useState } from "react";
import { toSquareJpeg } from "@/components/claim/PhotoPicker";
import { THEMES, THEME_KEYS, type ThemeKey } from "@/config/themes";
import type { GiftLink } from "@/db/schema";
import { GIFT_ENTRY, GIFT_SERVICES, GIFT_SERVICE_ORDER } from "@/lib/gifts";
import { initials } from "@/lib/people";
import type { AdminActionState } from "@/server/actions/admin";
import classes from "./admin.module.css";

export type ListingValues = {
  name: string;
  bio: string;
  theme: ThemeKey;
  giftLinks: GiftLink[];
  isMinor: boolean;
  photoUrl: string | null;
};

type Props = {
  initial: ListingValues;
  errors: AdminActionState["errors"];
  limits: { nameMaxLength: number; bioMaxLength: number };
  /** The cropped photo to send, kept by the form that owns the submit. */
  onPhoto: (photo: Blob | null) => void;
};

/**
 * The fields every listing has, for editing one and for adding a comped one: name, bio, photo, color,
 * child flag and gift links. Same rules as the Claim page (lib/claim.ts checks them on the server).
 */
export function ListingFields({ initial, errors, limits, onPhoto }: Props) {
  const [name, setName] = useState(initial.name);
  const [bio, setBio] = useState(initial.bio);
  const [theme, setTheme] = useState<ThemeKey>(initial.theme);
  const [isMinor, setIsMinor] = useState(initial.isMinor);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function pick(file: File | null) {
    setPhotoError(null);
    if (!file) {
      onPhoto(null);
      setPreview(null);
      return;
    }
    try {
      // Cropped to a square and shrunk in the browser, like on the Claim page: this also drops GPS data.
      const blob = await toSquareJpeg(file);
      onPhoto(blob);
      setPreview(URL.createObjectURL(blob));
      setRemovePhoto(false);
    } catch {
      setPhotoError("That photo couldn’t be read. Try a JPG or PNG.");
    }
  }

  const shownPhoto = preview ?? (removePhoto ? null : initial.photoUrl);
  const ground = THEMES[theme].ground;

  return (
    <div className={classes.formGrid}>
      <TextInput
        name="name"
        label="Name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        maxLength={limits.nameMaxLength}
        error={errors?.name}
        description={isMinor ? "First name only for anyone under 18." : undefined}
        required
      />
      <div>
        <Text className={classes.label} component="p">
          Photo
        </Text>
        <div className={classes.photoRow}>
          {shownPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- a preview of a local or stored photo
            <img src={shownPhoto} alt="" className={`${classes.avatar} ${classes.photoPreview}`} />
          ) : (
            <span className={`${classes.avatar} ${classes.photoPreview}`} style={{ background: ground }}>
              {initials(name || "?")}
            </span>
          )}
          <FileInput
            placeholder={shownPhoto ? "Replace photo" : "Add photo"}
            accept="image/jpeg,image/png,image/webp"
            onChange={pick}
            clearable
            error={photoError ?? errors?.photo}
            style={{ flex: 1 }}
          />
          {initial.photoUrl && !preview && (
            <Button variant="default" size="xs" onClick={() => setRemovePhoto((v) => !v)}>
              {removePhoto ? "Keep" : "Remove"}
            </Button>
          )}
        </div>
        <input type="hidden" name="removePhoto" value={removePhoto ? "1" : ""} />
      </div>

      <Textarea
        className={classes.formWide}
        name="bio"
        label="One-line bio"
        value={bio}
        onChange={(e) => setBio(e.currentTarget.value)}
        maxLength={limits.bioMaxLength}
        description={`${bio.length} / ${limits.bioMaxLength}`}
        error={errors?.bio}
        autosize
        minRows={1}
      />

      <div className={classes.formWide}>
        <Text className={classes.label} component="p">
          Color: {THEMES[theme].name}
        </Text>
        <div className={classes.swatches}>
          {THEME_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={classes.swatch}
              style={{ background: THEMES[key].ground }}
              aria-label={THEMES[key].name}
              aria-pressed={key === theme}
              onClick={() => setTheme(key)}
            />
          ))}
        </div>
        <input type="hidden" name="theme" value={theme} />
        {errors?.theme && <Text className={classes.error}>{errors.theme}</Text>}
      </div>

      <Checkbox
        className={classes.formWide}
        label="This is a child (under 18): first name only, no gift links"
        checked={isMinor}
        onChange={(e) => setIsMinor(e.currentTarget.checked)}
      />
      <input type="hidden" name="isMinor" value={isMinor ? "1" : ""} />

      {GIFT_SERVICE_ORDER.map((service) => {
        const link = initial.giftLinks.find((l) => l.service === service);
        return (
          <div key={service}>
            <input type="hidden" name="giftService" value={service} />
            <TextInput
              name="giftValue"
              label={GIFT_SERVICES[service].short}
              // Remounted when the child box changes, so a hidden link is not sent along.
              key={isMinor ? "locked" : "open"}
              defaultValue={isMinor ? "" : (link?.url ?? "")}
              placeholder={GIFT_ENTRY[service].placeholder}
              disabled={isMinor}
            />
          </div>
        );
      })}
      {errors?.giftLinks && <Text className={`${classes.error} ${classes.formWide}`}>{errors.giftLinks}</Text>}
    </div>
  );
}
