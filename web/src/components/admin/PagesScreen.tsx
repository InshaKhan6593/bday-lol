"use client";

import { Alert, Anchor, Button, Group, Paper, Tabs, Text, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { routes } from "@/lib/routes";
import { adminSavePage } from "@/server/actions/admin";
import { PageHead } from "./AdminShell";
import classes from "./admin.module.css";

export type EditablePage = {
  slug: "terms" | "privacy" | "faq";
  title: string;
  path: string;
  body: string;
  /** False while the page still shows its original text. */
  edited: boolean;
};

const HELP: Record<EditablePage["slug"], string> = {
  terms: "Start a section with “## ” and a list item with “- ”. Leave an empty line between paragraphs.",
  privacy: "Start a section with “## ” and a list item with “- ”. Leave an empty line between paragraphs.",
  faq: "Start each question with “## ”, then write its answer underneath. The order here is the order on the page.",
};

/** Terms, Privacy and the FAQ: edited here, live at once, no deploy (handoff v2 §11). */
export function PagesScreen({ pages, current }: { pages: EditablePage[]; current: EditablePage["slug"] }) {
  const router = useRouter();
  return (
    <>
      <PageHead title="Pages" lead="Edit the text and save: the page changes on the site straight away." />
      <Tabs value={current} onChange={(slug) => slug && router.push(`${routes.admin.pages}?page=${slug}` as Route)} keepMounted={false}>
        <Tabs.List mb="lg">
          {pages.map((page) => (
            <Tabs.Tab key={page.slug} value={page.slug} fw={800}>
              {page.title}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {pages.map((page) => (
          <Tabs.Panel key={page.slug} value={page.slug}>
            {/* Keyed by the saved text: "Back to the original" starts the editor again from what the server now has. */}
            <PageEditor key={`${page.edited}:${page.body.length}`} page={page} />
          </Tabs.Panel>
        ))}
      </Tabs>
    </>
  );
}

function PageEditor({ page }: { page: EditablePage }) {
  const router = useRouter();
  const [pending, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState(page.body);
  const [saved, setSaved] = useState(page.body);

  // The action is called directly, not through useActionState: a save changes this editor's key
  // (the saved text), and the answer must outlive the editor it was sent from.
  const send = (reset: boolean) => {
    const form = new FormData();
    form.set("slug", page.slug);
    form.set("body", body);
    if (reset) form.set("reset", "1");
    startSave(async () => {
      const result = await adminSavePage({}, form);
      if (!result.ok) {
        setError(result.errors?.form ?? "That didn’t save.");
        return;
      }
      setError(null);
      if (!reset) setSaved(body);
      notifications.show({ message: result.message, color: "green" });
      router.refresh();
    });
  };

  return (
    <Paper p="xl">
      {error && (
        <Alert color="red" variant="light" mb="md" role="alert">
          {error}
        </Alert>
      )}
      <Group justify="space-between" mb="sm" align="flex-end">
        <Text size="sm" c="dimmed" maw={640}>
          {HELP[page.slug]}
        </Text>
        <Anchor component={Link} href={page.path as Route} target="_blank" fw={700} c="inherit" underline="always">
          View the page
        </Anchor>
      </Group>
      <Textarea
        aria-label={`${page.title} text`}
        value={body}
        onChange={(e) => setBody(e.currentTarget.value)}
        autosize
        minRows={16}
        maxRows={32}
        classNames={{ input: `${classes.input} ${classes.editor}` }}
        spellCheck
      />
      <Group justify="space-between" mt="lg">
        <Button
          variant="default"
          disabled={!page.edited || pending}
          onClick={() => {
            if (window.confirm(`Go back to the original ${page.title} text? Your edits are deleted.`)) send(true);
          }}
        >
          Back to the original
        </Button>
        <Button loading={pending} disabled={body === saved} onClick={() => send(false)}>
          Save and publish
        </Button>
      </Group>
    </Paper>
  );
}
