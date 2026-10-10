"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Avatar, Button, Field, Hint, Input, Kicker, Select, Surface, Textarea, ThemeScope } from "@/components/ui";
import type { BoardTypeSettings } from "@/config/board-types";
import { THEMES, type ThemeKey } from "@/config/themes";
import { DAYS_IN_MONTH, formatLong, MONTHS, toKey, type MonthDay } from "@/lib/birthday";
import { parseAmountCents } from "@/lib/boost";
import {
  bidError,
  bidHint,
  targetBox,
  validateClaim,
  withMonth,
  type ClaimField,
  type ClaimTarget,
} from "@/lib/claim";
import { cx } from "@/lib/cx";
import { giftEntryHint, type GiftEntry } from "@/lib/gifts";
import { formatUsd } from "@/lib/money";
import { routes } from "@/lib/routes";
import { startClaimCheckout } from "@/server/actions/claim";
import { EndingSoon } from "@/components/site/EndingSoon";
import { ColorSwatches } from "./ColorSwatches";
import { GiftAgeInfo } from "./GiftAgeInfo";
import { GiftLinkInputs } from "./GiftLinkInputs";
import { PhotoPicker, type Photo } from "./PhotoPicker";
import styles from "./claim.module.css";

const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: String(i + 1), label }));

/** Days of the picked month (Feb always has 29: a birthday has no year), or 31 before a month is picked. */
function dayOptions(month: number | null) {
  const days = month ? DAYS_IN_MONTH[month - 1]! : 31;
  return Array.from({ length: days }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
}

/** "$" + whole dollars with commas, for the Total line. */
function totalText(digits: string): string {
  return formatUsd(parseAmountCents(digits || "0"));
}

type Props = {
  /** The site header (a server component), rendered inside the page's theme. */
  header: ReactNode;
  /** The site footer (a server component). */
  footer: ReactNode;
  settings: BoardTypeSettings;
  /** Date, target and minimum from the server for the date in the URL. No date: the form starts blank. */
  md: MonthDay | null;
  target: ClaimTarget;
  minCents: number;
  /** Today and when it ends: claiming today shows "Today ends in 12 min…" near midnight (07 B5). */
  dayEnd: { today: MonthDay; endsAt: string; serverNow: string };
};

/**
 * Claim a birthday. The date lives in the URL (?date=october-7&rank=2) and
 * starts blank when there is none: picking both a month and a day replaces the
 * URL, the server sends that date's leader and minimum, and everything else
 * typed so far stays put.
 */
export function ClaimForm({ header, footer, settings, md: serverMd, target, minCents, dayEnd }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Month and day are picked separately; the date exists once both are.
  const [pickedMonth, setPickedMonth] = useState<number | null>(serverMd?.month ?? null);
  const [pickedDay, setPickedDay] = useState<number | null>(serverMd?.day ?? null);
  const md: MonthDay | null = pickedMonth && pickedDay ? { month: pickedMonth, day: pickedDay } : null;
  // The typed bid belongs to one date + rank; a new target starts at its minimum.
  const targetKey = `${serverMd ? toKey(serverMd) : "none"}:${target.rank}`;
  const [typedBid, setTypedBid] = useState<{ key: string; value: string } | null>(null);
  const bid = typedBid?.key === targetKey ? typedBid.value : serverMd ? String(Math.round(minCents / 100)) : "";
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<GiftEntry[]>([{ service: "venmo", value: "" }]);
  const [theme, setTheme] = useState<ThemeKey>(settings.claimTheme ?? "sky");
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const [server, sendClaim, sending] = useActionState(startClaimCheckout, {});

  const loading = pending || (md ? toKey(md) : null) !== (serverMd ? toKey(serverMd) : null);
  const amountCents = parseAmountCents(bid);
  const hasDate = Boolean(md && serverMd);
  // The server re-checks the bid; if someone outbid the leader meanwhile, its message shows until the page catches up.
  const tooLow =
    loading || !hasDate ? null : (bidError(amountCents, minCents, target) ?? server.errors?.bid ?? null);
  const box = hasDate
    ? targetBox(target)
    : { label: "Current leader", name: "Pick a date to see", amount: "—" };
  const hint = hasDate ? bidHint(target, minCents) : null;
  const result = md
    ? validateClaim({ md, bid, name, bio, giftLinks: links, theme, email }, minCents, target, settings)
    : null;
  const errors: Partial<Record<ClaimField, string>> = tried && result && !result.ok ? result.errors : {};
  const nameError = tried && !name.trim() ? "Add a name to continue." : errors.name;

  // A bid error from the server means the leader changed: reload the black box and the minimum.
  useEffect(() => {
    if (server.errors?.bid) router.refresh();
  }, [server, router]);

  function pickDate(month: number | null, day: number | null) {
    setPickedMonth(month);
    setPickedDay(day);
    if (month && day) startTransition(() => router.replace(routes.claim({ month, day }), { scroll: false }));
  }

  /** Sends the claim to the server, which opens Stripe Checkout (or returns errors). */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (!md || !result?.ok || loading || sending) return;
    const data = new FormData();
    data.set("month", String(md.month));
    data.set("day", String(md.day));
    data.set("rank", String(target.rank));
    data.set("bid", bid);
    data.set("name", name);
    data.set("bio", bio);
    for (const row of links) {
      data.append("giftService", row.service);
      data.append("giftValue", row.value);
    }
    data.set("theme", theme);
    data.set("email", email);
    if (photo) data.set("photo", new File([photo.blob], "photo.jpg", { type: photo.blob.type || "image/jpeg" }));
    startTransition(() => sendClaim(data));
  }

  const preview = {
    name: name.trim() || "Your name",
    bio: bio.trim() || "Your one-line bio shows up here.",
  };

  return (
    <ThemeScope theme={theme} paint>
      {header}
      <main className={styles.main}>
        <div className={styles.head}>
          <h1 className={styles.h1}>Claim a birthday</h1>
          <p className={styles.sub}>
            Takes about a minute. Your spot on the birthday board goes live the moment you pay.
          </p>
        </div>

        <div className={styles.columns}>
          <form id="claim-form" noValidate onSubmit={submit} className={styles.form}>
            <section className={cx(styles.section, styles.dateSection)} aria-label="Date and bid">
              <Kicker className={styles.sectionTitle}>Date and bid</Kicker>
              <div className={styles.dateRow}>
                <Field label="Month">
                  <Select
                    name="month"
                    placeholder="Month"
                    options={MONTH_OPTIONS}
                    className={styles.select}
                    value={pickedMonth ? String(pickedMonth) : ""}
                    onValueChange={(v) => {
                      const month = Number(v);
                      const day = pickedDay ? withMonth({ month, day: pickedDay }, month).day : null;
                      pickDate(month, day);
                    }}
                  />
                </Field>
                <Field label="Day">
                  <Select
                    name="day"
                    placeholder="Day"
                    options={dayOptions(pickedMonth)}
                    className={styles.select}
                    value={pickedDay ? String(pickedDay) : ""}
                    onValueChange={(v) => pickDate(pickedMonth, Number(v))}
                  />
                </Field>
              </div>
              {tried && !md && <Hint tone="error">Pick a date to continue.</Hint>}
              <div className={styles.bidRow}>
                <Surface tone="ink" padding="none" aria-live="polite" className={cx(styles.targetBox, loading && md && styles.loading)}>
                  <div className={styles.targetText}>
                    <Kicker tone="accent" className={styles.targetLabel}>
                      {box.label}
                    </Kicker>
                    <span className={styles.targetName}>{box.name}</span>
                  </div>
                  <span className={styles.targetAmount}>{box.amount}</span>
                </Surface>
                <Field
                  label="Your bid"
                  aside={
                    hint ? (
                      <>
                        <span className={styles.mobileOnly}>Bid </span>
                        {hint}
                      </>
                    ) : (
                      "Pick a date to see the minimum bid"
                    )
                  }
                  hint={tooLow}
                  hintTone="error"
                >
                  {/* A fixed $ that can't be deleted; the box takes digits only (handoff v2 §6). */}
                  <span className={styles.money}>
                    <span aria-hidden="true" className={styles.moneySign}>
                      $
                    </span>
                    <Input
                      name="bid"
                      inputMode="numeric"
                      size="2xl"
                      emphasis
                      autoComplete="off"
                      aria-label="Your bid in dollars"
                      placeholder={String(Math.round(settings.minOpenBidCents / 100))}
                      value={bid}
                      aria-invalid={tooLow ? true : undefined}
                      onChange={(event) =>
                        setTypedBid({ key: targetKey, value: event.target.value.replace(/[^0-9]/g, "").slice(0, 7) })
                      }
                      className={styles.bidInput}
                    />
                  </span>
                </Field>
              </div>
            </section>

            <section className={styles.section} aria-label="About the birthday person">
              <Kicker className={styles.sectionTitle}>About the birthday person</Kicker>
              <div className={styles.personRow}>
                <PhotoPicker photo={photo} onChange={setPhoto} error={server.errors?.photo} />
                <Field label="Name" className={styles.nameField}>
                  <Input
                    name="name"
                    autoComplete="name"
                    placeholder="Full name"
                    maxLength={settings.nameMaxLength}
                    value={name}
                    aria-invalid={nameError ? true : undefined}
                    onChange={(event) => setName(event.target.value)}
                    className={cx(nameError && styles.required)}
                  />
                </Field>
              </div>
              <p className={styles.help}>
                Surprising someone? Use their name and photo. For anyone under 18, first name only.
              </p>
              {nameError && (
                <p role="alert" className={styles.requiredText}>
                  {nameError}
                </p>
              )}
              <Field
                label={
                  <span className={styles.labelRow}>
                    One-line bio
                    <span className={styles.counter}>
                      {bio.length} / {settings.bioMaxLength}
                    </span>
                  </span>
                }
                hint={errors.bio}
                hintTone="error"
                className={styles.bioField}
              >
                <Textarea
                  name="bio"
                  rows={2}
                  maxLength={settings.bioMaxLength}
                  placeholder="Example: Turning 30 and still can't cook. Pizza money appreciated."
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  className={styles.bio}
                />
              </Field>
            </section>

            <section className={cx(styles.section, styles.giftSection)} aria-label="Where should gifts go?">
              <div className={styles.groupHead}>
                <span className={styles.groupTitle}>
                  Where should gifts go?
                  <GiftAgeInfo />
                </span>
                <span className={styles.help}>
                  Pick an app, then add your username or wishlist link. We’ll add a gift button to your spot on the
                  board.
                </span>
              </div>
              <GiftLinkInputs rows={links} onChange={setLinks} />
              {/* Each row shows its own app error; this line is for "Add one link per app." and the like. */}
              {errors.giftLinks && !links.some((row) => giftEntryHint(row)?.tone === "error") && (
                <Hint tone="error">{errors.giftLinks}</Hint>
              )}
              <dl className={styles.accepted}>
                <dt>Venmo</dt>
                <dd>your @username</dd>
                <dt>Cash App</dt>
                <dd>your $cashtag</dd>
                <dt>Amazon</dt>
                <dd>your wishlist link</dd>
                <dt>Throne</dt>
                <dd>your username</dd>
                <dd className={styles.acceptedNote}>Full links work too.</dd>
              </dl>
            </section>

            <section className={cx(styles.section, styles.colorSection)} aria-label="Your color">
              <div className={styles.colorHead}>
                <span className={styles.groupTitle}>Your color</span>
                <span className={styles.themeName}>{THEMES[theme].name}</span>
              </div>
              <ColorSwatches value={theme} onChange={setTheme} />
            </section>

            <Field label="Email" aside="For your receipt and outbid alerts. Never shown." hint={errors.email} hintTone="error">
              <Input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          </form>

          <aside className={styles.aside}>
            <div className={styles.preview}>
              <Kicker className={styles.sectionTitle}>Preview</Kicker>
              <Surface radius="section" elevation="section" padding="none" className={styles.previewCard}>
                <div className={styles.previewHead}>
                  <Kicker className={styles.previewKicker}>Today’s birthday belongs to</Kicker>
                  <p className={styles.previewDate}>{md ? formatLong(md) : "Your birthday"}</p>
                </div>
                <div className={styles.previewBody}>
                  <Avatar name={name.trim() || "?"} photoUrl={photo?.url} size="card" />
                  <div className={styles.previewText}>
                    <p className={cx(styles.previewName, !name.trim() && styles.placeholderText)}>{preview.name}</p>
                    <p className={cx(styles.previewBio, !bio.trim() && styles.placeholderText)}>{preview.bio}</p>
                  </div>
                </div>
              </Surface>
            </div>

            <Surface radius="section" padding="none" className={styles.totalCard}>
              <div className={styles.totalLine}>
                <span className={styles.totalLabel}>Total</span>
                <span className={styles.totalAmount}>{totalText(bid)}</span>
              </div>
              <Button
                type="submit"
                form="claim-form"
                size="2xl"
                shape="large"
                block
                disabled={Boolean(tooLow) || (loading && Boolean(md)) || sending}
              >
                {sending ? "Opening checkout…" : "Pay & claim"}
              </Button>
              {md && toKey(md) === toKey(dayEnd.today) && (
                <EndingSoon endsAt={dayEnd.endsAt} serverNow={dayEnd.serverNow} className={styles.formError} />
              )}
              {server.errors?.form && (
                <p role="alert" className={styles.notice}>
                  {server.errors.form}
                </p>
              )}
              {tried && (!md || (result && !result.ok)) && (
                <Hint tone="error" className={styles.formError}>
                  Check the fields marked in red above.
                </Hint>
              )}
              <p className={styles.fine}>
                Bids are final. If someone outbids you, you stay on this day’s birthday board and can still get gifts
                from friends and followers.
              </p>
            </Surface>
          </aside>
        </div>
      </main>
      {footer}
    </ThemeScope>
  );
}
