import { describe, expect, it } from "vitest";
import { readTheme, themeOf } from "./theme";

describe("тема", () => {
  it("по умолчанию ночная таверна, атлас только по явной записи", () => {
    expect(themeOf(null)).toBe("tavern");
    expect(themeOf("atlas")).toBe("atlas");
    expect(themeOf("light")).toBe("tavern");
    expect(readTheme({ getItem: () => "atlas" })).toBe("atlas");
    expect(readTheme({ getItem: () => null })).toBe("tavern");
  });
});
