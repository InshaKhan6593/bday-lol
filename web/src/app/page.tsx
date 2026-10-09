import Link from "next/link";
import { Kicker, Surface, ThemeScope } from "@/components/ui";

// Placeholder until the homepage is built (step 5 of the build plan).
export default function HomePage() {
  return (
    <ThemeScope theme="butter" paint>
      <main style={{ maxWidth: "var(--page-narrow)", margin: "0 auto", padding: "var(--space-5xl) var(--gutter)" }}>
        <Surface radius="hero" elevation="hero" padding="hero">
          <Kicker size="lg">bday.lol · local build</Kicker>
          <h1 style={{ fontSize: "var(--text-h1)", fontWeight: 800, letterSpacing: "var(--tracking-heading)" }}>
            Foundation is ready.
          </h1>
          <p style={{ fontSize: "var(--text-lead)", color: "var(--color-text-secondary)" }}>
            See the design language at <Link href="/styleguide">/styleguide</Link>.
          </p>
        </Surface>
      </main>
    </ThemeScope>
  );
}
