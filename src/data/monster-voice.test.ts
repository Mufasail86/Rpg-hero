import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { disallowedLatin, transliterationHits } from "./monster-voice";

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
    expect(wolf?.text).toContain("1d4");
    expect(wolf?.text).toContain("досягаемости хотя бы двух");
    expect(wolf?.text).not.toContain("Числа эффекта");
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
    expect(remaining).toBe(0);
    expect(lowRemaining).toBe(0);
  });

  it("нет транслитерации английских слов, имена заклинаний как в справочнике", () => {
    expect(transliterationHits("Лонгспеар, Констант Спеллс, Джавс и Аттакк")).toEqual(
      expect.arrayContaining(["лонгспеар", "спеллс", "джавс", "аттакк"]),
    );

    const spear = rows("monsters-pf.json").find((row) => row.id === "aapoph-granitescale");
    expect(spear?.text).toContain("Длинное копьё");
    expect(spear?.text).not.toContain("Лонгспеар");
    expect(spear?.text).toContain("1d8+11");

    const dragon = rows("monsters-pf.json").find((row) => row.id === "diabolic-dragon-adult-spellcaster");
    expect(dragon?.text).toContain("Божественное копьё");
    expect(dragon?.text).toContain("Искажение пустоты");
    expect(dragon?.text).not.toContain("Божественный Копьё");
    expect(dragon?.text).not.toContain("Пустота Искажение");
    expect(dragon?.text).toContain("Подготовленные божественные заклинания");
    expect(dragon?.text).toContain("Сообщение");
    expect(dragon?.text).toContain("5 круг: Изгнание, Божественное сожжение, Послание, Истинная речь.");

    let translit = 0;
    for (const file of FILES) {
      for (const row of rows(file)) {
        const words = transliterationHits(row.text);
        if (!words.length) continue;
        translit++;
        expect(words, `${file}:${row.id}`).toEqual([]);
      }
    }
    expect(translit).toBe(0);
  });
});
