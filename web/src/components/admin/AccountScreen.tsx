"use client";

import { Alert, Button, Group, Paper, PasswordInput, Stack, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { PASSWORD_MIN_LENGTH } from "@/lib/admin-auth-rules";
import { adminChangeEmail, adminChangePassword, type AdminActionState } from "@/server/actions/admin";
import { PageHead } from "./AdminShell";
import classes from "./admin.module.css";

/** The admin's own sign-in: the email and the password, changed without a deploy. */
export function AccountScreen({ email }: { email: string | null }) {
  return (
    <>
      <PageHead title="Account" lead="The email and password you sign in with. A forgotten password is reset with a code sent to this email." />
      <div className={classes.accountCards}>
        <EmailCard email={email} />
        <PasswordCard />
      </div>
    </>
  );
}

function EmailCard({ email }: { email: string | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminActionState, FormData>(adminChangeEmail, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    notifications.show({ message: state.message, color: "green" });
    form.current?.reset();
    router.refresh();
  }, [state, router]);

  return (
    <Paper p="xl">
      <form ref={form} action={action}>
        <Stack gap="lg">
          <p className={classes.sectionLabel}>Sign-in email</p>
          {state.errors?.form && (
            <Alert color="red" variant="light" role="alert">
              {state.errors.form}
            </Alert>
          )}
          <TextInput
            // Remounted with the saved address after a change.
            key={email ?? "none"}
            name="email"
            type="email"
            label="Email"
            description={email ? "Reset codes are sent here." : "None set yet: add one so a forgotten password can be reset."}
            defaultValue={email ?? ""}
            autoComplete="username"
            error={state.errors?.email}
            required
          />
          <PasswordInput name="current" label="Current password" description="To confirm it’s you." autoComplete="current-password" error={state.errors?.current} required />
          <Group justify="flex-end">
            <Button type="submit" loading={pending}>
              Change email
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}

function PasswordCard() {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(adminChangePassword, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    notifications.show({ message: state.message, color: "green" });
    form.current?.reset();
  }, [state]);

  return (
    <Paper p="xl">
      <form ref={form} action={action}>
        <Stack gap="lg">
          <p className={classes.sectionLabel}>Password</p>
          {state.errors?.form && (
            <Alert color="red" variant="light" role="alert">
              {state.errors.form}
            </Alert>
          )}
          <PasswordInput name="current" label="Current password" autoComplete="current-password" error={state.errors?.current} required />
          <PasswordInput
            name="next"
            label="New password"
            description={`At least ${PASSWORD_MIN_LENGTH} characters. Every other device is signed out.`}
            autoComplete="new-password"
            error={state.errors?.next}
            required
          />
          <PasswordInput name="confirm" label="New password again" autoComplete="new-password" required />
          <Group justify="flex-end">
            <Button type="submit" loading={pending}>
              Change password
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
