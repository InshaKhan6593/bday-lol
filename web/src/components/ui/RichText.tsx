import { Fragment } from "react";
import { parseInline } from "@/lib/rich-text";

/**
 * Text the admin wrote, with its bold, italic and underline (lib/rich-text.ts). Drawn as elements,
 * never as HTML from the text.
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((span, i) => {
        let node: React.ReactNode = span.text;
        if (span.italic) node = <em>{node}</em>;
        if (span.underline) node = <u>{node}</u>;
        if (span.bold) node = <strong>{node}</strong>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}
