import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLASSES } from "./pf2e";

const DIGRAPHS: [string, string][] = [
  ["sch", "щ"],
  ["sh", "ш"],
  ["ch", "ч"],
  ["th", "т"],
  ["ph", "ф"],
  ["zh", "ж"],
  ["kh", "х"],
  ["ya", "я"],
  ["yu", "ю"],
  ["yo", "ё"],
  ["ee", "и"],
  ["oo", "у"],
];
const LAT: Record<string, string> = {
  a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х", i: "и", j: "дж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "к", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс", y: "и", z: "з",
};
const LOANS = new Set(["fulu", "orc", "dwarf", "goblin", "kobold", "hobgoblin", "tengu", "cardan", "athamaru", "kholo", "tripkee", "demon", "phantom", "ritual", "adept", "amulet", "magus", "titan", "construct", "dynamo"]);
const DENY = new Set(["know", "your", "enemy", "enemies", "shrink", "shrinking", "bugbear", "spell", "spells", "eidolon", "cause", "alarm", "binds", "cutting", "rebuke", "hopeful", "benthic", "harvest"]);

function translit(word: string): string {
  const text = word.toLowerCase();
  let out = "";
  let i = 0;
  while (i < text.length) {
    const hit = DIGRAPHS.find(([latin]) => text.startsWith(latin, i));
    if (hit) {
      out += hit[1];
      i += hit[0].length;
      continue;
    }
    out += LAT[text[i]] ?? "";
    i += 1;
  }
  return out;
}

function properNouns(): Set<string> {
  const proper = new Set<string>();
  const dir = new URL("../../scripts/glossary/", import.meta.url);
  let names: string[] = [];
  try {
    names = readdirSync(dir).filter((name) => name.endsWith(".json"));
  } catch {
    return proper;
  }
  for (const name of names) {
    const data = JSON.parse(readFileSync(new URL(name, dir), "utf8")) as { proper?: string[] };
    for (const word of data.proper ?? []) proper.add(word.toLowerCase());
  }
  return proper;
}

function glossaryWords(): Map<string, string> {
  const words = new Map<string, string>();
  const dir = new URL("../../scripts/glossary/", import.meta.url);
  let names: string[] = [];
  try {
    names = readdirSync(dir).filter((name) => name.endsWith(".json") && name.startsWith("gap_"));
  } catch {
    return words;
  }
  for (const name of names) {
    const data = JSON.parse(readFileSync(new URL(name, dir), "utf8")) as { words?: Record<string, string> };
    for (const [key, value] of Object.entries(data.words ?? {})) words.set(key.toLowerCase(), value.toLowerCase());
  }
  return words;
}

function problems(english: string, russian: string, proper: Set<string>, glossary: Map<string, string>): string[] {
  const found: string[] = [];
  if (/[A-Za-z]/.test(russian)) found.push("латиница");
  const hay = new Set((russian.toLowerCase().match(/[а-яё]+/g) ?? []).filter((token) => token.length >= 3));
  const words = (english.match(/[A-Za-z]+/g) ?? []).map((word) => word.toLowerCase());
  const content = words.filter((word) => word.length >= 3 && !LOANS.has(word) && !proper.has(word) && (glossary.get(word) ?? "x") !== "");
  const hits = content.filter((word) => {
    const token = translit(word);
    return token.length >= 3 && hay.has(token);
  });
  const denied = hits.filter((word) => DENY.has(word));
  if (denied.length > 0) found.push(...denied);
  else if (content.length >= 2 && hits.length === content.length) found.push(...hits);
  return found;
}

function rows(name: string): { id?: string; name?: string; originalName?: string }[] {
  return JSON.parse(readFileSync(new URL(`./generated/${name}`, import.meta.url), "utf8")) as { id?: string; name?: string; originalName?: string }[];
}

describe("русские имена без транслита", () => {
  it("класс поборника, яогуай и экземплар названы установленными словами", () => {
    expect(CLASSES.find((item) => item.id === "champion")?.name).toBe("Поборник");
    const roster = JSON.parse(readFileSync(new URL("./generated/pf-roster.json", import.meta.url), "utf8")) as {
      ancestries: { id: string; name: string }[];
      classes: { id: string; name: string }[];
    };
    expect(roster.ancestries.find((item) => item.id === "yaoguai")?.name).toBe("Яогуай");
    expect(roster.classes.find((item) => item.id === "exemplar")?.name).toBe("Экземплар");
  });

  it("имена черт, заклинаний, предметов и происхождений не являются транслитом", () => {
    const proper = properNouns();
    const glossary = glossaryWords();
    const bad: string[] = [];
    for (const file of ["pf-lists.json", "pf-wide.json", "pf-backgrounds.json", "pf-cards.json"]) {
      for (const row of rows(file)) {
        if (!row.originalName || !row.name) continue;
        const hit = problems(row.originalName, row.name, proper, glossary);
        if (hit.length > 0) bad.push(`${file}:${row.id}:${row.name} ← ${hit.join(",")}`);
        if (bad.length > 40) break;
      }
      if (bad.length > 40) break;
    }
    expect(bad).toEqual([]);
  });
});
