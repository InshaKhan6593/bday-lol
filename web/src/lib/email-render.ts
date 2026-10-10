/**
 * Builds an email from simple blocks, as HTML (tables + inline styles: what
 * every inbox understands) and plain text that always say the same thing.
 * Every string is escaped here, so names and bios typed by users can't inject
 * markup.
 *
 * The look is the app's design language: the person's theme ground as the
 * background, a kicker over a giant date (the homepage hero), a white card
 * with ink outlines and a hard shadow, the black claim bar with an accent
 * button, avatar circles. Gmail strips box-shadow, so the card's shadow is a
 * thick bottom-right border, which renders the same everywhere.
 */

export type EmailBlock =
  | { kind: "p"; text: string }
  /** A black button (the main action). */
  | { kind: "button"; label: string; url: string }
  /** The homepage's black claim bar: title + small line on the left, accent button. */
  | { kind: "bar"; title: string; sub?: string; label: string; url: string }
  /** Avatar circle + name + one line under it. */
  | { kind: "person"; name: string; line: string; photoUrl?: string | null }
  | { kind: "note"; text: string }
  /** Label/value rows. "strong" = standings and boost lists (bold labels, bigger amounts). */
  | { kind: "rows"; title?: string; strong?: boolean; rows: Array<[label: string, value: string]> }
  | { kind: "fine"; text: string };

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
const FONT = "'Bricolage Grotesque', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const BUTTER = { ground: "#FFEC94", accent: "#A88BFF" };

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

function blockHtml(block: EmailBlock, accent: string): string {
  switch (block.kind) {
    case "p":
      return `<p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:#333333">${escapeHtml(block.text)}</p>`;
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px"><tr><td style="background:${INK};border-radius:16px"><a href="${safeUrl(block.url)}" style="display:inline-block;padding:16px 26px;font-family:${FONT};font-size:17px;font-weight:800;color:#ffffff;text-decoration:none">${escapeHtml(block.label)}</a></td></tr></table>`;
    case "bar":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;background:${INK};border-radius:20px"><tr><td style="padding:18px 20px">
<p style="margin:0;font-size:20px;line-height:1.2;font-weight:800;color:#ffffff">${escapeHtml(block.title)}</p>${
        block.sub ? `<p style="margin:4px 0 0;font-size:14px;line-height:1.4;color:#d6d6d6">${escapeHtml(block.sub)}</p>` : ""
      }
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 0"><tr><td style="background:${accent};border-radius:14px"><a href="${safeUrl(block.url)}" style="display:inline-block;padding:14px 22px;font-family:${FONT};font-size:17px;font-weight:800;color:${INK};text-decoration:none">${escapeHtml(block.label)}</a></td></tr></table>
</td></tr></table>`;
    case "person": {
      const avatar = block.photoUrl
        ? `<img src="${safeUrl(block.photoUrl)}" alt="" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:999px;border:3px solid ${INK};object-fit:cover">`
        : `<div style="width:56px;height:56px;line-height:56px;border-radius:999px;border:3px solid ${INK};background:${accent};text-align:center;font-size:20px;font-weight:800;color:${INK}">${escapeHtml(initials(block.name))}</div>`;
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px"><tr><td style="padding-right:14px;vertical-align:middle">${avatar}</td><td style="vertical-align:middle"><p style="margin:0;font-size:21px;line-height:1.2;font-weight:800;color:${INK}">${escapeHtml(block.name)}</p><p style="margin:3px 0 0;font-size:15px;line-height:1.4;color:#4a4a4a">${escapeHtml(block.line)}</p></td></tr></table>`;
    }
    case "note":
      return `<p style="margin:0 0 18px;padding:14px 16px;border:3px solid ${INK};border-radius:16px;font-size:16px;line-height:1.45;color:${INK}">${escapeHtml(block.text)}</p>`;
    case "rows":
      return `${
        block.title
          ? `<p style="margin:6px 0 8px;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${INK}">${escapeHtml(block.title)}</p>`
          : ""
      }<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;border-top:2px solid #efefef">${block.rows
        .map(([label, value]) =>
          block.strong
            ? `<tr><td style="padding:12px 14px 12px 0;border-bottom:2px solid #efefef;font-size:17px;font-weight:700;color:${INK}">${escapeHtml(label)}</td><td align="right" style="padding:12px 0;border-bottom:2px solid #efefef;font-size:20px;font-weight:800;color:${INK};white-space:nowrap">${escapeHtml(value)}</td></tr>`
            : `<tr><td style="padding:9px 14px 9px 0;border-bottom:2px solid #efefef;font-size:14px;color:#4a4a4a;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:9px 0;border-bottom:2px solid #efefef;font-size:15px;font-weight:600;color:${INK};word-break:break-word">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>`;
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
    case "bar":
      return [block.title, block.sub, `${block.label}: ${block.url}`].filter(Boolean).join("\n");
    case "person":
      return `${block.name}\n${block.line}`;
    case "rows":
      return [block.title?.toUpperCase(), ...block.rows.map(([label, value]) => `${label}: ${value}`)]
        .filter(Boolean)
        .join("\n");
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
  const footer = [
    escapeHtml(content.reason),
    options.unsubscribeUrl
      ? `<a href="${safeUrl(options.unsubscribeUrl)}" style="color:${INK};font-weight:700">Unsubscribe</a>`
      : "",
    options.footerAddress ? escapeHtml(options.footerAddress) : "",
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
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ground}"><tr><td align="center" style="padding:28px 16px 36px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 26px"><a href="${safeUrl(options.origin)}" style="font-family:${FONT};font-size:26px;font-weight:800;letter-spacing:-0.02em;color:${INK};text-decoration:none">mybday.lol</a></td></tr>
<tr><td align="center" style="padding:0 4px 26px">
<p style="margin:0 0 6px;font-size:14px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${INK}">${escapeHtml(content.kicker)}</p>
<h1 class="hero-title" style="margin:0;font-family:${FONT};font-size:64px;line-height:0.95;font-weight:800;letter-spacing:-0.045em;color:${INK}">${escapeHtml(content.title)}</h1>
</td></tr>
<tr><td class="card" style="background:#ffffff;border:3px solid ${INK};border-right-width:9px;border-bottom-width:9px;border-radius:26px;padding:28px 26px">
${content.blocks.map((b) => blockHtml(b, accent)).join("\n")}
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
