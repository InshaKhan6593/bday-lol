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
import { formatUsd } from "@/lib/money";
import { routes } from "@/lib/routes";
import { startClaimCheckout } from "@/server/actions/claim";
import { EndingSoon } from "@/components/site/EndingSoon";
import { ColorSwatches } from "./ColorSwatches";
import { GiftLinkInputs } from "./GiftLinkInputs";
import { PhotoPicker, type Photo } from "./PhotoPicker";
import styles from "./claim.module.css";

const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: String(i + 1), label }));

function dayOptions(month: number) {
  return Array.from({ length: DAYS_IN_MONTH[month - 1]! }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
}

type Props = {
  /** The site header (a server component), rendered inside the page's theme. */
  header: ReactNode;
  /** The site footer (a server component). */
  footer: ReactNode;
  settings: BoardTypeSettings;
  /** Date, target and minimum from the server for the date in the URL. */
  md: MonthDay;
  target: ClaimTarget;
  minCents: number;
  /** Today and when it ends: claiming today shows "Today ends in 12 min…" near midnight (07 B5). */
  dayEnd: { today: MonthDay; endsAt: string; serverNow: string };
};

/**
 * Claim a birthday. The date lives in the URL (?date=october-7&rank=2): picking
 * another month or day replaces the URL, the server sends that date's leader
 * and minimum, and everything else typed so far stays put.
 */
export function ClaimForm({ header, footer, settings, md: serverMd, target, minCents, dayEnd }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [md, setMd] = useState(serverMd);
  // The typed bid belongs to one date + rank; a new target starts at its minimum.
  const targetKey = `${toKey(serverMd)}:${target.rank}`;
  const [typedBid, setTypedBid] = useState<{ key: string; value: string } | null>(null);
  const bid = typedBid?.key === targetKey ? typedBid.value : formatUsd(minCents);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState([""]);
  const [theme, setTheme] = useState<ThemeKey>(settings.defaultTheme);
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const [server, sendClaim, sending] = useActionState(startClaimCheckout, {});

  const loading = pending || toKey(md) !== toKey(serverMd);
  const amountCents = parseAmountCents(bid);
  // The server re-checks the bid; if someone outbid the leader meanwhile, its message shows until the page catches up.
  const tooLow = loading ? null : (bidError(amountCents, minCents, target) ?? server.errors?.bid ?? null);
  const box = targetBox(target);
  const hint = bidHint(target, minCents);
  const result = validateClaim({ md, bid, name, bio, giftLinks: links, theme, email }, minCents, target, settings);
  const errors: Partial<Record<ClaimField, string>> = tried && !result.ok ? result.errors : {};

  // A bid error from the server means the leader changed: reload the black box and the minimum.
  useEffect(() => {
    if (server.errors?.bid) router.refresh();
  }, [server, router]);

  function pickDate(next: MonthDay) {
    setMd(next);
    startTransition(() => router.replace(routes.claim(next), { scroll: false }));
  }

  /** Sends the claim to the server, which opens Stripe Checkout (or returns errors). */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTried(true);
    if (!result.ok || loading || sending) return;
    const data = new FormData();
    data.set("month", String(md.month));
    data.set("day", String(md.day));
    data.set("rank", String(target.rank));
    data.set("bid", bid);
    data.set("name", name);
    data.set("bio", bio);
    for (const link of links) data.append("giftLink", link);
    data.set("theme", theme);
    data.set("email", email);
    if (photo) data.set("photo", new File([photo.blob], "photo.jpg", { type: photo.blob.type || "image/jpeg" }));
    startTransition(() => sendClaim(data));
  }

  const preview = {
    name: name.trim() || "Your name",
    bio: bio.trim() || "Your one-line bio",
  };

  return (
    <ThemeScope theme={theme} paint>
      {header}
      <main className={styles.main}>
        <div className={styles.head}>
          <h1 className={styles.h1}>Claim a birthday</h1>
          <p className={styles.sub}>Takes about a minute. Your page goes live the moment you pay.</p>
        </div>

        <div className={styles.columns}>
          <form id="claim-form" noValidate onSubmit={submit} className={styles.form}>
            <section className={cx(styles.section, styles.dateSection)} aria-label="Date and bid">
              <Kicker className={styles.sectionTitle}>Date and bid</Kicker>
              <div className={styles.dateRow}>
                <Field label="Month">
                  <Select
                    name="month"
                    options={MONTH_OPTIONS}
                    className={styles.select}
                    value={String(md.month)}
                    onValueChange={(v) => pickDate(withMonth(md, Number(v)))}
                  />
                </Field>
                <Field label="Day">
                  <Select
                    name="day"
                    options={dayOptions(md.month)}
                    className={styles.select}
                    value={String(md.day)}
                    onValueChange={(v) => pickDate({ month: md.month, day: Number(v) })}
                  />
                </Field>
              </div>
              <div className={styles.bidRow}>
                <Surface tone="ink" padding="none" aria-live="polite" className={cx(styles.targetBox, loading && styles.loading)}>
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
                    <>
                      <span className={styles.mobileOnly}>Bid </span>
                      {hint}
                    </>
                  }
                  hint={tooLow}
                  hintTone="error"
                >
                  <Input
                    name="bid"
                    inputMode="decimal"
                    size="2xl"
                    emphasis
                    autoComplete="off"
                    value={bid}
                    aria-invalid={tooLow ? true : undefined}
                    onChange={(event) => setTypedBid({ key: targetKey, value: event.target.value })}
                    onBlur={() => amountCents > 0 && setTypedBid({ key: targetKey, value: formatUsd(amountCents) })}
                    className={styles.bidInput}
                  />
                </Field>
              </div>
            </section>

            <section className={styles.section} aria-label="About the birthday person">
              <Kicker className={styles.sectionTitle}>About the birthday person</Kicker>
              <div className={styles.personRow}>
                <PhotoPicker photo={photo} onChange={setPhoto} error={server.errors?.photo} />
                <Field label="Name" hint={errors.name} hintTone="error" className={styles.nameField}>
                  <Input
                    name="name"
                    autoComplete="name"
                    maxLength={settings.nameMaxLength}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
              </div>
              <p className={styles.help}>Surprising someone on their birthday? Use their name and photo.</p>
              <Field label="One-line bio" hint={errors.bio} hintTone="error">
                <Textarea
                  name="bio"
                  rows={2}
                  maxLength={settings.bioMaxLength}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  className={styles.bio}
                />
                <span className={styles.counter}>
                  {bio.length} / {settings.bioMaxLength}
                </span>
              </Field>
            </section>

            <section className={cx(styles.section, styles.giftSection)} aria-label="Where should gifts go?">
              <div className={styles.groupHead}>
                <span className={styles.groupTitle}>Where should gifts go?</span>
                <span className={styles.help}>Paste a link and we’ll turn it into a gift button on your page.</span>
              </div>
              <GiftLinkInputs links={links} max={settings.maxGiftLinks} onChange={setLinks} />
              <p className={styles.accepted}>
                Accepted: venmo.com/u/username, cash.app/$cashtag, your Amazon wishlist link (amazon.com/hz/wishlist/…),
                or throne.com/username.
              </p>
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
                  <p className={styles.previewDate}>{formatLong(md)}</p>
                </div>
                <div className={styles.previewBody}>
                  <Avatar name={name} photoUrl={photo?.url} size="card" />
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
                <span className={styles.totalAmount}>{formatUsd(amountCents)}</span>
              </div>
              <Button
                type="submit"
                form="claim-form"
                size="2xl"
                shape="large"
                block
                disabled={Boolean(tooLow) || loading || sending}
              >
                {sending ? "Opening checkout…" : "Pay & claim"}
              </Button>
              {toKey(md) === toKey(dayEnd.today) && (
                <EndingSoon endsAt={dayEnd.endsAt} serverNow={dayEnd.serverNow} className={styles.formError} />
              )}
              {server.errors?.form && (
                <p role="alert" className={styles.notice}>
                  {server.errors.form}
                </p>
              )}
              {tried && !result.ok && (
                <Hint tone="error" className={styles.formError}>
                  Check the fields marked in red above.
                </Hint>
              )}
              <p className={styles.fine}>
                Bids are final. If someone outbids you, you stay on this day’s birthday list and can still get gifts.
              </p>
            </Surface>
          </aside>
        </div>
      </main>
      {footer}
    </ThemeScope>
  );
}
