"use client";

import { Alert, Button, Paper, PasswordInput, Stack, Text } from "@mantine/core";
import { useActionState } from "react";
import { adminSignIn, type AdminActionState } from "@/server/actions/admin";
import classes from "./admin.module.css";

/** The one-password sign-in (07 B14). */
export function LoginForm() {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(adminSignIn, {});
  return (
    <div className={classes.login}>
      <Paper className={classes.loginCard}>
        <form action={action}>
          <Stack gap="lg">
            <div>
              <p className={classes.loginBrand}>mybday.lol</p>
              <Text c="dimmed" fw={600}>
                Admin
              </Text>
            </div>
            {state.errors?.form && (
              <Alert color="red" variant="light" role="alert">
                {state.errors.form}
              </Alert>
            )}
            <PasswordInput name="password" label="Password" autoComplete="current-password" autoFocus required size="md" />
            <Button type="submit" size="md" loading={pending} fullWidth>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}
