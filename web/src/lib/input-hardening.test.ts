import { describe, expect, it } from "vitest";
import { BIRTHDAY_BOARD_TYPE } from "@/config/board-types";
import { isThemeKey } from "@/config/themes";
import { imageSize } from "./checkout";
import { validateListing } from "./claim";
import { isEmailAddress } from "./email-address";
import { stripWrappingQuotes } from "./people";
import { parseReminderInput } from "./reminders";

describe("isEmailAddress", () => {
  it("accepts ordinary addresses", () => {
    for (const ok of ["sam@example.com", "sam.rivera+bday@mail.example.co.uk", "o'brien@example.org", "a_b-c@sub-domain.example.io"]) {
      expect(isEmailAddress(ok), ok).toBe(true);
    }
  });

  it("rejects anything a mail library could read as a list or a display name", () => {
    for (const bad of [
      "a1,victim@example.com",
      "a2;victim@example.com",
      "<victim@example.com>",
      '"x"@example.com',
      "x(y)@example.com",
      "a:b@example.com",
      "sam @example.com",
      "sam@example",
      "sam@@example.com",
      "sam@.example.com",
      "sam@example..com",
      ".sam@example.com",
      "",
    ]) {
      expect(isEmailAddress(bad), bad).toBe(false);
    }
  });

  it("checks the length first, so a huge value is refused at once", () => {
    const started = performance.now();
    expect(isEmailAddress(`a@${".".repeat(900_000)}@`)).toBe(false);
    expect(isEmailAddress(`${"a".repeat(250)}@example.com`)).toBe(false);
    expect(performance.now() - started).toBeLessThan(50);
  });

  it("is what the reminder form uses", () => {
    expect(parseReminderInput({ month: 10, day: 7, email: "a1,victim@example.com" }).ok).toBe(false);
    expect(parseReminderInput({ month: 10, day: 7, email: " Sam@Example.com " })).toMatchObject({ ok: true, email: "sam@example.com" });
  });
});

describe("junk input costs nothing", () => {
  it("refuses an oversized bio without cleaning it", () => {
    const started = performance.now();
    const result = validateListing(
      { name: "Sam", bio: `${'" '.repeat(400_000)}x`, giftLinks: [], theme: "sky", isMinor: false },
      BIRTHDAY_BOARD_TYPE.settings,
    );
    expect(result).toMatchObject({ ok: false, errors: { bio: expect.any(String) } });
    expect(performance.now() - started).toBeLessThan(50);
  });

  it("strips wrapping quotes in one pass, whatever the text", () => {
    expect(stripWrappingQuotes('  “"Hi" there”  ')).toBe('Hi" there');
    expect(stripWrappingQuotes('""')).toBe("");
    const started = performance.now();
    expect(stripWrappingQuotes(`${'" '.repeat(200_000)}x`)).toBe("x");
    expect(performance.now() - started).toBeLessThan(200);
  });
});

describe("isThemeKey", () => {
  it("accepts the 12 colors and nothing an object merely inherits", () => {
    expect(isThemeKey("sky")).toBe(true);
    for (const inherited of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
      expect(isThemeKey(inherited), inherited).toBe(false);
    }
  });
});

describe("imageSize", () => {
  const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

  it("reads a PNG header", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...be32(12000), ...be32(340), 8, 6, 0, 0, 0]);
    expect(imageSize(png, "png")).toEqual({ width: 12000, height: 340 });
    expect(imageSize(png.slice(0, 20), "png")).toBeNull();
  });

  it("reads a JPEG frame header after other segments", () => {
    const jpg = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xe0, 0, 4, 1, 2, // an APP0 segment to skip
      0xff, 0xc2, 0, 17, 8, 0x02, 0x00, 0x01, 0x80, 3, 1, 0x22, 0, // progressive frame: 512 high, 384 wide
    ]);
    expect(imageSize(jpg, "jpg")).toEqual({ width: 384, height: 512 });
    expect(imageSize(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 1, 2, 0, 0, 0, 0]), "jpg")).toBeNull();
  });

  it("reads the three kinds of WebP", () => {
    const riff = (chunk: string, rest: number[]) => new Uint8Array([...new TextEncoder().encode("RIFF\0\0\0\0WEBP" + chunk), ...rest]);
    // Extended: 4 bytes of length, flags + 3 reserved, then width-1 and height-1 in 3 bytes each.
    expect(imageSize(riff("VP8X", [10, 0, 0, 0, 0, 0, 0, 0, 0xff, 0x01, 0, 0x7f, 0x01, 0]), "webp")).toEqual({ width: 512, height: 384 });
    // Lossy: length, 3-byte frame tag, start code 9d 01 2a, then 14-bit width and height.
    expect(imageSize(riff("VP8 ", [0, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a, 0x00, 0x02, 0x80, 0x01]), "webp")).toEqual({ width: 512, height: 384 });
    // Lossless: length, signature 2f, then width-1 and height-1 packed in 14 bits each.
    const packed = 511 | (383 << 14);
    expect(imageSize(riff("VP8L", [0, 0, 0, 0, 0x2f, packed & 255, (packed >> 8) & 255, (packed >> 16) & 255, (packed >> 24) & 255, 0, 0, 0, 0, 0]), "webp")).toEqual({ width: 512, height: 384 });
  });
});
