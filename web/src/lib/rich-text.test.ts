import { describe, expect, it } from "vitest";
import { fromEditorDoc, parseInline, plainText, serializeInline, titleLine, toEditorDoc, type EditorNode } from "./rich-text";

describe("formatting inside the text", () => {
  it("reads bold, italic and underline, alone and together", () => {
    expect(parseInline("plain **bold** *it* __under__ end")).toEqual([
      { text: "plain " },
      { text: "bold", bold: true },
      { text: " " },
      { text: "it", italic: true },
      { text: " " },
      { text: "under", underline: true },
      { text: " end" },
    ]);
    expect(parseInline("***both***")).toEqual([{ text: "both", bold: true, italic: true }]);
  });

  it("leaves a marker with no partner as it was typed", () => {
    expect(plainText("5 * 3 is 15")).toBe("5 * 3 is 15");
    expect(plainText("my_name and your__name")).toBe("my_name and your__name");
    expect(plainText("a ** b")).toBe("a ** b");
  });

  it("keeps an escaped marker as a plain character", () => {
    expect(plainText("\\*not italic\\*")).toBe("*not italic*");
    expect(plainText("\\- not a bullet")).toBe("- not a bullet");
  });

  it("gives search engines the words without the markers", () => {
    expect(plainText("Boosts are **final** and *never* refunded.")).toBe("Boosts are final and never refunded.");
  });

  it("writes runs back so they read the same again, spaces outside the markers", () => {
    const spans = [{ text: "Bids are " }, { text: "final ", bold: true }, { text: "always", italic: true, underline: true }, { text: ". 2 * 2" }];
    const text = serializeInline(spans);
    expect(text).toBe("Bids are **final** __*always*__. 2 \\* 2");
    expect(plainText(text)).toBe("Bids are final always. 2 * 2");
  });

  it("never turns typed text into markup", () => {
    expect(parseInline("<script>alert(1)</script> **<b>**")).toEqual([{ text: "<script>alert(1)</script> " }, { text: "<b>", bold: true }]);
  });
});

describe("the page editor's document", () => {
  const body = "# mybday.lol Terms of Service\n\nLast updated: May 1\n\n## 1. Who we are\n\nWe are **mybday.lol**.\n\n- First point\n- *Second* point\n\n## 2. Bids\n\nBids are final.\n";

  it("keeps the page's own title out of the editor", () => {
    expect(titleLine(body)).toBe("# mybday.lol Terms of Service");
    expect(titleLine("## Only sections")).toBeNull();
    expect(JSON.stringify(toEditorDoc(body))).not.toContain("Terms of Service");
  });

  it("shows sections as headings, with their paragraphs, bullets and formatting", () => {
    const doc = toEditorDoc(body);
    expect(doc.content?.map((node) => node.type)).toEqual(["paragraph", "heading", "paragraph", "bulletList", "heading", "paragraph"]);
    expect(doc.content?.[2]?.content).toEqual([
      { type: "text", text: "We are " },
      { type: "text", text: "mybday.lol", marks: [{ type: "bold" }] },
      { type: "text", text: "." },
    ]);
  });

  it("saves back the same text it opened", () => {
    expect(fromEditorDoc(toEditorDoc(body), titleLine(body))).toBe(body);
  });

  it("writes what was typed: a new heading, a bullet list, a line break as a space", () => {
    const text = (value: string, ...marks: string[]): EditorNode => ({ type: "text", text: value, marks: marks.map((type) => ({ type })) });
    const doc: EditorNode = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [text("New "), text("question?", "bold")] },
        { type: "paragraph", content: [text("Line one"), { type: "hardBreak" }, text("line two", "underline")] },
        { type: "paragraph" },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [text("One")] }] }, { type: "listItem", content: [{ type: "paragraph" }] }] },
        { type: "paragraph", content: [text("- typed dash, not a bullet")] },
      ],
    };
    expect(fromEditorDoc(doc)).toBe("## New question?\n\nLine one __line two__\n\n- One\n\n\\- typed dash, not a bullet\n");
  });

  it("an empty page opens as one empty paragraph and saves as nothing", () => {
    expect(toEditorDoc("")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(fromEditorDoc(toEditorDoc("")).trim()).toBe("");
  });
});
