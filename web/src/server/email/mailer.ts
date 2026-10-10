import nodemailer, { type Transporter } from "nodemailer";

/**
 * Where emails go out. One SMTP code path for both places:
 * - EMAIL_TRANSPORT=smtp   → Mailpit locally (inbox at http://localhost:8030)
 * - EMAIL_TRANSPORT=resend → Resend's SMTP relay in production (RESEND_API_KEY)
 * Tests pass their own Mailer instead (src/test/mailer.ts).
 */

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export type Mailer = { send(email: OutgoingEmail): Promise<{ id: string | null }> };

function smtpTransport(): Transporter {
  if ((process.env.EMAIL_TRANSPORT ?? "smtp") === "resend") {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("EMAIL_TRANSPORT=resend needs RESEND_API_KEY.");
    return nodemailer.createTransport({ host: "smtp.resend.com", port: 465, secure: true, auth: { user: "resend", pass: key } });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1030),
    secure: false,
  });
}

let mailer: Mailer | undefined;

export function getMailer(): Mailer {
  if (mailer) return mailer;
  const transport = smtpTransport();
  const from = process.env.EMAIL_FROM ?? "bday.lol <hello@bday.lol>";
  // "Questions? Just reply": replies go to a real inbox (07 C1: the client's support email).
  const replyTo = process.env.EMAIL_REPLY_TO || undefined;
  mailer = {
    async send(email) {
      const info = await transport.sendMail({ from, replyTo, ...email });
      return { id: info.messageId ?? null };
    },
  };
  return mailer;
}
