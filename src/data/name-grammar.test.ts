import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Имена Pathfinder должны читаться по-русски, а не как слова подряд из словаря.
 * Раньше было «Яростный месть», «Щит вера», «Алдори дуэлянт посвящение».
 *
 * Словарь словоформ (scripts/glossary/grammar-lexicon.json) собирает
 * scripts/build_grammar_lexicon.py. В нём только однозначные формы:
 * - adj: прилагательное в именительном падеже и его род (m, f, n) или «p» — множественное;
 * - noun: существительное и его род или «p»;
 * - nominative: существительные, которые бывают только в именительном падеже.
 */

type Lexicon = { adj: Record<string, string>; noun: Record<string, string>; nominative: string[] };
type Row = { id?: string; name?: string; originalName?: string; kind?: string; category?: string };

const LEX = JSON.parse(readFileSync(new URL("../../scripts/glossary/grammar-lexicon.json", import.meta.url), "utf8")) as Lexicon;
const NOMINATIVE = new Set(LEX.nominative);

function read<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`./generated/${name}`, import.meta.url), "utf8")) as T;
}

/** Найти пары слов, которые явно не согласованы. */
export function grammarSlips(name: string): string[] {
  const found: string[] = [];
  for (const chunk of name.split(/[(),;:!?.«»—–"]/)) {
    const words = (chunk.match(/[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)*/g) ?? []).map((word) => word.toLowerCase());
    for (let i = 0; i + 1 < words.length; i += 1) {
      const [left, right] = [words[i], words[i + 1]];
      const adj = LEX.adj[left];
      const noun = LEX.noun[right];
      if (adj && noun && ![...adj].some((tag) => noun.includes(tag))) found.push(`${left} ${right}`);
      if (LEX.noun[left] && NOMINATIVE.has(right)) found.push(`${left} ${right}`);
    }
  }
  return found;
}

function collect(node: unknown, bag: Row[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collect(item, bag);
    return;
  }
  if (!node || typeof node !== "object") return;
  const row = node as Row & Record<string, unknown>;
  if (typeof row.name === "string") bag.push(row);
  for (const value of Object.values(row)) {
    if (value && typeof value === "object") collect(value, bag);
  }
}

const PF_FILES = [
  "pf-lists.json",
  "pf-wide.json",
  "pf-cards.json",
  "pf-core.json",
  "pf-legacy.json",
  "pf-backgrounds.json",
  "pf-class-features.json",
  "pf-paths.json",
  "pf-feat-index.json",
  "pf-feat-wide.json",
  "pf-roster.json",
  "pf-heritages.json",
];

function pfRows(): Row[] {
  const rows: Row[] = [];
  for (const file of PF_FILES) collect(read(file), rows);
  return rows;
}

describe("имена Pathfinder согласованы по-русски", () => {
  it("проверка ловит старые ошибки и пропускает правильные имена", () => {
    expect(grammarSlips("Яростный месть")).not.toEqual([]);
    expect(grammarSlips("Щит вера")).not.toEqual([]);
    expect(grammarSlips("Голос природа")).not.toEqual([]);
    expect(grammarSlips("Стремительный добыча")).not.toEqual([]);
    expect(grammarSlips("Яростная месть")).toEqual([]);
    expect(grammarSlips("Щит веры")).toEqual([]);
    expect(grammarSlips("Голос природы")).toEqual([]);
    expect(grammarSlips("Стремительная добыча")).toEqual([]);
  });

  it("примеры из аудита названы правильно", () => {
    const cards = read<Row[]>("pf-cards.json");
    const byId = new Map(cards.map((row) => [row.id, row.name]));
    expect(byId.get("furious-vengeance")).toBe("Яростная месть");
    expect(byId.get("shield-of-faith")).toBe("Щит веры");
    expect(byId.get("aldori-duelist-dedication")).toBe("Посвящение дуэлянта Алдори");
    expect(byId.get("acrobat-dedication")).toBe("Посвящение акробата");
    const wide = read<Row[]>("pf-wide.json");
    expect(wide.find((row) => row.id === "avenger-of-wrath")?.name).toBe("Мститель гнева");
    const roster = read<{ ancestries: { heritages?: Row[] }[] }>("pf-roster.json");
    const heritages = roster.ancestries.flatMap((row) => row.heritages ?? []);
    expect(heritages.find((row) => row.id === "vine-leshy")?.name).toBe("Лозовый леший");
  });

  it("ни в одном видимом имени нет несогласованных пар слов", () => {
    const bad = new Set<string>();
    for (const row of pfRows()) {
      const slips = grammarSlips(row.name ?? "");
      if (slips.length > 0) bad.add(`${row.name} → ${slips.join(", ")}`);
    }
    expect([...bad].slice(0, 20)).toEqual([]);
  });

  it("посвящения начинаются со слова «Посвящение», без хвоста в конце", () => {
    const bad: string[] = [];
    for (const row of pfRows()) {
      const name = row.name ?? "";
      if (/\sпосвящение$/i.test(name)) bad.push(name);
      if ((row.kind === "dedication" || /Dedication$/.test(row.originalName ?? "")) && !name.startsWith("Посвящение")) bad.push(name);
    }
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it("нет заглушек вместо имени", () => {
    const bad = pfRows()
      .filter((row) => row.name === "особенность класса" || (row.name === "Заклинание" && row.originalName && row.originalName !== "Spell"))
      .map((row) => row.originalName ?? row.id ?? "");
    expect(bad).toEqual([]);
  });

  it("одна и та же черта зовётся одинаково в списке и в указателе", () => {
    const main = new Map<string, string>();
    for (const file of ["pf-lists.json", "pf-wide.json", "pf-cards.json"]) {
      for (const row of read<Row[]>(file)) if (row.id && row.name && !main.has(row.id)) main.set(row.id, row.name);
    }
    const differ: string[] = [];
    for (const row of read<Row[]>("pf-feat-index.json")) {
      const name = row.id ? main.get(row.id) : undefined;
      if (name && name !== row.name) differ.push(`${row.id}: ${row.name} / ${name}`);
    }
    expect(differ.slice(0, 20)).toEqual([]);
  });
});
