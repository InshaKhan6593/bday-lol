"use server";

import type { Route } from "next";
import { refresh, revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { isValidMonthDay } from "@/lib/birthday";
import { parseAmountCents } from "@/lib/boost";
import { validateListing, type ListingField } from "@/lib/claim";
import { now } from "@/lib/clock";
import { isGiftService, type GiftEntry } from "@/lib/gifts";
import { routes } from "@/lib/routes";
import {
  addCompedEntry,
  setCompedAmount,
  setEntryStatus,
  setFamousHidden,
  updateListing,
  type BoardChange,
} from "../admin";
import { changeEmail, changePassword, isAdmin, requestPasswordReset, resetPassword, signIn, signOut } from "../admin-session";
import { CACHE_TAGS, SAVED_PAGE_ROUTES } from "../cached";
import { getBirthdaySettings } from "../leaderboard";
import { announceBoardChange } from "../live";
import { isEditablePage, pageBodyError, resetSitePage, saveSitePage, EDITABLE_PAGES } from "../site-pages";
import { PhotoError, savePhoto } from "../storage";

/**
 * Everything the admin can do. Each action checks the sign-in itself (an action is a public URL),
 * changes the database through server/admin.ts, then makes the site show it: the saved pages are
 * thrown away and open pages are told to look again, exactly as after a payment.
 */

export type AdminActionState = {
  ok?: boolean;
  /** Shown as a notification. */
  message?: string;
  errors?: Partial<Record<ListingField | "photo" | "amount" | "date" | "form" | "current" | "next" | "email" | "code", string>>;
};

const NOT_SIGNED_IN: AdminActionState = { ok: false, errors: { form: "Your session ended. Sign in again." } };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function giftRows(form: FormData): GiftEntry[] {
  const services = form.getAll("giftService");
  const values = form.getAll("giftValue");
  return services.flatMap((service, i) => {
    const value = values[i];
    return isGiftService(service) && typeof value === "string" ? [{ service, value }] : [];
  });
}

/** A board changed: drop every cached copy that shows it, then tell open pages. */
async function boardChanged(change: BoardChange): Promise<void> {
  revalidateTag(CACHE_TAGS.boards, { expire: 0 });
  revalidatePath("/months/[month]", "page");
  for (const route of SAVED_PAGE_ROUTES) revalidatePath(route, "page");
  await announceBoardChange(change.boardKey);
  // The admin's own screen comes back with this answer: no second trip to reload it.
  refresh();
}

async function uploadedPhoto(form: FormData): Promise<{ url: string | null } | { error: string }> {
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { url: null };
  try {
    return { url: await savePhoto(new Uint8Array(await photo.arrayBuffer())) };
  } catch (error) {
    if (error instanceof PhotoError) return { error: error.message };
    throw error;
  }
}

function listingFrom(form: FormData) {
  return {
    name: text(form, "name"),
    bio: text(form, "bio"),
    giftLinks: giftRows(form),
    theme: text(form, "theme"),
    isMinor: text(form, "isMinor") === "1",
  };
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

export async function adminSignIn(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  const result = await signIn(text(form, "email"), text(form, "password"));
  if (!result.ok) return { ok: false, errors: { form: result.error } };
  redirect(routes.admin.listings);
}

export async function adminSignOut(): Promise<void> {
  await signOut();
  redirect(routes.admin.login);
}

/** "Forgot password?", step 1. The answer is the same whether or not the email is the admin's. */
export async function adminRequestReset(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  await requestPasswordReset(text(form, "email").slice(0, 254));
  return { ok: true };
}

/** Step 2: the emailed code and a new password. Lands on the listings, signed in. */
export async function adminResetPassword(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  const result = await resetPassword({
    email: text(form, "email").slice(0, 254),
    code: text(form, "code").slice(0, 20),
    next: text(form, "next"),
    confirm: text(form, "confirm"),
  });
  if (!result.ok) return { ok: false, errors: { [result.field]: result.error } };
  redirect(routes.admin.listings);
}

export async function adminChangeEmail(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await isAdmin())) return NOT_SIGNED_IN;
  const result = await changeEmail({ current: text(form, "current"), email: text(form, "email").slice(0, 254) });
  if (!result.ok) return { ok: false, errors: { [result.field]: result.error } };
  refresh();
  return { ok: true, message: `Sign-in email changed to ${result.email}.` };
}

export async function adminChangePassword(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await isAdmin())) return NOT_SIGNED_IN;
  const result = await changePassword({ current: text(form, "current"), next: text(form, "next"), confirm: text(form, "confirm") });
  if (!result.ok) return { ok: false, errors: { [result.field]: result.error } };
  return { ok: true, message: "Password changed. Other devices are signed out." };
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export async function adminSetStatus(entryId: string, status: "live" | "removed"): Promise<AdminActionState> {
  if (!(await isAdmin())) return NOT_SIGNED_IN;
  const result = await setEntryStatus(db, entryId, status, now());
  if (!result.ok) return { ok: false, errors: { form: result.error } };
  await boardChanged(result.change);
  return { ok: true, message: status === "removed" ? "Listing taken down." : "Listing is back on the board." };
}

export async function adminSaveListing(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await isAdmin())) return NOT_SIGNED_IN;
  const entryId = text(form, "entryId");
  const { settings } = await getBirthdaySettings(db);
  const checked = validateListing(listingFrom(form), settings);
  if (!checked.ok) return { ok: false, errors: checked.errors };

  // A comped listing's amount is checked before anything is saved, so a bad amount changes nothing.
  const amountText = text(form, "amount");
  const amountCents = amountText ? parseAmountCents(amountText) : null;

  const photo = await uploadedPhoto(form);
  if ("error" in photo) return { ok: false, errors: { photo: photo.error } };
  const photoUrl = photo.url ?? (text(form, "removePhoto") === "1" ? null : undefined);

  const saved = await updateListing(db, entryId, { ...checked.listing, photoUrl });
  if (!saved.ok) return { ok: false, errors: { form: saved.error } };
  if (amountCents !== null) {
    const amount = await setCompedAmount(db, entryId, amountCents, now());
    if (!amount.ok) {
      await boardChanged(saved.change);
      return { ok: false, errors: { amount: amount.error } };
    }
  }
  await boardChanged(saved.change);
  return { ok: true, message: "Listing saved." };
}

export async function adminAddComped(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await isAdmin())) return NOT_SIGNED_IN;
  const md = { month: Number(text(form, "month")), day: Number(text(form, "day")) };
  if (!isValidMonthDay(md)) return { ok: false, errors: { date: "Pick a date." } };
  const type = await getBirthdaySettings(db);
  const checked = validateListing(listingFrom(form), type.settings);
  const amountCents = parseAmountCents(text(form, "amount"));
  if (!checked.ok) return { ok: false, errors: checked.errors };

  const photo = await uploadedPhoto(form);
  if ("error" in photo) return { ok: false, errors: { photo: photo.error } };

  const added = await addCompedEntry(
    db,
    { id: type.typeId, settings: type.settings },
    { md, listing: checked.listing, amountCents, photoUrl: photo.url },
    now(),
  );
  if (!added.ok) return { ok: false, errors: { amount: added.error } };
  await boardChanged(added.change);
  redirect(`${routes.admin.listings}?date=${added.change.boardKey}&added=1` as Route);
}

// ---------------------------------------------------------------------------
// Famous people
// ---------------------------------------------------------------------------

export async function adminSetFamousHidden(source: string, sourceId: string, hidden: boolean): Promise<AdminActionState> {
  if (!(await isAdmin())) return NOT_SIGNED_IN;
  const result = await setFamousHidden(db, { source, sourceId }, hidden);
  if (!result.ok) return { ok: false, errors: { form: result.error } };
  revalidateTag(CACHE_TAGS.famous, { expire: 0 });
  revalidatePath("/months/[month]", "page");
  revalidatePath("/[slug]/~day/[date]", "page");
  refresh();
  return { ok: true, message: hidden ? "Hidden. The next name moves up." : "Showing again." };
}

// ---------------------------------------------------------------------------
// Pages (Terms, Privacy, FAQ)
// ---------------------------------------------------------------------------

export async function adminSavePage(_prev: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await isAdmin())) return NOT_SIGNED_IN;
  const slug = text(form, "slug");
  if (!isEditablePage(slug)) return { ok: false, errors: { form: "Unknown page." } };
  const body = text(form, "body").replace(/\r\n?/g, "\n");
  if (text(form, "reset") === "1") {
    await resetSitePage(db, slug);
  } else {
    const error = pageBodyError(slug, body);
    if (error) return { ok: false, errors: { form: error } };
    await saveSitePage(db, slug, body, now());
  }
  revalidatePath(EDITABLE_PAGES[slug].path);
  refresh();
  return { ok: true, message: text(form, "reset") === "1" ? "Back to the original text." : "Saved. The page is live." };
}
