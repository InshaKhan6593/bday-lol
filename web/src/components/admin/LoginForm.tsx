"use client";

import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import Link from "next/link";
import { useActionState } from "react";
import { routes } from "@/lib/routes";
import { adminSignIn, type AdminActionState } from "@/server/actions/admin";
import classes from "./admin.module.css";

/** The admin's sign-in: email and password (07 B14). */
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
            <TextInput name="email" type="email" label="Email" autoComplete="username" autoFocus required size="md" />
            <PasswordInput name="password" label="Password" autoComplete="current-password" required size="md" />
            <Button type="submit" size="md" loading={pending} fullWidth>
              Sign in
            </Button>
            <Anchor component={Link} href={routes.admin.forgot} c="inherit" fw={700} underline="always" ta="center" size="sm">
              Forgot password?
            </Anchor>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}
