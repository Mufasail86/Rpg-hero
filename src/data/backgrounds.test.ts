import { describe, expect, it } from "vitest";
import { BACKGROUNDS as BG5, BACKGROUNDS_2014 } from "./dnd5e";
import { BACKGROUNDS as BG2 } from "./pf2e";
import { rulesCatalog } from "./catalog";

describe("происхождения", () => {
  it("ремастер ORC разобран по книгам и выбирается целиком", () => {
    const byBook = new Map<string, number>();
    for (const row of BG2) byBook.set(row.book, (byBook.get(row.book) ?? 0) + 1);
    expect(BG2).toHaveLength(147);
    expect(Object.fromEntries(byBook)).toEqual({
      "Ядро игрока": 40,
      "Ядро игрока 2": 23,
      "Пушки и шестерни": 39,
      "Тянь-Ся": 20,
      "Боевой клич": 13,
      "Соперничающие академии": 9,
      "Тёмный архив": 3,
    });
    expect(BG2.some((row) => row.book === "Ядро ведущего")).toBe(false);
    expect(BG2.every((row) => row.sourceVersion === "Player Core" || row.sourceVersion === "ORC")).toBe(true);
    expect(BG2.filter((row) => row.sourceId === "pf-player-core")).toHaveLength(40);
    expect(new Set(BG2.map((row) => row.id)).size).toBe(147);
    expect(BG2.find((row) => row.id === "warrior")?.skills).toEqual(["intimidation"]);
    expect(BG2.find((row) => row.id === "field-medic")?.feats[0]?.id).toBe("battle-medicine");
    expect(BG2.find((row) => row.id === "acolyte")?.name).toBe("Послушник");
    expect(BG2.find((row) => row.id === "driver")?.name).toBe("Водитель");
    expect(BG2.find((row) => row.id === "saboteur")?.name).toBe("Диверсант");
    const verified = rulesCatalog().filter((entry) => entry.category === "background" && entry.edition === "pf-remaster");
    expect(verified).toHaveLength(147);
    expect(verified.every((entry) => entry.status === "verified-reference" && entry.checkedOn === "2026-10-16")).toBe(true);
  });

  it("справочники D&D держат свои списки отдельно", () => {
    expect(BG5.map((row) => row.id).sort()).toEqual(["acolyte", "criminal", "sage", "soldier"]);
    expect(BACKGROUNDS_2014.map((row) => row.id)).toEqual(["acolyte"]);
    expect(BACKGROUNDS_2014[0]?.skills).toEqual(["insight", "religion"]);
    expect(BACKGROUNDS_2014[0]?.abilities).toEqual([]);
    const legacy = rulesCatalog().find((entry) => entry.token === "dnd-2014~background~acolyte");
    expect(legacy?.sourceId).toBe("srd-5.1");
    expect(legacy?.status).toBe("verified-reference");
    expect(rulesCatalog().find((entry) => entry.token === "dnd-2024~background~soldier")?.sourceId).toBe("srd-5.2");
  });
});
