import { describe, expect, it } from "vitest";
import { inRollback } from "@/test/db";
import { getLegalPage, saveSitePage } from "./site-pages";

const NOON = new Date("2026-10-07T12:00:00-04:00");

describe("editable legal pages", () => {
  it("shows the client's original text until the admin saves a version", async () => {
    await inRollback(async (tx) => {
      const terms = await getLegalPage(tx, "terms");
      expect(terms.title).toBe("Terms of Service");
      expect(terms.sections[0]?.heading).toBe("1. Who we are");
      const privacy = await getLegalPage(tx, "privacy");
      expect(privacy.title).toBe("Privacy Policy");
    });
  });

  it("serves the saved version right away, and saving again replaces it", async () => {
    await inRollback(async (tx) => {
      await saveSitePage(tx, "terms", "# Terms of Service\n\nLast updated: October 20, 2026\n\n## 1. Hi\n\nFirst.", NOON);
      await saveSitePage(tx, "terms", "# Terms of Service\n\nLast updated: October 21, 2026\n\n## 1. Hi\n\nSecond.", NOON);
      const terms = await getLegalPage(tx, "terms");
      expect(terms.updated).toBe("October 21, 2026");
      expect(terms.sections).toEqual([{ heading: "1. Hi", blocks: [{ kind: "p", text: "Second." }] }]);
      // Privacy is untouched.
      expect((await getLegalPage(tx, "privacy")).sections.length).toBeGreaterThan(5);
    });
  });
});
