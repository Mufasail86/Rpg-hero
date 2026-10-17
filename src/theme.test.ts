import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function lum(hex: string): number {
  const n = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => {
    const value = parseInt(n.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((left, right) => right - left);
  return (hi + 0.05) / (lo + 0.05);
}

function block(css: string, selector: string): string {
  const start = css.indexOf(selector);
  return css.slice(start, css.indexOf("}", start));
}

describe("латунная кнопка", () => {
  it("держит контраст AA в обеих темах", () => {
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    for (const selector of [":root {", 'html[data-theme="atlas"] {']) {
      const part = block(css, selector);
      const bg = part.match(/--copper:\s*(#[0-9a-fA-F]{6})/)?.[1] ?? "";
      const ink = part.match(/--copper-ink:\s*(#[0-9a-fA-F]{6})/)?.[1] ?? "";
      expect(contrast(bg, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
