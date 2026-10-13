import { parseLegalDoc, type LegalBlock } from "./legal";

/**
 * The little formatting the admin's editor offers on Terms, Privacy and the FAQ: bold, italic and
 * underline inside the text, written in the stored text as **bold**, *italic* and __underline__.
 * The pages draw these as <strong>, <em> and <u> elements, never as HTML from the text, so nothing
 * typed or pasted can become markup.
 */

export type Span = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };

const MARKS = [
  { token: "**", key: "bold" },
  { token: "__", key: "underline" },
  { token: "*", key: "italic" },
] as const;

type MarkKey = (typeof MARKS)[number]["key"];

/** Splits stored text into runs of the same formatting. A marker with no partner stays as typed. */
export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  const on: Record<MarkKey, boolean> = { bold: false, underline: false, italic: false };
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    const span: Span = { text: buffer };
    for (const { key } of MARKS) if (on[key]) span[key] = true;
    spans.push(span);
    buffer = "";
  };
  /** Is there a closing marker further on (not escaped)? */
  const closes = (token: string, from: number) => {
    for (let i = from; i < text.length; i++) {
      if (text[i] === "\\") i++;
      else if (text.startsWith(token, i)) return true;
    }
    return false;
  };

  for (let i = 0; i < text.length; ) {
    const char = text[i]!;
    if (char === "\\" && i + 1 < text.length && "\\*_#-".includes(text[i + 1]!)) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }
    const mark = MARKS.find((m) => text.startsWith(m.token, i));
    if (mark && (on[mark.key] || closes(mark.token, i + mark.token.length))) {
      flush();
      on[mark.key] = !on[mark.key];
      i += mark.token.length;
      continue;
    }
    buffer += char;
    i++;
  }
  flush();
  return spans;
}

/** The text with its formatting markers taken out: for search engines' structured data and titles. */
export function plainText(text: string): string {
  return parseInline(text)
    .map((span) => span.text)
    .join("");
}

const escapeText = (text: string) => text.replace(/\\/g, "\\\\").replace(/\*/g, "\\*").replace(/__/g, "\\_\\_");

/** Writes runs back as stored text. Spaces at a run's edges move outside its markers, so the markers always pair up. */
export function serializeInline(spans: Span[]): string {
  let out = "";
  for (const span of spans) {
    const [, lead = "", body = "", trail = ""] = /^(\s*)([\s\S]*?)(\s*)$/.exec(span.text) ?? [];
    if (!body) {
      out += span.text;
      continue;
    }
    const open = `${span.bold ? "**" : ""}${span.underline ? "__" : ""}${span.italic ? "*" : ""}`;
    const close = `${span.italic ? "*" : ""}${span.underline ? "__" : ""}${span.bold ? "**" : ""}`;
    out += `${lead}${open}${escapeText(body)}${close}${trail}`;
  }
  return out;
}

// ---------------------------------------------------------------------------
// The editor's document (Tiptap's JSON) to and from the stored text
// ---------------------------------------------------------------------------

export type EditorMark = { type: string };
export type EditorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: EditorMark[];
  content?: EditorNode[];
};

const MARK_OF: Record<MarkKey, string> = { bold: "bold", italic: "italic", underline: "underline" };

function inlineNodes(text: string): EditorNode[] {
  return parseInline(text).map((span) => {
    const marks = (Object.keys(MARK_OF) as MarkKey[]).filter((key) => span[key]).map((key) => ({ type: MARK_OF[key] }));
    return marks.length ? { type: "text", text: span.text, marks } : { type: "text", text: span.text };
  });
}

const paragraph = (text: string): EditorNode => ({ type: "paragraph", content: inlineNodes(text) });

function blockNodes(blocks: LegalBlock[]): EditorNode[] {
  return blocks.map((block) =>
    block.kind === "p"
      ? paragraph(block.text)
      : { type: "bulletList", content: block.items.map((item) => ({ type: "listItem", content: [paragraph(item)] })) },
  );
}

/** The page's own "# Title" line: kept out of the editor and put back on save. */
export function titleLine(body: string): string | null {
  return /^#\s+.+$/m.exec(body.replace(/\r\n?/g, "\n"))?.[0] ?? null;
}

/** Stored text as the editor's document: sections become headings, with their paragraphs and bullet lists. */
export function toEditorDoc(body: string): EditorNode {
  const doc = parseLegalDoc(body, "");
  const content: EditorNode[] = [];
  if (doc.updated) content.push(paragraph(`Last updated: ${doc.updated}`));
  for (const section of doc.sections) {
    if (section.heading) content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: plainText(section.heading) }] });
    content.push(...blockNodes(section.blocks));
  }
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

function spansOf(node: EditorNode): Span[] {
  return (node.content ?? []).flatMap((child): Span[] => {
    // A line break inside a paragraph is a space: the pages have paragraphs and bullets, not lines.
    if (child.type === "hardBreak") return [{ text: " " }];
    if (child.type !== "text" || !child.text) return [];
    const has = (type: string) => child.marks?.some((mark) => mark.type === type) ?? false;
    const span: Span = { text: child.text };
    if (has("bold")) span.bold = true;
    if (has("italic")) span.italic = true;
    if (has("underline")) span.underline = true;
    return [span];
  });
}

const lineOf = (node: EditorNode) => serializeInline(spansOf(node)).replace(/\s+/g, " ").trim();

/** The editor's document as stored text. `title` is the "# Title" line the page had, if any. */
export function fromEditorDoc(doc: EditorNode, title: string | null = null): string {
  const parts: string[] = title ? [title] : [];
  for (const node of doc.content ?? []) {
    if (node.type === "heading") {
      const heading = spansOf(node)
        .map((span) => span.text)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (heading) parts.push(`## ${heading}`);
    } else if (node.type === "bulletList") {
      const items = (node.content ?? [])
        .map((item) => (item.content ?? []).map(lineOf).filter(Boolean).join(" "))
        .filter(Boolean);
      if (items.length) parts.push(items.map((item) => `- ${item}`).join("\n"));
    } else if (node.type === "paragraph") {
      const line = lineOf(node);
      // A paragraph that starts like a heading or a bullet would be read back as one.
      if (line) parts.push(line.replace(/^(#{1,3}|[-*])(\s)/, "\\$1$2"));
    }
  }
  return parts.join("\n\n") + "\n";
}
