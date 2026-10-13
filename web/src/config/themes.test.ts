import { describe, expect, it } from "vitest";
import { BIRTHDAY_BOARD_TYPE } from "./board-types";
import { getTheme, isThemeKey, OPEN_THEME, THEME_KEYS, THEMES } from "./themes";

describe("the open look", () => {
  it("is a white page with a Butter yellow button", () => {
    expect(getTheme("open")).toBe(OPEN_THEME);
    expect(OPEN_THEME.ground).toBe("#FFFFFF");
    expect(OPEN_THEME.accent).toBe(THEMES.butter.ground);
  });

  it("is what an unclaimed date wears", () => {
    expect(BIRTHDAY_BOARD_TYPE.settings.emptyTheme).toBe("open");
  });

  it("is not one of the 12 colors, so a claim can never pick it", () => {
    expect(THEME_KEYS).toHaveLength(12);
    expect(THEME_KEYS).not.toContain("open");
    expect(isThemeKey("open")).toBe(false);
  });

  it("leaves unknown colors on the fallback", () => {
    expect(getTheme("nope")).toBe(THEMES.butter);
    expect(getTheme(null, "sky")).toBe(THEMES.sky);
  });
});
