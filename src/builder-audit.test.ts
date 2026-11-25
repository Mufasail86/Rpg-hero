import { describe, expect, it } from "vitest";
import { blankDraft, type Ability } from "./types";
import { createCharacter, skillFeatAtCreation, validateStep } from "./create";
import { dndSpellBudget, halfSlots } from "./data/dnd5e";
import { premades } from "./beginner";
import { deriveProgress, sheetDnd, slotsForProgress } from "./dnd/build";
import { faceFromCharacter } from "./play/table";
import { snapshot } from "./pf2e/build";
import { armorClass, hpMax, refreshSlots, skillRows, spellNumbers } from "./rules";

function scores(partial: Partial<Record<Ability, number>>): Record<Ability, number> {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...partial };
}

describe("регрессия конструктора", () => {
  it("черта навыка на 1 уровне есть только у плута Pathfinder", () => {
    expect(skillFeatAtCreation("rogue")).toBe(true);
    expect(skillFeatAtCreation("fighter")).toBe(false);
    expect(skillFeatAtCreation("wizard")).toBe(false);

    const fighter = blankDraft();
    fighter.system = "pf2e";
    fighter.ancestryId = "human";
    fighter.heritageId = "versatile";
    fighter.choices.ancestryMode = "free";
    fighter.multi.ancestryBoosts = ["str", "con"];
    fighter.choices.ancestryFeat = "natural-ambition";
    fighter.choices.generalFeat = "fleet";
    fighter.backgroundId = "warrior";
    fighter.choices.bgFixed = "str";
    fighter.choices.bgFree = "con";
    fighter.classId = "fighter";
    fighter.choices.key = "str";
    fighter.choices.fighterSkill = "athletics";
    fighter.choices.classFeat = "sudden-charge";
    fighter.choices.abilityMethod = "boost";
    fighter.multi.freeBoosts = ["str", "dex", "con", "wis"];
    fighter.multi.skills = ["crafting", "medicine", "society"];
    expect(validateStep(fighter, "feats")).toBeNull();

    const rogue = blankDraft();
    rogue.system = "pf2e";
    rogue.classId = "rogue";
    rogue.ancestryId = "human";
    rogue.heritageId = "skilled";
    rogue.choices.humanSkill = "stealth";
    rogue.choices.ancestryFeat = "natural-ambition";
    expect(validateStep(rogue, "feats")).toMatch(/навык/);
  });

  it("новый лист D&D хранит историю уровней и четыре навыка плута", () => {
    const draft = blankDraft();
    draft.system = "dnd5e";
    draft.edition = "dnd-2024";
    draft.name = "Тихий";
    draft.ancestryId = "human";
    draft.choices.size = "Средний";
    draft.choices.humanSkill = "perception";
    draft.choices.humanFeat = "savage";
    draft.backgroundId = "criminal";
    draft.choices.abilityMethod = "standard";
    draft.choices.boostMode = "split";
    draft.choices.boost2 = "dex";
    draft.choices.boost1 = "int";
    draft.scores = scores({ str: 8, dex: 15, con: 14, int: 13, wis: 12, cha: 10 });
    draft.classId = "rogue";
    draft.multi.skills = ["acrobatics", "athletics", "deception", "investigation"];
    draft.multi.expertise = ["stealth", "acrobatics"];
    draft.multi.mastery = ["dagger", "shortsword"];
    draft.gearMode = "a";
    expect(validateStep(draft, "review")).toBeNull();
    const made = createCharacter(draft);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    expect(made.character.dnd?.choices.filter((choice) => choice.source === "skill" && choice.id.startsWith("skill-class"))).toHaveLength(4);
    expect(made.character.dnd?.choices.filter((choice) => choice.source === "expertise")).toHaveLength(2);
    const sheet = sheetDnd(made.character, 5);
    expect(sheet?.pb).toBe(3);
    expect(sheet?.skills.stealth.rank).toBe("expertise");
    expect(sheet?.skills.acrobatics.rank).toBe("expertise");
    expect(sheet?.skills.athletics.rank).toBe("proficient");
    expect(sheet?.skills.perception.rank).toBe("proficient");
    expect(sheet?.hp.value).toBe(8 + 2 + (5 + 2) * 4);
  });

  it("паладин и следопыт 2014 года на 1 уровне без ячеек, в 2024 они уже есть", () => {
    expect(halfSlots(1, "dnd-2014")).toEqual([]);
    expect(halfSlots(2, "dnd-2014")).toEqual([2]);
    expect(halfSlots(5, "dnd-2014")).toEqual([4, 2]);
    expect(halfSlots(1)).toEqual([2]);
    const progress = {
      speciesId: "human",
      backgroundId: "soldier",
      classId: "paladin",
      subclassId: "",
      edition: "dnd-2014" as const,
      base: scores({ str: 16, cha: 14 }),
      speed: 30,
      toggles: [],
      choices: [],
    };
    expect(deriveProgress(progress, [], {}, [], 1).slots).toEqual([]);
    expect(deriveProgress({ ...progress, edition: "dnd-2024" }, [], {}, [], 1).slots).toEqual([{ rank: 1, max: 2 }]);
    expect(deriveProgress(progress, [], {}, [], 1).resources.find((item) => item.id === "wind")).toBeUndefined();
  });

  it("дварф получает +1 хит за уровень, а не +2 как от черты Живучесть", () => {
    const draft = blankDraft();
    draft.system = "dnd5e";
    draft.name = "Камень";
    draft.ancestryId = "dwarf";
    draft.backgroundId = "soldier";
    draft.choices.abilityMethod = "standard";
    draft.choices.boostMode = "split";
    draft.choices.boost2 = "str";
    draft.choices.boost1 = "con";
    draft.scores = scores({ str: 15, dex: 10, con: 14, int: 8, wis: 13, cha: 12 });
    draft.classId = "fighter";
    draft.choices.style = "defense";
    draft.multi.skills = ["insight", "survival"];
    draft.multi.mastery = ["longsword", "handaxe", "spear"];
    draft.gearMode = "a";
    const made = createCharacter(draft);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    expect(made.character.abilities.con).toBe(15);
    expect(hpMax(made.character)).toBe(10 + 2 + 1);
    expect(sheetDnd(made.character)?.hp.value).toBe(13);
    const raised = { ...made.character, level: 5 };
    expect(sheetDnd(raised)?.hp.value).toBe(10 + 2 + (6 + 2) * 4 + 5);
  });

  it("воин Pathfinder на 1 уровне эксперт в восприятии и без лишней черты навыка", () => {
    const draft = blankDraft();
    draft.system = "pf2e";
    draft.name = "Страж";
    draft.ancestryId = "human";
    draft.heritageId = "versatile";
    draft.versatileHeritageId = "nephilim";
    draft.choices.ancestryMode = "free";
    draft.multi.ancestryBoosts = ["str", "con"];
    draft.choices.ancestryFeat = "natural-ambition";
    draft.choices.generalFeat = "fleet";
    draft.backgroundId = "warrior";
    draft.choices.bgFixed = "str";
    draft.choices.bgFree = "dex";
    draft.classId = "fighter";
    draft.choices.key = "str";
    draft.choices.fighterSkill = "athletics";
    draft.choices.classFeat = "sudden-charge";
    draft.choices.abilityMethod = "boost";
    draft.multi.freeBoosts = ["str", "dex", "con", "wis"];
    draft.multi.skills = ["medicine", "crafting", "society"];
    draft.gearMode = "kit";
    expect(validateStep(draft, "review")).toBeNull();
    const made = createCharacter(draft);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    expect(made.character.abilities.str).toBe(18);
    expect(made.character.perceptionRank).toBe("expert");
    expect(made.character.feats.some((feat) => feat.id === "fleet")).toBe(true);
    expect(made.character.versatileHeritageId).toBe("nephilim");
    expect(skillRows(made.character).find((row) => row.id === "athletics")?.mod).toBe(7);
    expect(hpMax(made.character)).toBe(8 + 10 + 2);
    expect(armorClass(made.character).value).toBeGreaterThanOrEqual(10);
    const slots = slotsForProgress({
      speciesId: "human",
      backgroundId: "soldier",
      classId: "rogue",
      subclassId: "",
      base: scores({}),
      speed: 30,
      toggles: [],
      choices: [],
    }, 1);
    expect(slots.filter((slot) => slot.id.startsWith("skill-class"))).toHaveLength(4);
  });

  it("считает заговоры с 4 уровня и подготовленные заклинания чародея 2024 отдельно от списка 2014", () => {
    expect(dndSpellBudget("wizard", 1, "dnd-2024", 3).cantrips).toBe(3);
    expect(dndSpellBudget("wizard", 4, "dnd-2024", 3).cantrips).toBe(4);
    expect(dndSpellBudget("wizard", 9, "dnd-2024", 3).cantrips).toBe(4);
    expect(dndSpellBudget("wizard", 10, "dnd-2024", 3).cantrips).toBe(5);
    expect(dndSpellBudget("sorcerer", 1, "dnd-2024", 3)).toMatchObject({ kind: "prepared", prepare: 2, cantrips: 4 });
    expect(dndSpellBudget("sorcerer", 5, "dnd-2024", 3)).toMatchObject({ prepare: 8, cantrips: 5 });
    expect(dndSpellBudget("sorcerer", 1, "dnd-2014", 3)).toMatchObject({ kind: "known", known: 2, prepare: 0 });
    expect(dndSpellBudget("sorcerer", 10, "dnd-2014", 3).known).toBe(11);
    expect(dndSpellBudget("sorcerer", 12, "dnd-2014", 3).known).toBe(12);
    expect(dndSpellBudget("bard", 1, "dnd-2014", 2)).toMatchObject({ kind: "known", known: 4, prepare: 0 });
    expect(dndSpellBudget("bard", 10, "dnd-2014", 5).known).toBe(14);
    expect(dndSpellBudget("warlock", 10, "dnd-2014", 3).known).toBe(10);
    expect(dndSpellBudget("warlock", 10, "dnd-2024", 3).known).toBe(11);
    expect(dndSpellBudget("ranger", 1, "dnd-2014", 2)).toMatchObject({ kind: "known", known: 0, prepare: 0 });
    expect(dndSpellBudget("ranger", 5, "dnd-2014", 3).known).toBe(4);
    expect(dndSpellBudget("ranger", 1, "dnd-2024", 3)).toMatchObject({ kind: "prepared", prepare: 2 });
    expect(dndSpellBudget("paladin", 1, "dnd-2014", 3).prepare).toBe(0);
    expect(dndSpellBudget("paladin", 2, "dnd-2014", 3).prepare).toBe(4);
    expect(dndSpellBudget("paladin", 5, "dnd-2024", 3).prepare).toBe(5);
  });

  it("волшебник D&D 2024 готовит четыре заклинания и пишет шесть в книгу на 1 уровне", () => {
    const draft = blankDraft();
    draft.system = "dnd5e";
    draft.edition = "dnd-2024";
    draft.name = "Искра";
    draft.ancestryId = "human";
    draft.choices.size = "Средний";
    draft.choices.humanSkill = "perception";
    draft.choices.humanFeat = "savage";
    draft.backgroundId = "criminal";
    draft.choices.abilityMethod = "standard";
    draft.choices.boostMode = "split";
    draft.choices.boost2 = "int";
    draft.choices.boost1 = "con";
    draft.scores = scores({ str: 8, dex: 13, con: 14, int: 15, wis: 12, cha: 10 });
    draft.classId = "wizard";
    draft.multi.skills = ["arcana", "investigation"];
    draft.knownSpells = ["fire-bolt", "mage-hand", "prestidigitation", "magic-missile", "shield", "mage-armor", "detect-magic", "sleep", "thunderwave"];
    draft.preparedSpells = ["magic-missile", "shield", "mage-armor", "sleep"];
    draft.gearMode = "a";
    expect(validateStep(draft, "review")).toBeNull();
    const made = createCharacter(draft);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    expect(made.character.abilities.int).toBe(17);
    expect(made.character.spellcasting).toMatchObject({ kind: "book", prepareLimit: 4, knownLimit: 6, cantripLimit: 3 });
    expect(spellNumbers(made.character)).toMatchObject({ attack: 5, dc: 13 });
    expect(sheetDnd(made.character)?.attacks.find((row) => row.name === "Кинжал")?.traits).toBe("Надрез");
    expect(made.character.slots.map((slot) => slot.max)).toEqual([2]);
    const fifth = refreshSlots({ ...made.character, level: 5 });
    expect(fifth.spellcasting).toMatchObject({ prepareLimit: 8, knownLimit: 14, cantripLimit: 4 });
    expect(fifth.slots.map((slot) => slot.max)).toEqual([4, 3, 2]);
    expect(spellNumbers(fifth)).toMatchObject({ attack: 6, dc: 14 });
  });

  it("лист плута и экран «Сейчас» не показывают английские свойства оружия", () => {
    const rogue = premades("dnd5e").find((item) => item.id === "dnd-rogue");
    const made = createCharacter(rogue!.draft);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    const sheet = sheetDnd(made.character);
    const face = faceFromCharacter(made.character);
    const lines = [
      ...(sheet?.attacks ?? []).map((row) => `${row.name} ${row.traits} ${row.damage}`),
      ...face.strikes.map((row) => `${row.name} ${row.traits} ${row.damage}`),
    ];
    expect(lines.join("\n")).not.toMatch(/\b(nick|vex|sap|topple|slow|graze|cleave|push)\b/);
    expect(lines.join(" ")).toMatch(/Надрез/);
    expect(lines.join(" ")).toMatch(/Досада/);
  });

  it("воин Pathfinder на 10 уровне получает повышения 5 и 10 и остаётся 10 уровня", () => {
    const hero = premades("pf2e").find((item) => item.id === "pf-fighter");
    const made = createCharacter(structuredClone(hero!.draft));
    expect(made.ok).toBe(true);
    if (!made.ok || !made.character.progress) return;
    const picks = ["str", "dex", "con", "wis"];
    const added = [5, 10].flatMap((level) => picks.map((pick, index) => ({
      id: `boost-${level}-free-${index}`,
      level,
      source: "free-boost",
      pick,
    })));
    const raised = snapshot(refreshSlots({
      ...made.character,
      level: 10,
      progress: { ...made.character.progress, choices: [...made.character.progress.choices, ...added] },
    }));
    expect(raised.level).toBe(10);
    expect(raised.name).toBe("Марта Щит");
    expect(raised.abilities.str).toBe(20);
    expect(raised.abilities.con).toBe(18);
    expect(hpMax(raised)).toBe(8 + (10 + 4) * 10);
  });
});
