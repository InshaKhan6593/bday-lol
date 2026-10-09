"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Button, Field, Input, Select, Surface } from "@/components/ui";
import { DAYS_IN_MONTH, MONTHS } from "@/lib/birthday";
import { cx } from "@/lib/cx";
import { subscribeReminder } from "@/server/actions/reminders";
import type { ReminderState } from "@/server/reminders";
import styles from "./home.module.css";

const MONTH_OPTIONS = MONTHS.map((label, i) => ({ value: String(i + 1), label }));

function dayOptions(month: string) {
  // No month yet: offer 31 days. February always has 29 (birthdays have no year).
  const count = month ? DAYS_IN_MONTH[Number(month) - 1]! : 31;
  return Array.from({ length: count }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
}

/** "Not your birthday today?" signup: one email a year, a week before. */
export function ReminderSignup() {
  const [state, action, pending] = useActionState<ReminderState, FormData>(subscribeReminder, { status: "idle" });
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");

  // Submit by hand: a plain form action resets every field afterwards, which
  // would wipe the date when only the email needs fixing.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  function pickMonth(value: string) {
    setMonth(value);
    // Keep the day only if the new month has it (e.g. 31 → April).
    if (day && Number(day) > DAYS_IN_MONTH[Number(value) - 1]!) setDay("");
  }

  return (
    <Surface as="section" radius="section" elevation="section" padding="lg" className={styles.reminder}>
      <div className={styles.reminderHead}>
        <h2 className={styles.reminderTitle}>Not your birthday today?</h2>
        <p className={styles.reminderSub}>We&apos;ll email you a week before yours, so you can claim it first.</p>
      </div>

      <form onSubmit={submit} className={styles.reminderForm}>
        <Field label="Month" className={cx(styles.formField, styles.monthField)}>
          <Select name="month" options={MONTH_OPTIONS} placeholder="Select" value={month} onValueChange={pickMonth} />
        </Field>
        <Field label="Day" className={cx(styles.formField, styles.dayField)}>
          <Select name="day" options={dayOptions(month)} placeholder="–" value={day} onValueChange={setDay} />
        </Field>
        <Field label="Email" className={cx(styles.formField, styles.emailField)}>
          <Input type="email" name="email" placeholder="you@email.com" autoComplete="email" required />
        </Field>
        <Button type="submit" size="lg" className={styles.remindButton} disabled={pending}>
          Remind me
        </Button>
      </form>

      <p
        role={state.status === "idle" ? undefined : "status"}
        className={cx(styles.footnote, state.status === "ok" && styles.footnoteOk, state.status === "error" && styles.footnoteError)}
      >
        {state.message ?? "One email a year, a week before your birthday. Unsubscribe anytime."}
      </p>
    </Surface>
  );
}
