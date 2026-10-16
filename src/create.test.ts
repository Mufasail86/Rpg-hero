import { describe, expect, it } from "vitest";
import { blankDraft } from "./types";
import { createCharacter, validateStep } from "./create";
import { armorClass, hpMax, initiativeOf, pointBuySpent, roll4d6, skillRows } from "./rules";

describe("кости и покупка", () => {
  it("4d6 отбрасывает меньшую кость", () => {
    const roll = roll4d6(() => 0);
    expect(roll.dice).toEqual([1, 1, 1, 1]);
    expect(roll.total).toBe(3);
  });

  it("покупка 15 стоит 9, восемь нулей не тратят бюджет", () => {
    expect(pointBuySpent({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 })).toBe(27);
    expect(pointBuySpent({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 })).toBe(0);
  });
});

describe("готовый персонаж", () => {
  it("создаёт воина D&D 5e от народа до снаряжения", () => {
    const draft = blankDraft();
    draft.system = "dnd5e";
    draft.name = "Вера Солдат";
    draft.ancestryId = "human";
    draft.choices.size = "Средний";
    draft.choices.humanSkill = "perception";
    draft.choices.humanFeat = "skilled";
    draft.multi.hskilled = ["acrobatics", "history", "nature"];
    draft.backgroundId = "soldier";
    draft.choices.abilityMethod = "standard";
    draft.choices.boostMode = "split";
    draft.choices.boost2 = "str";
    draft.choices.boost1 = "con";
    draft.scores = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
    draft.classId = "fighter";
    draft.choices.style = "defense";
    draft.multi.mastery = ["longsword", "longbow", "greatsword"];
    draft.multi.skills = ["insight", "survival"];
    draft.gearMode = "a";
    expect(validateStep(draft, "review")).toBeNull();
    const made = createCharacter(draft);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    const hero = made.character;
    expect(hero.abilities.str).toBe(17);
    expect(hero.abilities.con).toBe(14);
    expect(hpMax(hero)).toBe(12);
    expect(armorClass(hero).value).toBe(17);
    expect(initiativeOf(hero).value).toBe(2);
    expect(skillRows(hero).find((s) => s.id === "athletics")?.mod).toBe(5);
    expect(hero.hero).toBe(1);
    expect(hero.items.some((item) => item.catalogId === "chainmail" && item.equipped)).toBe(true);
    expect(hero.spellcasting).toBeNull();
  });

  it("создаёт друида Pathfinder 2e с повышениями и 21 хитом", () => {
    const draft = blankDraft();
    draft.system = "pf2e";
    draft.name = "Камень";
    draft.ancestryId = "dwarf";
    draft.heritageId = "rock";
    draft.choices.ancestryMode = "listed";
    draft.choices.ancFree = "dex";
    draft.choices.ancestryFeat = "dwarf-lore";
    draft.backgroundId = "acolyte";
    draft.choices.bgFixed = "wis";
    draft.choices.bgFree = "con";
    draft.choices.skillFeat = "student-canon";
    draft.classId = "druid";
    draft.choices.order = "animal";
    draft.choices.classFeat = "animal-companion";
    draft.choices.abilityMethod = "boost";
    draft.multi.freeBoosts = ["con", "str", "dex", "int"];
    draft.multi.skills = ["medicine", "stealth", "diplomacy"];
    draft.gearMode = "kit";
    draft.knownSpells = ["electric-arc", "produce-flame", "light", "stabilize", "guidance"];
    draft.preparedSpells = ["heal", "breathe-fire"];
    expect(validateStep(draft, "review")).toBeNull();
    const made = createCharacter(draft);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    const hero = made.character;
    expect(hero.abilities).toMatchObject({ str: 12, dex: 14, con: 16, int: 12, wis: 16, cha: 8 });
    expect(hpMax(hero)).toBe(21);
    expect(armorClass(hero).value).toBe(16);
    expect(skillRows(hero).find((s) => s.id === "nature")?.mod).toBe(6);
    expect(hero.hero).toBe(1);
    expect(hero.spellcasting?.listName).toBe("primal");
    expect(hero.speed).toBe(20);
  });
});
