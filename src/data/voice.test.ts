import { describe, expect, it } from "vitest";
import { CARDS } from "./cards";
import { bestiaryCatalog } from "./bestiary";
import { rulesCatalog } from "./catalog";
import { dataMarks } from "./editions";
import rawCards from "./generated/pf-cards.json";
import rawLists from "./generated/pf-lists.json";
import rawMonsters from "./generated/monsters-pf.json";
import { voiceIssues } from "./voice";

function namesOf(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) namesOf(item, out);
    return out;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === "name" && typeof value === "string") out.push(value);
      else if (value && typeof value === "object") namesOf(value, out);
    }
  }
  return out;
}

describe("починка перевода и честные отметки", () => {
  it("убирает известные поломки и не ставит «сверено» без проверки", () => {
    const monsters = bestiaryCatalog().filter((row) => row.edition === "pf-remaster");
    expect(monsters.find((row) => row.originalName === "Animated Broom")?.name).toBe("Оживлённая метла");
    expect(monsters.find((row) => row.originalName === "Animated Statue")?.name).toBe("Оживлённая статуя");
    expect(monsters.find((row) => row.originalName === "Frost Giant")?.name).toBe("Ледяной великан");
    expect(monsters.find((row) => row.originalName === "Pixie")?.name).toBe("Пикси");
    expect(monsters.some((row) => /Броом|Статуе|Пиксие|гигантский$|Драке/.test(row.name))).toBe(false);

    const rawDurations = (rawCards as { duration?: string }[]).filter((row) => row.duration && /патрон/.test(row.duration)).length;
    const rawQuotes = (rawCards as { summary?: string }[]).filter((row) => row.summary && /к показателю «/.test(row.summary)).length;
    const rawApostrophes = namesOf(rawLists).filter((name) => /[А-Яа-яЁё]'/.test(name)).length;
    const rawBadMonsters = namesOf(rawMonsters).filter((name) => voiceIssues(name).includes("bad-name")).length;

    expect(CARDS.some((card) => card.duration && /патрон/.test(card.duration))).toBe(false);
    expect(CARDS.some((card) => /к показателю «/.test(card.summary))).toBe(false);
    expect(CARDS.find((card) => card.summary.includes("к проверке"))).toBeTruthy();
    const catalogNames = rulesCatalog().map((entry) => entry.name);
    const apostrophesLeft = catalogNames.filter((name) => /[А-Яа-яЁё]'/.test(name)).length;
    expect(apostrophesLeft).toBe(0);
    expect(catalogNames.some((name) => name === "Стая авантюриста")).toBe(true);

    const fighter = rulesCatalog().find((entry) => entry.token === "pf-remaster~class~fighter");
    expect(dataMarks(fighter!.status, fighter!.location)).toEqual(["imported", "numbers"]);
    const cure = rulesCatalog().find((entry) => entry.token === "dnd-2024~spell~cure-wounds");
    expect(dataMarks(cure!.status, cure!.location)).toEqual(["imported", "rule"]);
    expect(dataMarks("pending", "")).toEqual(["imported"]);
    const importedOnly = rulesCatalog().filter((entry) => dataMarks(entry.status, entry.location).join() === "imported");
    expect(importedOnly.length).toBeGreaterThan(0);
    const giant = monsters.find((row) => row.originalName === "Frost Giant");
    expect(dataMarks(giant!.status, giant!.location)).toEqual(["imported", "numbers"]);

    const roughBodies = monsters.filter((row) => /[A-Za-z]{5,}/.test(row.text)).length;
    const report = {
      fixedDurations: rawDurations,
      fixedBrokenQuotes: rawQuotes,
      fixedApostropheNames: rawApostrophes,
      fixedMonsterNames: rawBadMonsters,
      apostrophesLeft,
      remainingMonsterTextsWithEnglish: roughBodies,
    };
    console.log("voice-report", JSON.stringify(report));
    expect(report.fixedDurations).toBeGreaterThan(40);
    expect(report.fixedBrokenQuotes).toBeGreaterThan(200);
    expect(report.fixedApostropheNames).toBeGreaterThan(100);
    expect(report.fixedMonsterNames).toBeGreaterThan(10);
    expect(report.remainingMonsterTextsWithEnglish).toBeGreaterThan(0);
  });
});