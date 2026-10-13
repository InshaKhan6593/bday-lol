"use client";

import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import Link from "next/link";
import { useActionState, useState } from "react";
import { PASSWORD_MIN_LENGTH, RESET_CODE_DIGITS, RESET_CODE_MS } from "@/lib/admin-auth-rules";
import { routes } from "@/lib/routes";
import { adminRequestReset, adminResetPassword, type AdminActionState } from "@/server/actions/admin";
import classes from "./admin.module.css";

/**
 * "Forgot password?": ask for a code by email, then type it with a new password. The first step
 * answers the same way whatever email is typed, so it can't be used to find the admin's address.
 */
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [asked, ask, asking] = useActionState<AdminActionState, FormData>(adminRequestReset, {});
  const [reset, send, sending] = useActionState<AdminActionState, FormData>(adminResetPassword, {});
  const minutes = RESET_CODE_MS / 60_000;

  return (
    <div className={classes.login}>
      <Paper className={classes.loginCard}>
        <Stack gap="lg">
          <div>
            <p className={classes.loginBrand}>mybday.lol</p>
            <Text c="dimmed" fw={600}>
              Reset your admin password
            </Text>
          </div>

          {!asked.ok ? (
            <form action={ask}>
              <Stack gap="lg">
                <Text size="sm">Enter the email you sign in with. We’ll send it a {RESET_CODE_DIGITS}-digit code.</Text>
                <TextInput
                  name="email"
                  type="email"
                  label="Email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  autoFocus
                  required
                  size="md"
                />
                <Button type="submit" size="md" loading={asking} fullWidth>
                  Email me a code
                </Button>
              </Stack>
            </form>
          ) : (
            <form action={send}>
              <Stack gap="lg">
                <Alert color="green" variant="light" role="status">
                  If {email} is the admin’s email, a code is on its way. It works once and expires in {minutes} minutes.
                </Alert>
                <input type="hidden" name="email" value={email} />
                <TextInput
                  name="code"
                  label="Code from the email"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={RESET_CODE_DIGITS + 2}
                  error={reset.errors?.code}
                  autoFocus
                  required
                  size="md"
                />
                <PasswordInput
                  name="next"
                  label="New password"
                  description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
                  autoComplete="new-password"
                  error={reset.errors?.next}
                  required
                  size="md"
                />
                <PasswordInput name="confirm" label="New password again" autoComplete="new-password" required size="md" />
                <Button type="submit" size="md" loading={sending} fullWidth>
                  Set new password
                </Button>
              </Stack>
            </form>
          )}

          <Anchor component={Link} href={routes.admin.login} c="inherit" fw={700} underline="always" ta="center" size="sm">
            Back to sign in
          </Anchor>
        </Stack>
      </Paper>
    </div>
  );
}
