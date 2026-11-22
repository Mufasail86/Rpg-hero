import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { disallowedLatin } from "./monster-voice";

interface MonsterRow {
  id: string;
  level: number;
  text: string;
}

const FILES = ["monsters-pf.json", "monsters-2024.json", "monsters-2014.json"];

function rows(file: string): MonsterRow[] {
  return JSON.parse(readFileSync(new URL(`./generated/${file}`, import.meta.url), "utf8")) as MonsterRow[];
}

const FREQUENT = [
  "goblin-warrior", "wolf", "animated-broom", "skeleton-guard", "zombie-shambler",
  "kobold-warrior", "giant-rat", "boar", "bandit", "cultist", "dire-wolf", "imp",
];

describe("тексты способностей бестиария", () => {
  it("у частых чудовищ нет английских слов латиницей, числа костей на месте", () => {
    const wolf = rows("monsters-pf.json").find((row) => row.id === "wolf");
    expect(wolf?.text).toContain("Челюсти");
    expect(wolf?.text).toContain("1d6+2");
    expect(wolf?.text).not.toMatch(/Jaws/);
    expect(disallowedLatin(wolf?.text ?? "")).toEqual([]);

    const goblin = rows("monsters-2024.json").find((row) => row.id === "goblin-warrior");
    expect(goblin?.text).toContain("Короткий лук");
    expect(goblin?.text).toContain("1d6+2");
    expect(goblin?.text).not.toMatch(/\bCommon\b/);
    expect(disallowedLatin(goblin?.text ?? "")).toEqual([]);

    let remaining = 0;
    let lowRemaining = 0;
    for (const file of FILES) {
      for (const row of rows(file)) {
        const words = disallowedLatin(row.text);
        if (!words.length) continue;
        remaining++;
        if (Number(row.level) <= 1) lowRemaining++;
        if (FREQUENT.includes(row.id)) {
          expect(words, `${file}:${row.id}`).toEqual([]);
        }
      }
    }
    expect(remaining).toBeGreaterThan(0);
    expect(lowRemaining).toBeLessThan(120);
    console.log("monster-latin-left", JSON.stringify({ remaining, lowRemaining }));
  });
});
