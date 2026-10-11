"use client";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import classes from "./admin.module.css";
import { adminTheme } from "./theme";

/** Mantine for the admin only: the public pages never load it. Always light, like the site. */
export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={adminTheme} forceColorScheme="light">
      <Notifications position="top-right" classNames={{ notification: classes.notification }} />
      <div className={classes.app}>{children}</div>
    </MantineProvider>
  );
}
