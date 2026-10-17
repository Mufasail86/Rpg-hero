import { describe, expect, it } from "vitest";
import { ANCESTRIES, CLASSES } from "../data/pf2e";
import { rulesCatalog } from "../data/catalog";
import type { ItemInst, Pf2eProgress } from "../types";
import { derive, slotsForProgress } from "./build";

function bare(classId: string): Pf2eProgress {
  return {
    freeArchetype: false,
    ancestryId: "human",
    heritageId: "",
    backgroundId: "warrior",
    classId,
    keyAbility: classId === "wizard" || classId === "oracle" ? "int" : classId === "swashbuckler" ? "dex" : "str",
    toggles: [],
    dailyFeats: [],
    choices: [],
  };
}

function ids(classId: string, level: number): string[] {
  return slotsForProgress(bare(classId), level).map((slot) => slot.id);
}

function weapon(ranged: boolean): ItemInst {
  return {
    uid: ranged ? "bow" : "axe",
    name: ranged ? "Лук" : "Топор",
    qty: 1,
    weight: 1,
    equipped: true,
    kind: "weapon",
    weapon: { damage: ranged ? "1d6" : "1d8", attr: ranged ? "dex" : "str", category: "martial", ranged, group: ranged ? "bow" : "axe" },
  };
}

describe("слоты 2–20 и списки ремастера", () => {
  it("даёт черты класса всем классам по таблице книги", () => {
    expect(CLASSES.length).toBeGreaterThanOrEqual(28);
    for (const job of CLASSES) {
      const at20 = ids(job.id, 20);
      expect(at20.filter((id) => id.startsWith("class-feat-"))).not.toHaveLength(0);
      expect(at20).toContain("class-feat-20");
      expect(at20).toContain("general-feat-19");
      expect(at20).toContain("ancestry-feat-17");
    }
    expect(ids("barbarian", 20)).toEqual(expect.arrayContaining(["class-feat-1", "class-feat-20", "class-path"]));
    expect(ids("wizard", 1)).not.toContain("class-feat-1");
    expect(ids("wizard", 2)).toContain("class-feat-2");
    expect(ids("rogue", 1)).toContain("skill-feat-1");
    expect(ids("investigator", 1)).not.toContain("skill-feat-1");
    expect(ids("investigator", 2)).toContain("skill-feat-2");
    expect(ids("swashbuckler", 3)).toContain("skill-feat-3");
    expect(ids("fighter", 5)).toContain("weapon-group");
    expect(ids("wizard", 5)).not.toContain("weapon-group");
  });

  it("ярость яростного инстинкта бьёт ближний бой и не трогает выстрел", () => {
    const progress = bare("barbarian");
    progress.toggles = ["rage"];
    progress.choices = [{ id: "class-path", level: 1, source: "instinct", pick: "fury-instinct" }];
    const low = derive({ progress, items: [weapon(false), weapon(true)], level: 1 });
    expect(low.attacks.find((attack) => attack.name === "Топор")?.damage).toContain("ярость +3");
    expect(low.attacks.find((attack) => attack.name === "Лук")?.damage).not.toContain("ярость");
    const mid = derive({ progress, items: [weapon(false)], level: 7 });
    expect(mid.attacks[0].damage).toContain("ярость +7");
    const high = derive({ progress, items: [weapon(false)], level: 15 });
    expect(high.attacks[0].damage).toContain("ярость +13");
    const quiet = derive({ progress: { ...progress, toggles: [] }, items: [weapon(false)], level: 1 });
    expect(quiet.attacks[0].damage).not.toContain("ярость");
  });

  it("звериный инстинкт на 1 уровне числа ярости не даёт", () => {
    const progress = bare("barbarian");
    progress.toggles = ["rage"];
    progress.choices = [{ id: "class-path", level: 1, source: "instinct", pick: "animal-instinct" }];
    const sheet = derive({ progress, items: [weapon(false)], level: 1 });
    expect(sheet.attacks[0].damage).not.toContain("ярость");
    expect(sheet.issues.some((issue) => issue.kind === "limit" && issue.message.includes("не поднимает урон ярости"))).toBe(true);
    const later = derive({ progress, items: [weapon(false)], level: 7 });
    expect(later.attacks[0].damage).toContain("ярость +5");
  });

  it("стиль обучает навык, тайна обучает свой", () => {
    const style = bare("swashbuckler");
    style.choices = [{ id: "class-path", level: 1, source: "style", pick: "braggart" }];
    expect(derive({ progress: style, items: [], level: 1 }).skills.intimidation.rank).toBe("trained");
    const mystery = bare("oracle");
    mystery.choices = [{ id: "class-path", level: 1, source: "mystery", pick: "cosmos" }];
    const oracle = derive({ progress: mystery, items: [], level: 1 });
    expect(oracle.skills.nature.rank).toBe("trained");
    expect(oracle.issues.some((issue) => issue.message.includes("ячеек"))).toBe(false);
  });

  it("черта чужого класса не проходит, внезапный рывок воину остаётся", () => {
    const foreign = bare("fighter");
    foreign.choices = [{ id: "class-feat-1", level: 1, source: "class-feat", pick: "spellbook-prodigy" }];
    expect(derive({ progress: foreign, items: [], level: 1 }).issues.some((issue) => issue.message.includes("черта другого класса"))).toBe(true);
    const own = bare("fighter");
    own.choices = [{ id: "class-feat-1", level: 1, source: "class-feat", pick: "sudden-charge" }];
    const sheet = derive({ progress: own, items: [], level: 1 });
    expect(sheet.issues.some((issue) => issue.message.includes("черта другого класса"))).toBe(false);
    expect(sheet.feats.some((feat) => feat.name === "Внезапный рывок")).toBe(true);
  });

  it("зимнее наследие амурруна сверено и говорит о холоде", () => {
    const heritage = ANCESTRIES.find((item) => item.id === "catfolk")?.heritages.find((item) => item.id === "winter-catfolk");
    expect(heritage?.info).toContain("холод");
    expect(heritage?.info).not.toContain("Черновик");
    expect(heritage?.info.length).toBeGreaterThan(40);
  });

  it("пакет до ремастера отделён от ремастера", () => {
    const legacy = rulesCatalog().filter((entry) => entry.edition === "pf-legacy");
    expect(legacy.length).toBeGreaterThan(0);
    expect(legacy.every((entry) => entry.sourceId === "pf-ogl" && entry.status.startsWith("verified"))).toBe(true);
    expect(rulesCatalog().some((entry) => entry.edition === "pf-remaster" && entry.sourceId === "pf-ogl")).toBe(false);
    const rune = rulesCatalog().find((entry) => entry.edition === "pf-remaster" && entry.category === "rune");
    expect(rune?.status.startsWith("verified")).toBe(true);
    expect(rune?.text).toContain("не накладывает");
  });
});
