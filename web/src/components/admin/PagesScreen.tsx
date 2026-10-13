"use client";

import { Alert, Anchor, Button, Group, Paper, Tabs, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { fromEditorDoc, titleLine, toEditorDoc, type EditorNode } from "@/lib/rich-text";
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
  terms: "Type as you would in a document. The H2 button turns a line into a section heading.",
  privacy: "Type as you would in a document. The H2 button turns a line into a section heading.",
  faq: "Make each question a heading with the H2 button, then write its answer underneath. The order here is the order on the page.",
};

/** What the editor can hold is what the pages can show: headings, paragraphs, bullets, bold, italic, underline. */
const EDITOR_KIT = StarterKit.configure({
  heading: { levels: [2] },
  blockquote: false,
  code: false,
  codeBlock: false,
  horizontalRule: false,
  link: false,
  orderedList: false,
  strike: false,
});

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
  // The page's own "# Title" line stays out of the editor and goes back in on save.
  const title = useMemo(() => titleLine(page.body), [page.body]);
  const start = useMemo(() => toEditorDoc(page.body), [page.body]);
  // Compared as the editor writes it, so opening a page never counts as a change.
  const [body, setBody] = useState(() => fromEditorDoc(start, title));
  const [saved, setSaved] = useState(body);
  const editor = useEditor({
    extensions: [EDITOR_KIT],
    content: start,
    // Drawn after the page loads: the server has no editor.
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": `${page.title} text`, spellcheck: "true" } },
    onUpdate: ({ editor: current }) => setBody(fromEditorDoc(current.getJSON() as EditorNode, title)),
  });

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
      <RichTextEditor editor={editor} classNames={{ root: classes.richEditor, content: classes.richContent, toolbar: classes.richToolbar }}>
        <RichTextEditor.Toolbar sticky stickyOffset={0}>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H2 aria-label={page.slug === "faq" ? "Question" : "Section heading"} />
            <RichTextEditor.BulletList />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Undo />
            <RichTextEditor.Redo />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content />
      </RichTextEditor>
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
