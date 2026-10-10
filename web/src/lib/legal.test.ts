import { describe, expect, it } from "vitest";
import { TERMS_MARKDOWN } from "@/content/legal";
import { parseLegalDoc } from "./legal";

describe("legal pages", () => {
  it("reads the title, last-updated line, sections, paragraphs and lists", () => {
    const doc = parseLegalDoc(
      [
        "# mybday.lol Terms of Service",
        "",
        "Last updated: October 20, 2026",
        "",
        "## 1. Who we are",
        "",
        "We are a sole proprietor.",
        "Reach us by email.",
        "",
        "## 3. Who can use it",
        "",
        "- You must be 18.",
        "- Parents may add a child.",
        "Last updated: not a header line here",
      ].join("\n"),
      "Terms",
    );
    expect(doc).toEqual({
      title: "Terms of Service",
      updated: "October 20, 2026",
      sections: [
        { heading: "1. Who we are", blocks: [{ kind: "p", text: "We are a sole proprietor. Reach us by email." }] },
        {
          heading: "3. Who can use it",
          blocks: [
            { kind: "ul", items: ["You must be 18.", "Parents may add a child."] },
            { kind: "p", text: "Last updated: not a header line here" },
          ],
        },
      ],
    });
  });

  it("keeps markup as text and falls back to the given title", () => {
    const doc = parseLegalDoc("<script>alert(1)</script>\r\n---\r\n", "Privacy Policy");
    expect(doc.title).toBe("Privacy Policy");
    expect(doc.sections).toEqual([{ heading: null, blocks: [{ kind: "p", text: "<script>alert(1)</script>" }] }]);
  });

  it("parses the client's final Terms", () => {
    const doc = parseLegalDoc(TERMS_MARKDOWN, "Terms of Service");
    expect(doc.title).toBe("Terms of Service");
    expect(doc.sections).toHaveLength(25);
    expect(doc.sections[2]?.heading).toBe("3. Who can use mybday.lol");
    expect(doc.sections[2]?.blocks[0]?.kind).toBe("ul");
  });
});
