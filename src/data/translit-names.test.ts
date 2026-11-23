import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Калька: английское слово, просто записанное кириллицей. */
const FORBIDDEN = [
  "коффин",
  "моккинг",
  "проджект",
  "бандерснатч",
  "каллинг",
  "коунтерспелл",
  "веномтаил",
  "спеллхорн",
  "акклиматизатион",
  "спеллшапе",
  "хеалинг",
  "таил",
];

const GROUP = /Группа: (сворд|книфе|аксе|спеар|флаил|полеарм|кроссбов|хаммер|бравлинг|шиелд|клуб|бов|пикк)\b/;

function files(): string[] {
  return readdirSync(new URL("./generated/", import.meta.url)).filter((name) => name.endsWith(".json"));
}

function read(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./generated/${name}`, import.meta.url), "utf8"));
}

function visibleStrings(node: unknown, bag: string[], skip: boolean): void {
  if (Array.isArray(node)) {
    for (const item of node) visibleStrings(item, bag, skip);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (key === "originalName" || key === "id" || key === "link" || key === "sourceId" || key === "location" || key === "title") continue;
    if (typeof value === "string" && (key === "name" || key === "text" || key === "short" || key === "info")) bag.push(value);
    else if (value && typeof value === "object") visibleStrings(value, bag, skip);
  }
}

describe("видимые имена без кальки с английского", () => {
  it("совомедведь, бандерснэтч и призвания названы по-русски", () => {
    const dnd = read("monsters-2024.json") as { id: string; name: string }[];
    const pf = read("monsters-pf.json") as { id: string; name: string; text: string }[];
    const wide = read("pf-wide.json") as { id: string; name: string }[];
    const lists = read("pf-lists.json") as { id: string; name: string }[];
    expect(dnd.find((row) => row.id === "owlbear")?.name).toBe("Совомедведь");
    expect(pf.find((row) => row.id === "bandersnatch")?.name).toBe("Бандерснэтч");
    expect(pf.find((row) => row.id === "bandersnatch")?.text).not.toMatch(/Таил|Куилл|Бандерснатч/);
    expect(wide.find((row) => row.id === "thiefs-calling")?.name).toBe("Призвание вора");
    expect(wide.find((row) => row.id === "mocking-invisibility")?.name).toBe("Насмешливая невидимость");
    expect(wide.find((row) => row.id === "hells-armaments")?.name).toBe("Адское вооружение");
    expect(lists.find((row) => row.id === "witchs-broom")?.name).toBe("Ведьмина метла");
  });

  it("в именах и текстах карточек нет типичной кальки и сырой латиницы в названии", () => {
    const hits: string[] = [];
    for (const file of files()) {
      const bag: string[] = [];
      visibleStrings(read(file), bag, false);
      bag.forEach((value, index) => {
        const lower = value.toLocaleLowerCase("ru");
        if (/совомед(?!ведь)/.test(lower)) hits.push(`${file}:${index}:совомед`);
        for (const token of FORBIDDEN) {
          if (lower.includes(token)) hits.push(`${file}:${token}`);
        }
        if (GROUP.test(value)) hits.push(`${file}:группа`);
      });
      const data = read(file);
      const names: string[] = [];
      const walk = (node: unknown) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (!node || typeof node !== "object") return;
        const record = node as { name?: unknown };
        if (typeof record.name === "string" && /[A-Za-z]{4,}/.test(record.name)) names.push(record.name);
        if (typeof record.name === "string" && /['’′]/.test(record.name)) names.push(`апостроф:${record.name}`);
        for (const value of Object.values(record)) if (value && typeof value === "object") walk(value);
      };
      walk(data);
      if (names.length) hits.push(`${file}:latin:${names.slice(0, 3).join(",")}`);
      if (hits.length > 20) break;
    }
    expect(hits).toEqual([]);
  });
});
