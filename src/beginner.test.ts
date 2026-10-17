import { describe, expect, it } from "vitest";
import { blankDraft } from "./types";
import { createCharacter, validateStep } from "./create";
import { ancestryAdvice, fillStep, peopleSplit, plainWords, premades, starterDraft, TERMS, wizardOptions } from "./beginner";

describe("готовые герои новичка", () => {
  it("каждый премейд проходит проверку и создаёт лист", () => {
    const all = [...premades("pf2e"), ...premades("dnd5e")];
    expect(all.length).toBeGreaterThanOrEqual(8);
    for (const premade of all) {
      expect(validateStep(premade.draft, "review"), premade.id).toBeNull();
      const made = createCharacter(premade.draft);
      expect(made.ok, premade.id).toBe(true);
    }
  });

  it("быстрый старт подставляет имя и остаётся законным", () => {
    const started = starterDraft("pf2e", "боец", "Новенький");
    expect(started.draft.name).toBe("Новенький");
    expect(validateStep(started.draft, "review")).toBeNull();
  });

  it("«выбрать за меня» закрывает скучные шаги воина", () => {
    const draft = blankDraft();
    draft.system = "pf2e";
    draft.edition = "pf-remaster";
    draft.name = "Черновик";
    draft.ancestryId = "human";
    draft.heritageId = "skilled";
    draft.backgroundId = "warrior";
    draft.classId = "fighter";
    draft.choices = { key: "str", fighterSkill: "athletics", ancestryMode: "free" };
    const abilities = fillStep(draft, "abilities");
    const withAbilities = { ...draft, ...abilities, choices: { ...draft.choices, ...abilities.choices }, multi: { ...draft.multi, ...abilities.multi } };
    const skills = fillStep(withAbilities, "skills");
    const feats = fillStep(withAbilities, "feats");
    const gear = fillStep(withAbilities, "gear");
    const filled = {
      ...withAbilities,
      ...skills,
      ...feats,
      ...gear,
      choices: { ...withAbilities.choices, ...skills.choices, ...feats.choices },
      multi: { ...withAbilities.multi, ...skills.multi, ...feats.multi },
    };
    expect(validateStep(filled, "review")).toBeNull();
  });
});

describe("выбор народа", () => {
  it("ставит человека первым в советах и оставляет его в алфавитном списке", () => {
    for (const system of ["pf2e", "dnd5e"] as const) {
      const advice = ancestryAdvice(system);
      expect(advice[0]?.id).toBe("human");
      const people = [
        { id: "elf", name: "Эльф" },
        { id: "human", name: "Человек" },
        { id: "dwarf", name: "Дварф" },
        { id: "goblin", name: "Гоблин" },
      ];
      const open = peopleSplit(advice, people, "");
      expect(open.recommended[0]?.id).toBe("human");
      expect(open.all.map((item) => item.id)).toContain("human");
      const found = peopleSplit(advice, people, "человек", (item) => item.id === "human" ? "Human" : "");
      expect(found.recommended.map((item) => item.id)).toEqual(["human"]);
      expect(found.all.map((item) => item.id)).toEqual(["human"]);
    }
  });

  it("в редакции 2014 года человека можно выбрать, список не пустой запрет", () => {
    const draft = blankDraft();
    draft.system = "dnd5e";
    draft.edition = "dnd-2014";
    draft.ancestryId = "human";
    expect(validateStep(draft, "ancestry")).not.toMatch(/готовых народов нет/);
    const legacy = blankDraft();
    legacy.system = "pf2e";
    legacy.edition = "pf-legacy";
    legacy.ancestryId = "human";
    expect(validateStep(legacy, "ancestry")).not.toMatch(/готовых народов нет/);
    expect(validateStep(legacy, "ancestry")).toMatch(/наследие/);
  });
});

describe("словарь", () => {
  it("объясняет слова, на которых спотыкается новичок", () => {
    for (const id of ["ac", "dc", "save", "rank", "actions", "level", "boost", "archetype", "vitality"]) {
      expect(TERMS.some((term) => term.id === id)).toBe(true);
    }
  });

  it("простая строка карточки не возвращает заглушку", () => {
    const line = plainWords({ id: "heal", kind: "spell", summary: "Урон 1d8." });
    expect(line).toMatch(/хит/);
    expect(line).not.toMatch(/не перенесена|задано,|Из полей/);
    expect(plainWords({ id: "nimble-dodge", kind: "feat", trigger: "враг атакует" })).toMatch(/уклониться/);
  });

  it("мастер уровня ставит простые черты выше посвящений", () => {
    const shown = wizardOptions("class-feat", [
      { pick: "hellknight-dedication", name: "Адский клятвопреступник посвящение" },
      { pick: "reactive-shield", name: "Ответный щит" },
      { pick: "exacting-strike", name: "Точный удар" },
      { pick: "double-slice", name: "Двойной взмах" },
    ]);
    expect(shown.map((row) => row.pick)[0]).toBe("reactive-shield");
    expect(shown.some((row) => row.pick.includes("dedication"))).toBe(false);
    expect(shown[0]?.reason).toMatch(/щит/);
  });
});
