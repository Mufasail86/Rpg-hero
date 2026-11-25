import { describe, expect, it } from "vitest";
import { fillStep } from "./beginner";
import { createCharacter, creationSpellOptions, creationSpellSelection, scoresOf, toggleCreationSpell, validateStep } from "./create";
import { CLASSES as DND, dndSpellBudget } from "./data/dnd5e";
import { CLASSES as PF } from "./data/pf2e";
import { tutorialSpells, tutorialSpellStatus } from "./data/tutorial-spells";
import { sheetDnd } from "./dnd/build";
import { atTrainingLevel, trainingBuild } from "./play/training-character";
import { battleRoller, heroActor, startTactical } from "./play/tactical";
import { fillTrainingChoices } from "./ui/training-development";
import { blankDraft, type Draft } from "./types";

function ready(d: Draft): Draft {
  const result = structuredClone(d);
  for (const step of ["abilities", "skills", "feats", "gear", "spells"] as const) Object.assign(result, fillStep(result, step));
  return result;
}

function dnd(classId: string) {
  const d = blankDraft();
  Object.assign(d, { system: "dnd5e", edition: "dnd-2024", name: "Свой герой", ancestryId: "elf", backgroundId: "criminal", classId });
  d.choices = { lineage: "high", lineageAbility: "int", elfSkill: "perception", order: classId === "druid" ? "magician" : classId === "cleric" ? "protector" : "" };
  return ready(d);
}

function pf(cls: (typeof PF)[number]) {
  const d = blankDraft();
  Object.assign(d, { system: "pf2e", edition: "pf-remaster", name: "Свой герой", ancestryId: "dwarf", heritageId: "rock", backgroundId: "acolyte", classId: cls.id });
  d.choices = { ancestryMode: "listed", ancestryFeat: "dwarf-lore", fighterSkill: "athletics", key: cls.key[0], rogueKey: cls.key[0] };
  for (const choice of cls.choices) d.choices[choice.id] = choice.options[0]?.id ?? "";
  return ready(d);
}

function save(draft: Draft) {
  expect(validateStep(draft, "review")).toBeNull();
  const created = createCharacter(draft);
  if (!created.ok) throw new Error(created.error);
  return created.character;
}

describe("новый лист каждого включённого класса", () => {
  it.each(DND.map(cls => [cls.name, cls.id] as const))("D&D 2024: %s", (_, id) => {
    const draft = dnd(id);
    const hero = save(draft);
    expect(hero.rules?.edition).toBe("dnd-2024");
    expect(hero.spells.every(spell => spell.level <= 1)).toBe(true);
    expect(trainingBuild(hero)?.issues.filter(row => row.kind === "build")).toEqual([]);
    expect(hero.skillRanks.perception).toBe("proficient");
  });

  it.each(PF.map(cls => [cls.name, cls] as const))("Pathfinder Remaster: %s", (_, cls) => {
    const draft = pf(cls);
    const hero = save(draft);
    expect(hero.rules?.edition).toBe("pf-remaster");
    expect(hero.spells.every(spell => spell.level <= 1)).toBe(true);
    expect(creationSpellSelection(draft).invalid).toEqual([]);
    expect(hero.classId).toBe(cls.id);
  });
});

describe("пограничные сценарии из замечаний игроков", () => {
  it("не превращает недоступное заклинание колдуна в третий заговор", () => {
    const d = dnd("warlock");
    expect(dndSpellBudget("warlock", 1, "dnd-2024", 3)).toMatchObject({ cantrips: 2, known: 2 });
    expect(creationSpellOptions(d).map(spell => spell.id)).toContain("hellish-rebuke");
    expect(creationSpellOptions(d).map(spell => spell.id)).not.toContain("elementalism");
    expect(toggleCreationSpell(d, "knownSpells", "elementalism")).toEqual({});
    d.knownSpells.push("elementalism");
    expect(creationSpellSelection(d)).toMatchObject({ cantrips: 2, leveled: 2, invalid: [{ id: "elementalism", name: "Стихийность" }] });
    expect(validateStep(d, "spells")).toMatch(/Стихийность/);
    Object.assign(d, toggleCreationSpell(d, "knownSpells", "elementalism"));
    expect(validateStep(d, "spells")).toBeNull();
  });

  it("сохраняет Договор книги отдельно, не назначая покровителя на первом уровне", () => {
    const d = dnd("warlock");
    d.choices.invocation = "pact-of-the-tome";
    d.multi.tomeSpells = ["elementalism", "druidcraft", "guidance", "find-familiar", "identify"];
    d.knownSpells = ["eldritch-blast", "mage-hand", "hex", "hellish-rebuke"];
    const hero = save(d);
    expect(hero.features.map(row => row.name)).toContain("Договор книги");
    expect(hero.spells.map(row => row.id)).toEqual(expect.arrayContaining(d.multi.tomeSpells));
    expect(hero.preparedIds).toEqual(expect.arrayContaining(["find-familiar", "identify"]));
    expect(hero.dnd?.subclassId).toBe("");
    expect(sheetDnd(hero, 1)?.issues.map(row => row.message)).not.toContain("С 3 уровня нужен подкласс.");
    expect(sheetDnd(hero, 3)?.issues.map(row => row.message)).toContain("С 3 уровня нужен подкласс.");
  });

  it("не записывает и не готовит 7-й круг на первом уровне Pathfinder", () => {
    const d = pf(PF.find(cls => cls.id === "cleric")!);
    expect(toggleCreationSpell(d, "preparedSpells", "angel-form")).toEqual({});
    d.preparedSpells = ["angel-form", "heal"];
    expect(creationSpellSelection(d)).toMatchObject({ prepared: 1, invalid: [{ id: "angel-form" }] });
    expect(validateStep(d, "spells")).toMatch(/Уберите недоступные/);
  });

  it("не принимает чужой классовый навык или повтор непродублируемой черты", () => {
    const d = dnd("rogue");
    d.multi.skills[0] = "medicine";
    expect(validateStep(d, "skills")).toMatch(/недоступный/);
    d.ancestryId = "human"; d.choices.humanSkill = "perception"; d.choices.humanFeat = "alert";
    expect(validateStep(d, "feats")).toMatch(/уже дана/);
  });

  it("считает исходную Ловкость и прибавку, а не выдаёт ещё +1 от эльфа", () => {
    const d = dnd("rogue");
    expect(scoresOf(d)).toMatchObject({ scores: { dex: 17 } });
    d.choices.abilityMethod = "roll";
    d.scores.dex = 16;
    d.pool = Object.values(d.scores);
    expect(scoresOf(d)).toMatchObject({ scores: { dex: 18 } });
  });

  it("свой плут начинает бой на 1-м и 20-м уровнях; исходный лист не меняется", () => {
    const source = save(dnd("rogue"));
    const before = structuredClone(source);
    for (const level of [1, 20]) {
      const hero = level === 1 ? atTrainingLevel(source, level) : fillTrainingChoices(atTrainingLevel(source, level));
      expect(trainingBuild(hero)?.issues.filter(row => row.kind === "build")).toEqual([]);
      const fight = startTactical(hero, { map: "arena", difficulty: "easy", scenario: "duel" }, battleRoller(false, [], [20, 1]));
      expect(heroActor(fight).name).toBe(source.name);
    }
    expect(source).toEqual(before);
  });

  it("называет неавтоматизированную магию, не выдавая её за неподготовленную", () => {
    const hero = save(dnd("warlock"));
    const playable = tutorialSpells(hero);
    expect(tutorialSpellStatus(hero, "eldritch-blast", playable)).toMatch(/не автоматизировано/);
  });
});
