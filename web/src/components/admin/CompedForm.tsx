"use client";

import { Alert, Button, Group, Paper, TextInput } from "@mantine/core";
import { startTransition, useActionState, useRef, useState } from "react";
import type { ThemeKey } from "@/config/themes";
import { parseKey } from "@/lib/birthday";
import { adminAddComped, type AdminActionState } from "@/server/actions/admin";
import { PageHead } from "./AdminShell";
import { DateSelect } from "./DateSelect";
import { ListingFields } from "./ListingFields";
import classes from "./admin.module.css";

type Props = {
  limits: { nameMaxLength: number; bioMaxLength: number };
  startTheme: ThemeKey;
  /** The smallest amount a listing can have on an empty board, as a starting value. */
  openBidCents: number;
};

/** A free featured spot (spec §10): any date, any amount, no Stripe. It looks like every other listing. */
export function CompedForm({ limits, startTheme, openBidCents }: Props) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(adminAddComped, {});
  const [date, setDate] = useState("");
  const photo = useRef<Blob | null>(null);
  const md = parseKey(date);

  return (
    <>
      <PageHead
        title="Add a comped listing"
        lead="A free spot for someone you want on a board. It goes live at once, ranks by the amount you set, and is never counted as revenue."
      />
      <Paper p="xl" maw={760}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            if (photo.current) form.set("photo", photo.current, "photo.jpg");
            startTransition(() => action(form));
          }}
        >
          {state.errors?.form && (
            <Alert color="red" variant="light" mb="md" role="alert">
              {state.errors.form}
            </Alert>
          )}
          <div className={classes.formGrid} style={{ marginBottom: "var(--space-lg)" }}>
            <Group align="flex-end" grow>
              <DateSelect value={date} onChange={setDate} error={state.errors?.date} />
            </Group>
            <TextInput
              name="amount"
              label="Amount"
              description="Whole dollars. To take #1, set it above the current top total."
              defaultValue={String(openBidCents / 100)}
              leftSection="$"
              inputMode="numeric"
              error={state.errors?.amount}
              required
            />
          </div>
          <input type="hidden" name="month" value={md?.month ?? ""} />
          <input type="hidden" name="day" value={md?.day ?? ""} />
          <ListingFields
            initial={{ name: "", bio: "", theme: startTheme, giftLinks: [], isMinor: false, photoUrl: null }}
            errors={state.errors}
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
