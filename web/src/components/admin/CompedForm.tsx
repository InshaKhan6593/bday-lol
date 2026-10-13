"use client";

import { Alert, Button, Group, Paper, TextInput } from "@mantine/core";
import { startTransition, useActionState, useRef, useState } from "react";
import type { ThemeKey } from "@/config/themes";
import { compedAmountError, listingFromForm } from "@/lib/admin-listings";
import { formatLong, parseKey } from "@/lib/birthday";
import { parseAmountCents } from "@/lib/boost";
import { validateListing } from "@/lib/claim";
import { formatUsd } from "@/lib/money";
import { adminAddComped, type AdminActionState } from "@/server/actions/admin";
import { PageHead } from "./AdminShell";
import { DateSelect } from "./DateSelect";
import { ListingFields } from "./ListingFields";
import classes from "./admin.module.css";

type Props = {
  limits: { nameMaxLength: number; bioMaxLength: number; maxGiftLinks: number };
  startTheme: ThemeKey;
  rules: { minOpenBidCents: number; minStepCents: number };
  /** Who leads each date's open board right now, keyed "10-07". A date nobody has claimed is missing. */
  leaders: Record<string, { name: string; totalCents: number; count: number }>;
};

/**
 * A free featured spot (spec §10): any date, any amount, no Stripe. It looks like every other listing.
 * Laid out like the site's own Claim form: the date and who leads it first, then the person.
 */
export function CompedForm({ limits, startTheme, rules, leaders }: Props) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(adminAddComped, {});
  const [date, setDate] = useState("");
  // The amount follows the date's minimum until the admin types their own.
  const [typed, setTyped] = useState<string | null>(null);
  // What the form finds wrong itself, before any trip to the server (the same rules, lib/claim.ts).
  const [found, setFound] = useState<AdminActionState["errors"]>(undefined);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setFound(undefined);
  }
  const errors = found ?? state.errors;
  const photo = useRef<Blob | null>(null);
  const md = parseKey(date);
  const leader = md ? leaders[date] : undefined;
  const takesTop = leader ? leader.totalCents + rules.minStepCents : rules.minOpenBidCents;
  const amount = typed ?? String(takesTop / 100);

  return (
    <>
      <PageHead
        title="Add a comped listing"
        lead="A free spot for someone you want on a board. It goes live at once, ranks by the amount you set, and is never counted as revenue."
      />
      <Paper p="xl" maw={640}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            if (!md) return setFound({ date: "Pick a date." });
            const checked = validateListing(listingFromForm(form), limits);
            if (!checked.ok) return setFound(checked.errors);
            const amountError = compedAmountError(parseAmountCents(amount));
            if (amountError) return setFound({ amount: amountError });
            setFound(undefined);
            if (photo.current) form.set("photo", photo.current, "photo.jpg");
            startTransition(() => action(form));
          }}
        >
          {errors?.form && (
            <Alert color="red" variant="light" mb="md" role="alert">
              {errors.form}
            </Alert>
          )}
          <p className={classes.sectionLabel}>Date and amount</p>
          <div className={classes.formStack}>
            <Group align="flex-start" grow>
              <DateSelect value={date} onChange={setDate} error={errors?.date} />
            </Group>
            <div className={classes.leaderBox} aria-live="polite">
              <div>
                <p className={classes.leaderLabel}>{md ? `Current leader · ${formatLong(md)}` : "Current leader"}</p>
                <p className={classes.leaderName}>{!md ? "Pick a date to see" : leader ? leader.name : "Nobody yet"}</p>
                {leader && (
                  <p className={classes.leaderNote}>
                    {leader.count === 1 ? "The only person on this board" : `${leader.count} people on this board`}
                  </p>
                )}
              </div>
              <p className={classes.leaderAmount}>{!md ? "—" : formatUsd(leader?.totalCents ?? 0)}</p>
            </div>
            <TextInput
              name="amount"
              label="Amount"
              description={
                !md
                  ? "Whole dollars."
                  : leader
                    ? `Whole dollars. ${formatUsd(takesTop)} or more takes #1.`
                    : `Whole dollars. Nobody is on this date yet, so any amount is #1.`
              }
              value={amount}
              onChange={(e) => setTyped(e.currentTarget.value.replace(/[^\d]/g, ""))}
              leftSection="$"
              inputMode="numeric"
              error={errors?.amount}
              required
            />
          </div>
          <input type="hidden" name="month" value={md?.month ?? ""} />
          <input type="hidden" name="day" value={md?.day ?? ""} />
          <ListingFields
            initial={{ name: "", bio: "", theme: startTheme, giftLinks: [], isMinor: false, photoUrl: null }}
            errors={errors}
            limits={limits}
            onPhoto={(blob) => (photo.current = blob)}
          />
          <Group justify="flex-end" mt="xl">
            <Button type="submit" loading={pending}>
              Add to the board
            </Button>
          </Group>
        </form>
      </Paper>
    </>
  );
}
