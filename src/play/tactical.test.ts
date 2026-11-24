import { DiceRoll } from "@dice-roller/rpg-dice-roller";
import { describe, expect, it } from "vitest";
import { starterDraft } from "../beginner";
import { createCharacter } from "../create";
import { tutorialSpellPool, tutorialSpells } from "../data/tutorial-spells";
import { battleMap, findPath, gridDistance, lineOfSight, pathCost } from "./tactical-map";
import { RollRequired, battleRoller, executeTactical, heroActor, movePreview, rollBounds, spellArea, startTactical, type BattleRoller, type TacticalSetup, type TacticalState } from "./tactical";
import type { Character } from "../types";
import { readTacticalSave } from "./tactical-storage";
import { skillRows } from "../rules";

const setup: TacticalSetup = { map: "tavern", scenario: "dummy", difficulty: "easy" };
function hero(system: "pf2e" | "dnd5e" = "pf2e", role: "боец" | "маг" | "целитель" = "боец"): Character {
  const made = createCharacter(starterDraft(system, role, "Ученик").draft); if (!made.ok) throw new Error(made.error);
  const row = made.character;
  if (row.spellcasting) for (const spell of tutorialSpellPool(system, row.classId)) if (!row.spells.some(known => known.id === spell.id)) row.spells.push({ id: spell.id, name: spell.name, level: spell.rank, info: spell.explanation, school: "", time: "", range: "", duration: "" });
  return row;
}
const fixed = (natural = 12): BattleRoller => formula => formula === "1d20" ? natural : new DiceRoll(formula).minTotal;
function start(row: Character, config = setup) { let index = 0; return startTactical(row, config, () => index++ === 0 ? 20 : 1); }
function foeNear(state: TacticalState, x = 3, y = 6) { const foe = state.actors.find(row => row.id === "guard")!; foe.pos = { x, y }; foe.hp = 100; foe.maxHp = 100; foe.ac = 12; return foe; }

describe("клетчатая карта", () => {
  it("не ведёт через стены, столы, занятые клетки и закрытые углы", () => {
    const map = battleMap("tavern");
    expect(findPath(map, { x: 2, y: 6 }, { x: 4, y: 3 })).toEqual([]);
    const path = findPath(map, { x: 2, y: 6 }, { x: 7, y: 2 }, [{ x: 3, y: 5 }]);
    expect(path.length).toBeGreaterThan(1);
    expect(path.some(cell => map.tiles[cell.y][cell.x] === "table" || cell.x === 3 && cell.y === 5)).toBe(false);
    expect(findPath(map, { x: 2, y: 6 }, { x: 0, y: 6 })).toEqual([]);
  });
  it("разделяет диагонали PF и D&D и удваивает сложную местность", () => {
    expect(gridDistance({ x: 1, y: 1 }, { x: 3, y: 3 }, "pf2e")).toBe(15);
    expect(gridDistance({ x: 1, y: 1 }, { x: 3, y: 3 }, "dnd5e")).toBe(10);
    const map = battleMap("arena");
    expect(pathCost(map, [{ x: 1, y: 1 }, { x: 2, y: 2 }], "pf2e", 1).feet).toBe(10);
    expect(pathCost(map, [{ x: 5, y: 5 }, { x: 6, y: 5 }], "dnd5e").feet).toBe(10);
  });
  it("стены блокируют линию, а стол даёт укрытие", () => {
    expect(lineOfSight(battleMap("arena"), { x: 4, y: 3 }, { x: 6, y: 3 }).visible).toBe(false);
    expect(lineOfSight(battleMap("tavern"), { x: 3, y: 3 }, { x: 6, y: 3 }).cover).toBe(2);
  });
});

describe("учебные кости и сохранность", () => {
  it("просит результат своих костей и проверяет границы", () => {
    expect(rollBounds("2к6+3")).toEqual({ min: 5, max: 15 });
    expect(() => battleRoller(true, [])("1d20", "Атака")).toThrow(RollRequired);
    expect(() => battleRoller(true, [21])("1d20", "Атака")).toThrow("от 1 до 20");
    expect(() => rollBounds("999999d6")).toThrow(); expect(() => rollBounds("fetch('x')")).toThrow();
  });
  it("не меняет бой наполовину, когда следующий бросок ещё не введён", () => {
    const row = hero("dnd5e"), state = start(row); foeNear(state); const original = structuredClone(state), source = structuredClone(row);
    expect(() => executeTactical(row, state, { type: "attack", target: "guard", weapon: 0 }, battleRoller(true, [20]))).toThrow(RollRequired);
    expect(state).toEqual(original); expect(row).toEqual(source);
    const result = executeTactical(row, state, { type: "attack", target: "guard", weapon: 0 }, battleRoller(true, [20, 10]));
    expect(result.actors.find(row => row.id === "guard")!.hp).toBe(90);
  });
  it("свободные кости и пробные спасброски не тратят действия", () => {
    const row = hero(), state = start(row);
    const result = executeTactical(row, state, { type: "save", target: "hero", save: "ref", dc: 15 }, fixed());
    expect(heroActor(result).pf.actions).toBe(3);
    const free = executeTactical(row, result, { type: "roll", formula: "1к20+4" }, fixed());
    expect(heroActor(free).hp).toBe(heroActor(state).hp);
    expect(free.log.at(-1)?.detail).toContain("действия и здоровье не меняются");
  });
  it("сохраняет стол и подготовку, но отвергает другой лист или повреждённую очередь", () => {
    const state = start(hero()); const preferences = { weapon: "longsword", armor: "chainmail", shield: true, prepared: [], setup };
    const value = { source: "same", state, preferences };
    expect(readTacticalSave(JSON.stringify(value), "same")?.state).toEqual(state);
    expect(readTacticalSave(JSON.stringify(value), "changed")).toBeNull();
    state.order[0] = "unknown"; expect(readTacticalSave(JSON.stringify(value), "same")).toBeNull();
  });
  it("не открывает повреждённый учебный файл", () => {
    expect(readTacticalSave("{broken", "same")).toBeNull();
    const state = start(hero()); state.actors[0].pos.x = -1;
    expect(readTacticalSave(JSON.stringify({ source: "same", state, preferences: { weapon: "", armor: "", shield: false, prepared: [], setup } }), "same")).toBeNull();
  });
});

describe("перемещение и экономика", () => {
  it("PF тратит действие, D&D — движение; прыжок через всю карту запрещён", () => {
    for (const system of ["pf2e", "dnd5e"] as const) {
      const row = hero(system), state = start(row);
      const result = executeTactical(row, state, { type: "move", to: { x: 3, y: 6 } }, fixed());
      expect(heroActor(result).pos).toEqual({ x: 3, y: 6 });
      expect(system === "pf2e" ? heroActor(result).pf.actions : heroActor(result).dnd.action).toBe(system === "pf2e" ? 2 : true);
      expect(movePreview(state, row, { x: 10, y: 1 }).allowed).toBe(false);
    }
  });
  it("осторожный шаг PF обходит реакцию, обычное движение провоцирует", () => {
    const row = hero(), state = start(row), foe = foeNear(state); foe.dummy = false; foe.opportunity = true;
    const walk = executeTactical(row, state, { type: "move", to: { x: 1, y: 6 } }, fixed(20));
    expect(walk.log.some(event => event.title === "Провоцированная реакция")).toBe(true);
    const step = executeTactical(row, state, { type: "move", to: { x: 1, y: 6 }, step: true }, fixed(20));
    expect(step.log.some(event => event.title === "Провоцированная реакция")).toBe(false);
    expect(heroActor(step).hp).toBe(heroActor(state).hp);
  });
  it("захват и положение лёжа запрещают обычное перемещение", () => {
    const row = hero(); let state = start(row);
    state = executeTactical(row, state, { type: "effect", target: "hero", effect: "grabbed", value: 1 }, fixed());
    expect(movePreview(state, row, { x: 3, y: 6 }).reason).toContain("схвачены");
    state = executeTactical(row, state, { type: "effect", target: "hero", effect: "grabbed", value: 0 }, fixed());
    state = executeTactical(row, state, { type: "effect", target: "hero", effect: "prone", value: 1 }, fixed());
    expect(movePreview(state, row, { x: 3, y: 6 }).reason).toContain("встаньте");
    expect(heroActor(executeTactical(row, state, { type: "action", action: "stand" }, fixed())).pf.actions).toBe(2);
  });
  it("критический захват PF сковывает цель и не позволяет ей атаковать до освобождения", () => {
    const row = hero(); row.items = row.items.filter(item => item.kind !== "shield");
    const state = start(row), foe = foeNear(state); foe.dummy = false;
    const grabbed = executeTactical(row, state, { type: "action", action: "grapple", target: "guard" }, fixed(20));
    expect(grabbed.actors.find(row => row.id === "guard")!.effects.some(row => row.id === "restrained")).toBe(true);
    const next = executeTactical(row, grabbed, { type: "end" }, fixed(1));
    expect(next.log.some(row => row.title.includes("пытается освободиться"))).toBe(true);
    expect(heroActor(next).hp).toBe(heroActor(state).hp);
  });
  it.each([[1, -4], [2, -8]])("сбивание свободной рукой после %i атак применяет штраф %i", (earlier, penalty) => {
    const row = hero(); row.items = row.items.filter(item => item.kind !== "shield");
    const state = start(row), foe = foeNear(state), athletics = skillRows(row).find(skill => skill.id === "athletics")!.mod;
    foe.saves.ref = 12 + athletics + penalty - 10;
    let next = state;
    for (let index = 0; index < earlier; index++) next = executeTactical(row, next, { type: "attack", target: "guard", weapon: 0 }, fixed(1));
    const before = next.actors.find(actor => actor.id === "guard")!.hp;
    next = executeTactical(row, next, { type: "action", action: "trip", target: "guard" }, fixed(12));
    const after = next.actors.find(actor => actor.id === "guard")!;
    expect(after.effects.some(row => row.id === "prone")).toBe(true);
    expect(after.hp).toBe(before);
    expect(next.log.find(event => event.title === "Атлетика")?.detail).toContain(`успех; штраф повторной атаки ${penalty}`);
    expect(heroActor(next).pf.actions).toBe(2 - earlier);
  });
  it("D&D не разрешает уклонение после начала атакующего действия", () => {
    const row = hero("dnd5e"); row.level = 5; const state = start(row); foeNear(state);
    const result = executeTactical(row, state, { type: "attack", target: "guard", weapon: 0 }, fixed(1));
    expect(() => executeTactical(row, result, { type: "action", action: "defend" }, fixed())).toThrow("занято атакой");
  });
  it("оружие не проходит через стену или сверх дальности", () => {
    const row = hero(), state = start(row); foeNear(state, 10, 1);
    expect(() => executeTactical(row, state, { type: "attack", target: "guard", weapon: 0 }, fixed())).toThrow("дальность");
  });
});

describe("заклинания, эффекты и спасброски", () => {
  it("электрическая дуга вызывает два спасброска, не тратит ячейку и не увеличивает MAP", () => {
    const row = hero("pf2e", "маг"), state = start(row); foeNear(state); state.actors.find(row => row.id === "caster")!.pos = { x: 4, y: 6 };
    const result = executeTactical(row, state, { type: "spell", spell: "electric-arc", targets: ["guard", "caster"] }, fixed(1));
    expect(heroActor(result).pf.actions).toBe(1); expect(heroActor(result).pf.strikes).toBe(0);
    expect(heroActor(result).slots).toEqual(heroActor(state).slots);
    expect(result.log.filter(event => event.title.includes("Рефлексы ·")).length).toBe(2);
    expect(result.actors.find(row => row.id === "guard")!.hp).toBeLessThan(100);
  });
  it("подготовленная ячейка PF расходуется по конкретному заклинанию", () => {
    const row = hero("pf2e", "маг"); row.preparedIds = ["fear", "magic-missile"];
    const state = start(row); foeNear(state);
    const cast = executeTactical(row, state, { type: "spell", spell: "fear", targets: ["guard"] }, fixed());
    expect(heroActor(cast).preparedSlots?.fear).toBe(0); expect(heroActor(cast).slots[1]).toBe(heroActor(state).slots[1] - 1);
    heroActor(cast).pf.actions = 3;
    expect(() => executeTactical(row, cast, { type: "spell", spell: "fear", targets: ["guard"] }, fixed())).toThrow("подготовленная ячейка");
  });
  it("неподготовленное заклинание не доступно из одной только книги", () => {
    const row = hero("dnd5e", "маг"); row.preparedIds = []; row.bonusSpellIds = [];
    expect(tutorialSpells(row).some(spell => spell.rank > 0)).toBe(false);
    const state = start(row);
    expect(() => executeTactical(row, state, { type: "spell", spell: "magic-missile", targets: ["guard"] }, fixed())).toThrow("не подготовлено");
  });
  it("лечит союзника до максимума, шрифт PF работает отдельно от обычных ячеек", () => {
    const row = hero("pf2e", "целитель"), state = start(row); const player = heroActor(state); player.slots[1] = 0; player.font = 1;
    const result = executeTactical(row, state, { type: "spell", spell: "heal", targets: ["ally"] }, fixed());
    expect(heroActor(result).font).toBe(0);
    const ally = result.actors.find(row => row.id === "ally")!;
    expect(ally.hp).toBeGreaterThan(state.actors.find(row => row.id === "ally")!.hp); expect(ally.hp).toBeLessThanOrEqual(ally.maxHp);
  });
  it("D&D ограничивает расход ячейки одним заклинанием в ход", () => {
    const row = hero("dnd5e", "целитель"); row.preparedIds = ["bless", "healing-word"];
    const state = start(row), cast = executeTactical(row, state, { type: "spell", spell: "healing-word", targets: ["ally"] }, fixed());
    expect(heroActor(cast).dnd.bonus).toBe(false); expect(heroActor(cast).dnd.action).toBe(true);
    expect(() => executeTactical(row, cast, { type: "spell", spell: "bless", targets: ["hero"] }, fixed())).toThrow("один ход");
  });
  it("конус показывает клетки и может задеть союзника", () => {
    const row = hero("dnd5e", "маг"); row.preparedIds = ["burning-hands"];
    const state = start(row); foeNear(state); state.actors.find(row => row.id === "ally")!.pos = { x: 4, y: 6 };
    const spell = tutorialSpells(row).find(row => row.id === "burning-hands")!;
    expect(spellArea(state, row, spell, { x: 5, y: 6 }).some(cell => cell.x === 4 && cell.y === 6)).toBe(true);
    const result = executeTactical(row, state, { type: "spell", spell: spell.id, targets: [], point: { x: 5, y: 6 } }, fixed(1));
    expect(result.actors.find(row => row.id === "ally")!.hp).toBeLessThan(state.actors.find(row => row.id === "ally")!.hp);
  });
  it("щит PF истекает к следующему ходу и не складывается с физическим", () => {
    const row = hero("pf2e", "маг"), state = start(row);
    const cast = executeTactical(row, state, { type: "spell", spell: "shield", targets: ["hero"] }, fixed());
    expect(heroActor(cast).effects.some(row => row.id === "magic-shield")).toBe(true);
    const next = executeTactical(row, cast, { type: "end" }, fixed());
    expect(heroActor(next).effects.some(row => row.id === "magic-shield")).toBe(false);
  });
  it("Уклонение D&D даёт преимущество на спасбросок Ловкости", () => {
    const row = hero("dnd5e"), state = start(row); heroActor(state).effects = [{ id: "dodge", value: 1, source: "hero" }];
    const values = [1, 20]; const result = executeTactical(row, state, { type: "save", target: "hero", save: "dex", dc: 15 }, () => values.shift()!);
    expect(result.log.at(-1)?.detail).toContain("к20 20");
  });
  it("натуральная 20 D&D не спасает против недостижимой СЛ", () => {
    const row = hero("dnd5e"), state = start(row);
    const result = executeTactical(row, state, { type: "save", target: "hero", save: "dex", dc: 99 }, fixed(20));
    expect(result.log.at(-1)?.detail).toContain("провал");
  });
  it("концентрация снимается при провале спасброска после урона", () => {
    const row = hero("dnd5e", "целитель"); row.preparedIds = ["bless"];
    const state = start(row, { ...setup, scenario: "duel" }); const foe = foeNear(state); foe.dummy = false;
    const blessed = executeTactical(row, state, { type: "spell", spell: "bless", targets: ["hero", "ally"] }, fixed());
    expect(heroActor(blessed).concentration).toBeTruthy();
    const result = executeTactical(row, blessed, { type: "end" }, (formula, label) => formula === "1d20" ? label.includes("Атака") ? 20 : 1 : new DiceRoll(formula).minTotal);
    expect(heroActor(result).concentration).toBeUndefined(); expect(result.actors.every(row => row.effects.every(effect => effect.id !== "bless"))).toBe(true);
  });
  it("два попадания в D&D и критическая ступень PF не смешиваются", () => {
    const row = hero("pf2e"), state = start(row), foe = foeNear(state);
    foe.ac = heroActor(state).attack + 25;
    const result = executeTactical(row, state, { type: "attack", target: "guard", weapon: 0 }, fixed(20));
    expect(result.actors.find(row => row.id === "guard")!.hp).toBeLessThan(100);
  });
  it("не смешивает старые редакции с новым договором стола", () => {
    const row = hero("dnd5e"); row.rules = { ...row.rules!, edition: "dnd-2014" };
    expect(() => start(row)).toThrow("2024");
  });
});
