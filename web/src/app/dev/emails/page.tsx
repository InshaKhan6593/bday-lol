import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderEmail } from "@/lib/email-render";
import { sampleEmails } from "@/lib/email-samples";
import { siteOrigin } from "@/lib/routes";
import styles from "./emails.module.css";

export const metadata: Metadata = {
  title: "Email previews",
  robots: { index: false, follow: false },
};

/** Development-only: every email with demo data, at inbox width and phone width. */
export default function EmailPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const origin = siteOrigin();
  return (
    <main className={styles.main}>
      <h1 className={styles.h1}>Email previews</h1>
      <p className={styles.sub}>The 8 emails with the mockup’s demo people. Left: inbox width. Right: phone width.</p>
      {sampleEmails(origin).map(({ id, label, content, unsubscribe }) => {
        const email = renderEmail(content, {
          origin,
          unsubscribeUrl: unsubscribe ? `${origin}/unsubscribe?preview=1` : undefined,
          footerAddress: process.env.EMAIL_FOOTER_ADDRESS || undefined,
        });
        return (
          <section key={id} id={id} className={styles.email}>
            <h2 className={styles.label}>{label}</h2>
            <p className={styles.subject}>
              <strong>Subject:</strong> {email.subject}
            </p>
            <div className={styles.frames}>
              <iframe title={`${label} (inbox)`} srcDoc={email.html} className={styles.wide} />
              <iframe title={`${label} (phone)`} srcDoc={email.html} className={styles.phone} />
            </div>
          </section>
        );
      })}
    </main>
  );
}
