/**
 * Terms and Privacy are stored as plain Markdown so the client can edit them
 * without a deploy (handoff v2 §11). Only the little Markdown the legal text
 * uses is understood: "# Title", "Last updated: …", "## Section", paragraphs
 * and "- " bullet lists. Everything is rendered as text, never as HTML, so a
 * pasted <script> stays harmless.
 */

export type LegalBlock = { kind: "p"; text: string } | { kind: "ul"; items: string[] };
export type LegalSection = { heading: string | null; blocks: LegalBlock[] };
export type LegalDoc = { title: string; updated: string | null; sections: LegalSection[] };

export function parseLegalDoc(markdown: string, fallbackTitle: string): LegalDoc {
  let title = fallbackTitle;
  let updated: string | null = null;
  const sections: LegalSection[] = [];
  let current: LegalSection = { heading: null, blocks: [] };
  let paragraph: string[] = [];
  let list: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) current.blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (list?.length) current.blocks.push({ kind: "ul", items: list });
    list = null;
  };
  const flushSection = () => {
    flushParagraph();
    flushList();
    if (current.heading || current.blocks.length) sections.push(current);
  };

  for (const raw of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line || /^-{3,}$/.test(line)) {
      flushParagraph();
      flushList();
      continue;
    }
    const h1 = /^#\s+(.+)$/.exec(line);
    if (h1) {
      title = h1[1]!.replace(/^mybday\.lol\s+/i, "");
      continue;
    }
    const lastUpdated = /^last updated:\s*(.+)$/i.exec(line);
    if (lastUpdated && sections.length === 0 && !current.heading) {
      updated = lastUpdated[1]!;
      continue;
    }
    const h2 = /^#{2,3}\s+(.+)$/.exec(line);
    if (h2) {
      flushSection();
      current = { heading: h2[1]!, blocks: [] };
      continue;
    }
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (item) {
      flushParagraph();
      (list ??= []).push(item[1]!);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushSection();
  return { title, updated, sections };
}
