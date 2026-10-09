"use client";

import { Dialog } from "radix-ui";
import { useState } from "react";
import { Button, Chip, IconButton, Input, ThemeScope } from "@/components/ui";
import type { BoardTypeSettings } from "@/config/board-types";
import type { ThemeKey } from "@/config/themes";
import { boostResultLine, parseAmountCents, takeTopBoost } from "@/lib/boost";
import { formatUsd } from "@/lib/money";
import { firstName } from "@/lib/people";
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
};

/**
 * The Boost box (shared by the homepage and the date page). Anyone can add to
 * anyone's total. Payment goes through Stripe Checkout (connected in the money step).
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
}: Props & { target: BoostTarget }) {
  const [chipCents, setChipCents] = useState(settings.defaultBoostCents);
  const [custom, setCustom] = useState("");
  const [alertMe, setAlertMe] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const first = firstName(target.name);
  const customCents = parseAmountCents(custom);
  const amountCents = customCents > 0 ? customCents : chipCents;
  const takeTopCents =
    target.rank > 1 ? takeTopBoost(topTotalCents, target.totalCents, settings.minBoostCents) : null;
  const canPay = amountCents >= settings.minBoostCents;

  function pay() {
    if (!canPay) return;
    // Stripe Checkout is wired up in build step 6 (money path).
    setNotice("Payments aren't connected yet. Checkout comes in the next build step.");
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
          <Button size="xl" shape="large" block onClick={pay}>
            Boost {formatUsd(amountCents)}
          </Button>
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}

          <p className={styles.fine}>
            Boosts are final and add to {first}’s total. They’re paid to bday.lol, not to {first}. Gifts still go
            straight to them.
          </p>
        </Dialog.Content>
      </ThemeScope>
    </Dialog.Portal>
  );
}
