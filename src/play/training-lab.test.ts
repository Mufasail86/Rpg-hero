import { describe, it, expect } from "vitest";
import { starterDraft } from "../beginner";
import { createCharacter } from "../create";
import { sheetDnd } from "../dnd/build";
import { atTrainingLevel, mergeTrainingChoices, trainingBuild } from "./training-character";
import { fillTrainingChoices } from "../ui/training-development";
import { DEFAULT_ENVIRONMENT, characterVision, sightAt, validEnvironment } from "./tactical-vision";
import { battleMap, lineOfSight } from "./tactical-map";
import { battleRoller, executeTactical, heroActor, startTactical, type TacticalSetup } from "./tactical";
import { equipTraining } from "./training";
import { tutorialSpellPool } from "../data/tutorial-spells";
import { RollRequired } from "./tactical";

function make(system: "pf2e" | "dnd5e", role: "боец" | "маг" | "целитель" = "боец") { const made = createCharacter(starterDraft(system, role, "Ученик").draft); if (!made.ok) throw Error(made.error); return made.character; }
const fixed = battleRoller(false, [], [20, 1, 1, 1]);
function start(hero = make("dnd5e"), environment = DEFAULT_ENVIRONMENT) { const setup: TacticalSetup = { map: "tavern", scenario: "dummy", difficulty: "easy", environment }; return startTactical(hero, setup, battleRoller(true, [20, 1, 1, 1])); }

describe("тренировочные уровни", () => {
  for (const system of ["dnd5e", "pf2e"] as const) for (const role of ["боец", "маг", "целитель"] as const) it(`${system}, ${role}: все 20 учебных вариантов без ошибок сборки`, () => {
    for (let level = 1; level <= 20; level++) {
      const source = atTrainingLevel(make(system, role), level), result = fillTrainingChoices(source);
      expect(trainingBuild(result)!.issues.filter(row => row.kind === "build"), `Уровень ${level}`).toEqual([]);
    }
  });
  for (const system of ["dnd5e", "pf2e"] as const) it(`${system}: 1–20, исходный лист не меняется`, () => {
    const source = make(system), before = structuredClone(source);
    for (let level = 1; level <= 20; level++) { const copy = atTrainingLevel(source, level); expect(copy.level).toBe(level); expect(trainingBuild(copy)?.hp.value).toBeGreaterThan(0); expect(copy.hpCurrent).toBe(trainingBuild(copy)?.hp.value); }
    expect(source).toEqual(before);
  });
  it("не подмешивает будущую черту и сохраняет её после возврата к низкому уровню", () => {
    const source = make("dnd5e"); source.dnd!.choices.push({ id: "asi-4", level: 4, source: "asi", pick: "str+2" });
    const low = atTrainingLevel(source, 1); expect(low.dnd!.choices.some(row => row.id === "asi-4")).toBe(false);
    const merged = mergeTrainingChoices(source, low); expect(atTrainingLevel(merged, 4).dnd!.choices.some(row => row.id === "asi-4")).toBe(true);
  });
  it("выдаёт воину 2/3/4 атаки на 5/11/20 уровне через существующий расчёт", () => {
    const source = make("dnd5e"); for (const [level, attacks] of [[5, 2], [11, 3], [20, 4]]) expect(sheetDnd(atTrainingLevel(source, level))?.attacksPerAction).toBe(attacks);
  });
  for (const system of ["dnd5e", "pf2e"] as const) it(`${system}: учебный вариант заполняет реальные слоты, не выдумывает черты`, () => {
    const source = atTrainingLevel(make(system), 5), before = structuredClone(source);
    const result = fillTrainingChoices(source);
    expect(source).toEqual(before);
    expect((result.dnd ?? result.progress)!.choices.length).toBeGreaterThan((source.dnd ?? source.progress)!.choices.length);
    expect(trainingBuild(result)!.issues.filter(row => row.kind === "build").length).toBeLessThan(trainingBuild(source)!.issues.filter(row => row.kind === "build").length);
  });
});

describe("свет и зрение", () => {
  const map = battleMap("arena"), from = { x: 2, y: 6 }, target = { x: 8, y: 3 };
  it("линия видимости взаимна, в том числе в точке округления возле опоры", () => { const a = { x: 4, y: 5 }, b = { x: 8, y: 3 }; expect(lineOfSight(map, a, b)).toEqual(lineOfSight(map, b, a)); expect(lineOfSight(map, a, b).visible).toBe(true); });
  it("берёт зрение и дальность из листа", () => { const hero = make("dnd5e"); hero.senses = "Тёмное зрение 120 футов"; expect(characterVision(hero)).toEqual({ kind: "darkvision", range: 120 }); });
  it("PF: сумрак скрывает от обычного зрения, но не от сумеречного", () => {
    const hero = make("pf2e"); expect(sightAt(map, from, target, hero, { ...DEFAULT_ENVIRONMENT, light: "dim", vision: "normal" }).concealed).toBe(true);
    expect(sightAt(map, from, target, hero, { ...DEFAULT_ENVIRONMENT, light: "dim", vision: "low-light" }).concealed).toBe(false);
  });
  it("сумеречное зрение не видит темноту, тёмное видит без цвета", () => {
    const hero = make("pf2e"); expect(sightAt(map, from, target, hero, { ...DEFAULT_ENVIRONMENT, light: "dark", vision: "low-light" }).visible).toBe(false);
    expect(sightAt(map, from, target, hero, { ...DEFAULT_ENVIRONMENT, light: "dark", vision: "darkvision" })).toMatchObject({ visible: true, monochrome: true });
  });
  it("D&D: тёмное зрение ограничено радиусом; сумрак не портит атаку", () => {
    const hero = make("dnd5e"); expect(sightAt(map, from, target, hero, { ...DEFAULT_ENVIRONMENT, light: "dark", vision: "darkvision", range: 5 }).visible).toBe(false);
    expect(sightAt(map, from, target, hero, { ...DEFAULT_ENVIRONMENT, light: "dim", vision: "normal" })).toMatchObject({ visible: true, concealed: false, dimPerception: true });
    expect(sightAt(map, from, target, hero, { ...DEFAULT_ENVIRONMENT, light: "dark", vision: "darkvision" }).dimPerception).toBe(true);
  });
  it("факел движется с героем, стены блокируют свет и тёмное зрение", () => {
    const hero = make("pf2e"), env = { ...DEFAULT_ENVIRONMENT, light: "dark", vision: "normal", torch: true } as const;
    expect(sightAt(map, from, { x: 3, y: 6 }, hero, env).light).toBe("bright");
    expect(sightAt(map, { x: 4, y: 3 }, { x: 6, y: 3 }, hero, env).visible).toBe(false);
    expect(sightAt(map, { x: 4, y: 3 }, { x: 6, y: 3 }, hero, { ...env, vision: "darkvision" }).visible).toBe(false);
  });
  it("не принимает повреждённую настройку", () => { expect(validEnvironment(DEFAULT_ENVIRONMENT)).toBe(true); expect(validEnvironment({ ...DEFAULT_ENVIRONMENT, range: Infinity })).toBe(false); });
  it("PF: атака в сумраке тратит действие при провале чистой проверки", () => {
    const hero = equipTraining(make("pf2e"), "dagger", "", false), state = start(hero, { ...DEFAULT_ENVIRONMENT, light: "dim", vision: "normal" });
    state.actors.find(row => row.id === "guard")!.pos = { x: 3, y: 6 };
    const result = executeTactical(hero, state, { type: "attack", target: "guard", weapon: 0 }, battleRoller(true, [1]));
    expect(heroActor(result).pf.actions).toBe(2); expect(result.log.at(-1)?.detail).toContain("СЛ 5"); expect(result.visuals).toEqual([]);
  });
});

describe("умения и визуальные результаты", () => {
  it("Второе дыхание тратит бонусное действие и ресурс, лечение ограничено максимумом", () => {
    const hero = make("dnd5e"), state = start(hero); heroActor(state).hp = 1;
    const result = executeTactical(hero, state, { type: "feature", feature: "wind" }, battleRoller(true, [5]));
    expect(heroActor(result).hp).toBe(7); expect(heroActor(result).dnd.bonus).toBe(false); expect(heroActor(result).dnd.resources.wind).toBe(heroActor(state).dnd.resources.wind - 1); expect(result.visuals?.[0].kind).toBe("heal");
    expect(() => executeTactical(hero, result, { type: "feature", feature: "wind" }, fixed)).toThrow();
  });
  it("Всплеск не появляется на первом уровне и не даёт магическое действие", () => {
    const first = make("dnd5e"); expect(() => executeTactical(first, start(first), { type: "feature", feature: "surge" }, fixed)).toThrow();
    const hero = atTrainingLevel(first, 2), state = start(hero); heroActor(state).dnd.action = false;
    const result = executeTactical(hero, state, { type: "feature", feature: "surge" }, fixed);
    expect(heroActor(result).extraActionAvailable).toBe(true);
    const defended = executeTactical(hero, result, { type: "action", action: "defend" }, fixed); expect(heroActor(defended).extraActionAvailable).toBe(false);
    const mage = make("dnd5e", "маг"); hero.spellcasting = mage.spellcasting;
    const spell = tutorialSpellPool("dnd5e", "wizard").find(row => row.id === "fire-bolt")!;
    hero.spells.push({ id: spell.id, name: spell.name, level: 0, info: spell.explanation, school: "", time: "", range: "", duration: "" });
    expect(() => executeTactical(hero, result, { type: "spell", spell: spell.id, targets: ["guard"] }, fixed)).toThrow("магическое действие");
  });
  it("отмена Второго дыхания до броска не лечит и не тратит ресурс", () => {
    const hero = make("dnd5e"), state = start(hero), before = structuredClone(state);
    expect(() => executeTactical(hero, state, { type: "feature", feature: "wind" }, battleRoller(true, []))).toThrow(RollRequired); expect(state).toEqual(before);
  });
  it("Всплеск даёт вторую полную серию атак и не используется дважды в ход", () => {
    const hero = atTrainingLevel(make("dnd5e"), 5), state = start(hero); state.actors.find(row => row.id === "guard")!.pos = { x: 3, y: 6 };
    let result = state; for (let i = 0; i < 2; i++) result = executeTactical(hero, result, { type: "attack", target: "guard", weapon: 0 }, battleRoller(true, [1]));
    expect(heroActor(result).dnd.action).toBe(false);
    result = executeTactical(hero, result, { type: "feature", feature: "surge" }, fixed);
    for (let i = 0; i < 2; i++) result = executeTactical(hero, result, { type: "attack", target: "guard", weapon: 0 }, battleRoller(true, [1]));
    expect(heroActor(result).dnd.action).toBe(false); expect(heroActor(result).extraActionAvailable).toBe(false);
    expect(() => executeTactical(hero, result, { type: "feature", feature: "surge" }, fixed)).toThrow();
  });
  it("зрительная Внимательность D&D в сумраке просит вторую кость, в PF — нет", () => {
    for (const system of ["dnd5e", "pf2e"] as const) { const hero = make(system), state = start(hero, { ...DEFAULT_ENVIRONMENT, light: "dim", vision: "normal" });
      const roll = () => executeTactical(hero, state, { type: "skill", skill: "perception", dc: 15, visual: true }, battleRoller(true, [12]));
      if (system === "dnd5e") expect(roll).toThrow(RollRequired); else expect(roll).not.toThrow();
    }
  });
  it("промах стрелы не превращается в попадание из-за анимации", () => {
    const hero = equipTraining(make("dnd5e"), "shortbow", "", false), state = start(hero);
    const result = executeTactical(hero, state, { type: "attack", target: "guard", weapon: 0 }, battleRoller(true, [1]));
    expect(result.visuals?.[0]).toMatchObject({ kind: "arrow", hit: false, from: { x: 2, y: 6 }, to: { x: 8, y: 3 } });
    expect(result.actors.find(row => row.id === "guard")!.hp).toBe(state.actors.find(row => row.id === "guard")!.hp);
  });
  it("проба навыка использует текущий лист и не тратит боевые действия", () => {
    for (const system of ["dnd5e", "pf2e"] as const) { const hero = atTrainingLevel(make(system), 5), state = start(hero);
      const result = executeTactical(hero, state, { type: "skill", skill: "athletics", dc: 15 }, battleRoller(true, [12]));
      expect(heroActor(result).pf).toEqual(heroActor(state).pf); expect(heroActor(result).dnd).toEqual(heroActor(state).dnd); expect(result.log.at(-1)?.title).toContain("Атлетика");
    }
  });
});
