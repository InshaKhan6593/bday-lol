/**
 * Builds an email from simple blocks, as HTML (tables + inline styles: what
 * every inbox understands) and plain text that always say the same thing.
 * Every string is escaped here, so names and bios typed by users can't inject
 * markup.
 *
 * The look is the app's design language: the person's theme ground as the
 * background, a kicker over a giant date (the homepage hero), a white card
 * with ink outlines and a hard shadow, receipt-style panels, avatar circles. Gmail strips box-shadow, so the card's shadow is a
 * thick bottom-right border, which renders the same everywhere.
 */

export type EmailBlock =
  | { kind: "p"; text: string }
  /** The main action: a full-width black button (easy to tap on a phone, the same in every email). */
  | { kind: "button"; label: string; url: string }
  /** Avatar circle + name + an optional line under it. */
  | { kind: "person"; name: string; line?: string; photoUrl?: string | null }
  /**
   * Two tiles side by side, e.g. who's #1 now vs. you (outbid alert). The
   * left one is filled with the person's color; the right one is dashed
   * ("not there yet", like empty spots in the app).
   */
  | { kind: "versus"; left: VersusTile; right: VersusTile }
  /** A big centered line with a smaller one under it: "$2 takes #1 back". */
  | { kind: "callout"; title: string; sub?: string }
  | { kind: "note"; text: string }
  /**
   * A panel (Apple/Stripe receipt style, in our look): an outlined box with a
   * strip in the person's color, lines with amounts on the right, a dashed
   * rule, a bold total, then small labelled details in a grey footer. Used for
   * receipts, boost lists, standings and the admin's claim details.
   */
  | {
      kind: "receipt";
      title: string;
      /** Receipt number, top right of the strip: "No. MB-4F7K2A9C". */
      number?: string;
      lines: Array<{ label: string; note?: string; amount: string }>;
      total?: { label: string; amount: string };
      /** Two per row; "wide" takes a whole row (emails and links, so they don't break mid-word on phones). */
      details?: ReadonlyArray<EmailDetail>;
    }
  | { kind: "fine"; text: string };

export type VersusTile = { kicker: string; name: string; amount: string };

/** A labelled detail in a panel's grey footer. "wide" takes a whole row. */
export type EmailDetail = readonly [label: string, value: string] | readonly [label: string, value: string, "wide"];

export type EmailContent = {
  subject: string;
  /** The grey preview line in the inbox. */
  preheader: string;
  /** Small uppercase line over the big title ("YOU'RE ON THE HOMEPAGE"). */
  kicker: string;
  /** The big title, usually the date ("October 7") or an amount ("+$16"). */
  title: string;
  blocks: EmailBlock[];
  /** "You're getting this because…" */
  reason: string;
  /** Theme colors of the person the email is about (Butter by default). */
  ground?: string;
  accent?: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

const INK = "#141414";
/**
 * A thin grey edge on black buttons. In light mode it
 * disappears into the black; when an app forces dark mode on the email
 * (Gmail on Android ignores "light only") the card turns black too, and this
 * edge is what keeps the button visible.
 */
const EDGE = "#3d3d3d";
const FONT = "'Bricolage Grotesque', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const BUTTER = { ground: "#FFEC94", accent: "#A88BFF" };
/**
 * Invisible filler after the preview line. Without it, inboxes keep reading
 * into the email ("…today's board. mybday.lol Happy birthday, Maya October 10")
 * and show that next to the subject.
 */
const PREHEADER_PAD = "&#847;&zwnj;&nbsp;".repeat(90);

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only http(s) links go into an href or src; anything else becomes "#". */
function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : "#";
}

function hex(value: string | undefined, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : fallback;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
}

/** Tiny uppercase label over its value (Apple's receipt grid). Long values (emails, links) wrap anywhere. */
function detailCell(label: string, value: string, wide = false): string {
  return `<td ${wide ? 'colspan="2"' : 'width="50%"'} style="padding:6px 8px 6px 0;vertical-align:top"><p style="margin:0;font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#666666">${escapeHtml(label)}</p><p style="margin:2px 0 0;font-size:15px;line-height:1.4;font-weight:600;color:${INK};word-break:break-word;overflow-wrap:anywhere">${escapeHtml(value)}</p></td>`;
}

function receiptHtml(block: Extract<EmailBlock, { kind: "receipt" }>, ground: string): string {
  // One item: its amount *is* the total, so show it once, big, under the total's label (no repeated line).
  const only = block.lines.length === 1 && block.total ? block.lines[0]! : null;
  const total = only ? undefined : block.total;
  const lines = only
    ? `<tr><td style="padding:0 12px 4px 0;vertical-align:middle"><p style="margin:0;font-size:16px;line-height:1.35;font-weight:700;color:${INK}">${escapeHtml(only.label)}</p>${
        only.note ? `<p style="margin:2px 0 0;font-size:14px;line-height:1.4;color:#555555">${escapeHtml(only.note)}</p>` : ""
      }</td><td align="right" style="padding:0 0 4px;vertical-align:middle;white-space:nowrap"><p style="margin:0;font-size:11px;line-height:1.4;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#666666">${escapeHtml(block.total!.label)}</p><p style="margin:2px 0 0;font-size:28px;line-height:1;font-weight:800;letter-spacing:-0.02em;color:${INK}">${escapeHtml(block.total!.amount)}</p></td></tr>`
    : block.lines
    .map(
      (line) =>
        `<tr><td style="padding:0 12px 10px 0;vertical-align:top"><p style="margin:0;font-size:16px;line-height:1.35;font-weight:700;color:${INK}">${escapeHtml(line.label)}</p>${
          line.note ? `<p style="margin:2px 0 0;font-size:14px;line-height:1.4;color:#555555">${escapeHtml(line.note)}</p>` : ""
        }</td><td align="right" style="padding:0 0 10px;vertical-align:top;font-size:17px;line-height:1.35;font-weight:800;color:${INK};white-space:nowrap">${escapeHtml(line.amount)}</td></tr>`,
    )
    .join("");
  // Pairs of short details side by side; a wide one gets its own row.
  const pairs: string[] = [];
  let half: [string, string] | null = null;
  const flush = () => {
    if (half) pairs.push(`<tr>${detailCell(half[0], half[1])}<td width="50%"></td></tr>`);
    half = null;
  };
  for (const [label, value, wide] of block.details ?? []) {
    if (wide) {
      flush();
      pairs.push(`<tr>${detailCell(label, value, true)}</tr>`);
    } else if (half) {
      pairs.push(`<tr>${detailCell(half[0], half[1])}${detailCell(label, value)}</tr>`);
      half = null;
    } else half = [label, value];
  }
  flush();
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border:3px solid ${INK};border-radius:18px;border-collapse:separate;border-spacing:0">
<tr><td style="background:${ground};border-bottom:3px solid ${INK};border-radius:15px 15px 0 0;padding:12px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:13px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${INK}">${escapeHtml(block.title)}</td><td align="right" style="font-size:13px;font-weight:600;color:${INK};white-space:nowrap">${block.number ? `No. ${escapeHtml(block.number)}` : ""}</td></tr></table></td></tr>
<tr><td style="padding:16px 18px ${total ? 4 : 14}px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lines}</table></td></tr>${
    total
      ? `
<tr><td style="padding:0 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px dashed ${INK};font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:12px 18px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:17px;font-weight:800;color:${INK}">${escapeHtml(total.label)}</td><td align="right" style="font-size:26px;line-height:1;font-weight:800;letter-spacing:-0.02em;color:${INK};white-space:nowrap">${escapeHtml(total.amount)}</td></tr></table></td></tr>`
      : ""
  }${
    pairs.length
      ? `\n<tr><td style="background:#f6f6f6;border-top:2px solid #e6e6e6;border-radius:0 0 15px 15px;padding:10px 18px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${pairs.join("")}</table></td></tr>`
      : ""
  }
</table>`;
}

function blockHtml(block: EmailBlock, accent: string, ground: string): string {
  switch (block.kind) {
    case "p":
      return `<p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:#333333">${escapeHtml(block.text)}</p>`;
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 20px"><tr><td align="center" style="background:${INK};border:2px solid ${EDGE};border-radius:16px"><a href="${safeUrl(block.url)}" style="display:block;padding:16px 26px;font-family:${FONT};font-size:17px;font-weight:800;color:#ffffff;text-decoration:none;text-align:center">${escapeHtml(block.label)}</a></td></tr></table>`;
    case "versus": {
      const tile = (t: VersusTile, filled: boolean) =>
        `<td width="50%" style="padding:16px 16px 14px;vertical-align:top;border:3px ${filled ? "solid" : "dashed"} ${INK};border-radius:18px;background:${filled ? ground : "#ffffff"}"><p style="margin:0;font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${INK}">${escapeHtml(t.kicker)}</p><p style="margin:6px 0 0;font-size:17px;line-height:1.25;font-weight:700;color:${INK};word-break:break-word">${escapeHtml(t.name)}</p><p style="margin:8px 0 0;font-size:30px;line-height:1;font-weight:800;letter-spacing:-0.02em;color:${INK}">${escapeHtml(t.amount)}</p></td>`;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:separate;border-spacing:0"><tr>${tile(block.left, true)}<td width="12" style="font-size:0;line-height:0">&nbsp;</td>${tile(block.right, false)}</tr></table>`;
    }
    case "callout":
      return `<div style="margin:8px 0 18px;text-align:center"><p style="margin:0;font-size:30px;line-height:1.1;font-weight:800;letter-spacing:-0.02em;color:${INK}">${escapeHtml(block.title)}</p>${
        block.sub ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.45;color:#4a4a4a">${escapeHtml(block.sub)}</p>` : ""
      }</div>`;
    case "person": {
      const avatar = block.photoUrl
        ? `<img src="${safeUrl(block.photoUrl)}" alt="" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:999px;border:3px solid ${INK};object-fit:cover">`
        : `<div style="width:56px;height:56px;line-height:56px;border-radius:999px;border:3px solid ${INK};background:${accent};text-align:center;font-size:20px;font-weight:800;color:${INK}">${escapeHtml(initials(block.name))}</div>`;
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px"><tr><td style="padding-right:14px;vertical-align:middle">${avatar}</td><td style="vertical-align:middle"><p style="margin:0;font-size:21px;line-height:1.2;font-weight:800;color:${INK}">${escapeHtml(block.name)}</p>${
        block.line ? `<p style="margin:3px 0 0;font-size:15px;line-height:1.4;color:#4a4a4a">${escapeHtml(block.line)}</p>` : ""
      }</td></tr></table>`;
    }
    case "note":
      return `<p style="margin:0 0 18px;padding:14px 16px;border:3px solid ${INK};border-radius:16px;font-size:16px;line-height:1.45;color:${INK}">${escapeHtml(block.text)}</p>`;
    case "receipt":
      return receiptHtml(block, ground);
    case "fine":
      return `<p style="margin:0 0 6px;font-size:13px;line-height:1.45;color:#4a4a4a">${escapeHtml(block.text)}</p>`;
  }
}

function blockText(block: EmailBlock): string {
  switch (block.kind) {
    case "p":
    case "note":
    case "fine":
      return block.text;
    case "button":
      return `${block.label}: ${block.url}`;
    case "person":
      return [block.name, block.line].filter(Boolean).join("\n");
    case "versus":
      return [block.left, block.right].map((t) => `${t.kicker}: ${t.name}, ${t.amount}`).join("\n");
    case "callout":
      return [block.title, block.sub].filter(Boolean).join("\n");
    case "receipt":
      return [
        block.title.toUpperCase() + (block.number ? ` No. ${block.number}` : ""),
        ...block.lines.map((line) => `${line.label}${line.note ? ` (${line.note})` : ""}: ${line.amount}`),
        ...(block.total ? [`${block.total.label}: ${block.total.amount}`] : []),
        ...(block.details ?? []).map(([label, value]) => `${label}: ${value}`),
      ].join("\n");
  }
}

type RenderOptions = {
  /** Site origin, for the logo link. */
  origin: string;
  /** Present on reminder, your-day and digest emails (spec §8). */
  unsubscribeUrl?: string;
  /** Postal address for the footer (07 C2; empty until the client sends one). */
  footerAddress?: string;
};

export function renderEmail(content: EmailContent, options: RenderOptions): RenderedEmail {
  const ground = hex(content.ground, BUTTER.ground);
  const accent = hex(content.accent, BUTTER.accent);
  const link = (path: string, label: string) =>
    `<a href="${safeUrl(options.origin + path)}" style="color:${INK};font-weight:700;text-decoration:underline">${label}</a>`;
  const footer = [
    escapeHtml(content.reason),
    options.unsubscribeUrl
      ? `<a href="${safeUrl(options.unsubscribeUrl)}" style="color:${INK};font-weight:700">Unsubscribe</a>`
      : "",
    options.footerAddress ? escapeHtml(options.footerAddress) : "",
    // Same links as the site footer.
    `<span style="display:inline-block;padding-top:8px">mybday.lol &nbsp;·&nbsp; ${link("/how-it-works", "FAQ")} &nbsp;·&nbsp; ${link("/terms", "Terms")} &nbsp;·&nbsp; ${link("/privacy", "Privacy")}</span>`,
  ]
    .filter(Boolean)
    .join("<br>");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${escapeHtml(content.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap" rel="stylesheet">
<style>@media (max-width:480px){.hero-title{font-size:48px!important}.card{padding:22px 18px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${ground};font-family:${FONT};color:${INK};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(content.preheader)}${PREHEADER_PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ground}"><tr><td align="center" style="padding:28px 16px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 26px"><a href="${safeUrl(options.origin)}" style="font-family:${FONT};font-size:26px;font-weight:800;letter-spacing:-0.02em;color:${INK};text-decoration:none">mybday.lol</a></td></tr>
<tr><td align="center" style="padding:0 4px 26px">
<p style="margin:0 0 6px;font-size:14px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${INK}">${escapeHtml(content.kicker)}</p>
<h1 class="hero-title" style="margin:0;font-family:${FONT};font-size:64px;line-height:0.95;font-weight:800;letter-spacing:-0.045em;color:${INK}">${escapeHtml(content.title)}</h1>
</td></tr>
<tr><td class="card" style="background:#ffffff;border:3px solid ${INK};border-right-width:9px;border-bottom-width:9px;border-radius:26px;padding:28px 26px">
${content.blocks.map((b) => blockHtml(b, accent, ground)).join("\n")}
</td></tr>
<tr><td style="padding:20px 6px 0;font-size:13px;line-height:1.6;color:#4a4a4a">${footer}</td></tr>
</table></td></tr></table>
</body></html>`;

  const text = [
    "mybday.lol",
    "",
    content.kicker.toUpperCase(),
    content.title,
    "",
    ...content.blocks.map(blockText).flatMap((t) => [t, ""]),
    "--",
    content.reason,
    ...(options.unsubscribeUrl ? [`Unsubscribe: ${options.unsubscribeUrl}`] : []),
    ...(options.footerAddress ? [options.footerAddress] : []),
    `FAQ: ${options.origin}/how-it-works · Terms: ${options.origin}/terms · Privacy: ${options.origin}/privacy`,
  ].join("\n");

  return { subject: content.subject, html, text };
}

/** "PKR 1,439.94" from Stripe's minor units, using each currency's own decimals (JPY has none). */
export function formatMinorUnits(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const digits = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).resolvedOptions()
    .maximumFractionDigits ?? 2;
  const value = amount / 10 ** digits;
  return `${code} ${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
