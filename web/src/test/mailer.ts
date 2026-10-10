import type { Mailer, OutgoingEmail } from "@/server/email/mailer";

/** Keeps every email instead of sending it. */
export function memoryMailer(): Mailer & { sent: OutgoingEmail[]; to(address: string): OutgoingEmail[] } {
  const sent: OutgoingEmail[] = [];
  return {
    sent,
    to: (address) => sent.filter((e) => e.to === address),
    async send(email) {
      sent.push(email);
      return { id: `<test-${sent.length}@mybday.lol>` };
    },
  };
}

/** Fails every send, like an SMTP outage. */
export function failingMailer(): Mailer {
  return {
    async send() {
      throw new Error("SMTP is down");
    },
  };
}
