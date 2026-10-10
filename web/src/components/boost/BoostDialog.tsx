"use client";

import { Dialog } from "radix-ui";
import { startTransition, useActionState, useState } from "react";
import { EndingSoon } from "@/components/site/EndingSoon";
import { Button, Chip, IconButton, Input, ThemeScope } from "@/components/ui";
import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import { boostResultLine, parseAmountCents, takeTopBoost } from "@/lib/boost";
import { formatUsd } from "@/lib/money";
import { firstName } from "@/lib/people";
import { startBoostCheckout } from "@/server/actions/boost";
import styles from "./BoostDialog.module.css";

export type BoostTarget = {
  publicId: string;
  name: string;
  rank: number;
  totalCents: number;
};

type Props = {
  /** Who is being boosted. null = closed. The caller restores focus in onClose. */
  target: BoostTarget | null;
  /** Viewport top of the box, from boostBoxTop(). */
  top: number;
  onClose: () => void;
  /** Totals of everyone else on the board, highest first. */
  otherTotalsCents: number[];
  topTotalCents: number;
  dateLabel: string;
  /** The page's theme, so the portalled box keeps its colors. */
  theme: ThemeKey;
  settings: Pick<BoardTypeSettings, "boostChipsCents" | "defaultBoostCents" | "minBoostCents">;
  /** The page the box is on ("/" or "/october-7"): Stripe sends the booster back there. */
  returnPath: string;
  /** Today's end, when the person is on today's board: shows "Today ends in 12 min…" near midnight. */
  dayEnd?: { endsAt: string; serverNow: string } | null;
  /** "Boost to take #1 back" email links open the box with this amount filled in. */
  initialAmountCents?: number;
};

/**
 * The Boost box (shared by the homepage and the date page). Anyone can add to
 * anyone's total; payment goes through Stripe Checkout and counts once the
 * webhook confirms it.
 */
export function BoostDialog({ target, onClose, ...rest }: Props) {
  return (
    <Dialog.Root open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {/* Keyed by person so the amounts reset every time the box opens. */}
      {target && <BoostBox key={target.publicId} target={target} onClose={onClose} {...rest} />}
    </Dialog.Root>
  );
}

function BoostBox({
  target,
  top,
  otherTotalsCents,
  topTotalCents,
  dateLabel,
  theme,
  settings,
  returnPath,
  dayEnd,
  initialAmountCents,
}: Props & { target: BoostTarget }) {
  const [chipCents, setChipCents] = useState(settings.defaultBoostCents);
  const [custom, setCustom] = useState(initialAmountCents ? String(Math.round(initialAmountCents / 100)) : "");
  const [alertMe, setAlertMe] = useState(true);
  const [server, sendBoost, sending] = useActionState(startBoostCheckout, {});

  const first = firstName(target.name);
  const customCents = parseAmountCents(custom);
  const amountCents = customCents > 0 ? customCents : chipCents;
  const takeTopCents =
    target.rank > 1 ? takeTopBoost(topTotalCents, target.totalCents, settings.minBoostCents) : null;
  const canPay = amountCents >= settings.minBoostCents;

  function pay() {
    if (!canPay || sending) return;
    const data = new FormData();
    data.set("entry", target.publicId);
    data.set("amount", String(amountCents / 100));
    if (alertMe) data.set("alert", "on");
    data.set("returnPath", returnPath);
    startTransition(() => sendBoost(data));
  }

  return (
    <Dialog.Portal>
      <ThemeScope theme={theme}>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.box} style={{ top }} aria-describedby={undefined}>
          <div className={styles.head}>
            <div className={styles.heading}>
              <Dialog.Title className={styles.title}>Boost {target.name}</Dialog.Title>
              <p className={styles.now}>
                Currently #{target.rank} on {dateLabel} with {formatUsd(target.totalCents)}.
              </p>
            </div>
            <Dialog.Close asChild>
              <IconButton icon="close" label="Close" size="sm" />
            </Dialog.Close>
          </div>

          <div className={styles.chips}>
            {settings.boostChipsCents.map((cents) => (
              <Chip
                key={cents}
                pressed={customCents === 0 && chipCents === cents}
                onClick={() => {
                  setChipCents(cents);
                  setCustom("");
                }}
              >
                {formatUsd(cents)}
              </Chip>
            ))}
          </div>

          {takeTopCents !== null && (
            <Chip tone="accent" block onClick={() => setCustom(String(takeTopCents / 100))}>
              Take #1: +{formatUsd(takeTopCents)}
            </Chip>
          )}

          <Input
            size="md"
            inputMode="decimal"
            aria-label="Other amount"
            placeholder="Other amount"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className={styles.other}
          />

          <div className={styles.result} aria-live="polite">
            {boostResultLine({
              amountCents,
              minBoostCents: settings.minBoostCents,
              firstName: first,
              rank: target.rank,
              totalCents: target.totalCents,
              otherTotalsCents,
            })}
          </div>

          <label className={styles.alert}>
            <input type="checkbox" checked={alertMe} onChange={(e) => setAlertMe(e.target.checked)} />
            Email me if {first} gets passed
          </label>

          {/* Under the minimum, the result line already says "Boosts start at $2." (mockup: no-op). */}
          <Button size="xl" shape="large" block onClick={pay} disabled={sending}>
            {sending ? "Opening checkout…" : `Boost ${formatUsd(amountCents)}`}
          </Button>
          {server.error && (
            <p className={styles.notice} role="alert">
              {server.error}
            </p>
          )}
          {dayEnd && <EndingSoon endsAt={dayEnd.endsAt} serverNow={dayEnd.serverNow} className={styles.notice} />}

          <p className={styles.fine}>
            Boosts are final and add to {first}’s total. They’re paid to mybday.lol, not to {first}. Gifts still go
            straight to them.
          </p>
        </Dialog.Content>
      </ThemeScope>
    </Dialog.Portal>
  );
}
