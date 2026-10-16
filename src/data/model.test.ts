import { describe, expect, it } from "vitest";
import { artefolCharacter } from "../pf2e/artefol";
import { guardCharacter } from "../dnd/guard";
import { migrateCharacter } from "../transfer";
import { allEntries, loreCatalog, packCounts, rulesCatalog, versatileIds } from "./catalog";
import { applyEdition, editionPreview, fold, rulesOf, sanitizeSources } from "./editions";
import { ANCESTRIES } from "./pf2e";
import { LINKS } from "./review";

describe("единая модель редакций", () => {
  it("складывает ё и е", () => {
    expect(fold("Ёлка")).toBe(fold("елка"));
    expect(fold("Лечение")).toBe("лечение");
  });

  it("не смешивает пакет другой редакции", () => {
    expect(sanitizeSources("pf-remaster", ["pf-player-core", "pf-ogl"])).toEqual(["pf-player-core"]);
    expect(sanitizeSources("dnd-2014", ["srd-5.2"])).toEqual(["srd-5.1"]);
  });

  it("миграция не трогает контрольные числа и ставит редакцию по умолчанию", () => {
    const pf = artefolCharacter();
    const next = migrateCharacter(pf);
    expect(next.abilities).toEqual(pf.abilities);
    expect(next.progress?.heritageId).toBe("skilled");
    expect(next.progress?.choices.length).toBe(pf.progress?.choices.length);
    expect(rulesOf(next).edition).toBe("pf-remaster");
    expect(rulesOf(next).sources).toEqual(["pf-player-core"]);
    const guard = migrateCharacter(guardCharacter());
    expect(guard.abilities).toEqual(guardCharacter().abilities);
    expect(rulesOf(guard).edition).toBe("dnd-2024");
  });

  it("смена редакции не переписывает лист и не прыгает в другую игру", () => {
    const hero = migrateCharacter(artefolCharacter());
    const preview = editionPreview(hero.system, "pf-remaster", "pf-legacy");
    expect(preview.ok).toBe(true);
    const switched = applyEdition(hero, "pf-legacy");
    if (!switched.ok) throw new Error(switched.error);
    expect(switched.character.rules?.edition).toBe("pf-legacy");
    expect(switched.character.abilities).toEqual(hero.abilities);
    expect(switched.character.progress).toEqual(hero.progress);
    expect(switched.character.name).toBe(hero.name);
    const foreign = applyEdition(hero, "dnd-2014");
    expect(foreign.ok).toBe(false);
  });

  it("жетоны уникальны, связи целы, универсальное наследие не занимает id гнома", () => {
    const entries = allEntries();
    const tokens = entries.map((entry) => entry.token);
    expect(new Set(tokens).size).toBe(tokens.length);
    const known = new Set(tokens);
    for (const link of LINKS) {
      expect(known.has(link.from)).toBe(true);
      expect(known.has(link.to)).toBe(true);
    }
    for (const entry of entries) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.sourceId.length).toBeGreaterThan(0);
      expect(entry.text.length).toBeGreaterThan(0);
      for (const relation of entry.relations) expect(known.has(relation)).toBe(true);
      if (entry.status.startsWith("verified")) {
        expect(entry.checkedOn).not.toBe("");
        expect(entry.originalName).not.toBe("");
      }
    }
    const heritageIds = new Set(ANCESTRIES.flatMap((ancestry) => ancestry.heritages.map((heritage) => heritage.id)));
    expect(heritageIds.has("umbral")).toBe(true);
    expect(ANCESTRIES.find((ancestry) => ancestry.id === "gnome")?.heritages.find((heritage) => heritage.id === "umbral")?.name).toBe("Сумеречный");
    for (const id of versatileIds()) expect(heritageIds.has(id)).toBe(false);
  });

  it("пустые пакеты не притворяются заполненными", () => {
    const counts = Object.fromEntries(packCounts().map((row) => [row.id, row.entered]));
    expect(counts["srd-5.2"]).toBeGreaterThan(0);
    expect(counts["pf-player-core"]).toBeGreaterThan(0);
    expect(counts["srd-5.1"]).toBe(0);
    expect(counts["pf-ogl"]).toBe(0);
    expect(counts["pf-orc-more"]).toBe(0);
    expect(counts["lore-golarion"]).toBe(0);
    expect(counts["lore-forgotten-realms"]).toBe(0);
    expect(loreCatalog()).toHaveLength(0);
    const verified = rulesCatalog().filter((entry) => entry.status.startsWith("verified"));
    expect(verified.length).toBe(12);
    const byToken = Object.fromEntries(rulesCatalog().map((entry) => [entry.token, entry]));
    expect(byToken["dnd-2024~spell~cure-wounds"].text).toContain("2d8");
    expect(byToken["dnd-2024~spell~false-life"].text).toContain("2d4 + 4");
    expect(byToken["dnd-2024~spell~false-life"].text).toContain("мгновенн");
    expect(byToken["dnd-2024~condition~exhaustion"].status).toBe("verified-partial");
    expect(byToken["dnd-2024~condition~exhaustion"].text).toContain("6");
    expect(byToken["dnd-2024~item~rope"].text).toContain("СЛ 10");
    expect(byToken["dnd-2024~item~rope"].text).toContain("СЛ 20");
    expect(byToken["dnd-2024~item~rope"].text).toContain("СЛ 15");
    expect(byToken["dnd-2024~mastery~topple"].text).toContain("8 +");
    expect(verified.every((entry) => entry.sourceVersion === "5.2.1" && entry.checkedOn === "2026-10-16")).toBe(true);
    expect(rulesCatalog().filter((entry) => entry.edition === "dnd-2024" || entry.edition === "pf-remaster").length).toBe(rulesCatalog().length);
    expect(packCounts()).toEqual([
      { id: "srd-5.2", entered: 240, verified: 12 },
      { id: "srd-5.1", entered: 0, verified: 0 },
      { id: "pf-player-core", entered: 266, verified: 0 },
      { id: "pf-orc-more", entered: 0, verified: 0 },
      { id: "pf-ogl", entered: 0, verified: 0 },
      { id: "lore-golarion", entered: 0, verified: 0 },
      { id: "lore-forgotten-realms", entered: 0, verified: 0 },
    ]);
  });
});
