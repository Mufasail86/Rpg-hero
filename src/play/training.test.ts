import { describe, expect, it } from "vitest";
import { createCharacter } from "../create";
import { starterDraft } from "../beginner";
import { actionBlock, criticalFormula, damageFormula, equipTraining, newTraining, rollDice, trainingAction, trainingGear, trainingStats, type TrainingConfig, type Roll } from "./training";

const config: TrainingConfig = { place: "arena", difficulty: "easy", enemy: "guard" };
function hero(system: "pf2e" | "dnd5e" = "pf2e") {
  const made = createCharacter(starterDraft(system, "боец", "Ученик").draft);
  if (!made.ok) throw new Error(made.error);
  return made.character;
}
const rolls = (...values: number[]): Roll => () => values.shift() ?? 1;

describe("учебный бой", () => {
  it("не меняет настоящий лист, его здоровье, предметы и ресурсы", () => {
    const real = hero(); const before = structuredClone(real);
    const pool = trainingGear(real);
    const weapon = pool.find(item => item.kind === "weapon")!;
    const copy = equipTraining(real, weapon.id, "", true);
    const state = { ...newTraining(copy, config), distance: 5 };
    trainingAction(copy, state, config, "attack", 0, rolls(20, 10));
    expect(real).toEqual(before);
    expect(copy).not.toBe(real);
    expect(copy.items).not.toBe(real.items);
    expect(state.enemyHp).toBe(state.enemyMax);
  });
  it("перемещение расходует действие PF, дальний удар блокируется для меча", () => {
    const real = hero(); const state = newTraining(real, config);
    expect(actionBlock(real, state, "attack")).toContain("дистанции");
    const next = trainingAction(real, state, config, "approach");
    expect(next.pf.actions).toBe(2); expect(next.distance).toBe(5);
  });
  it("PF ограничивает ход тремя действиями и применяет штраф повторного удара", () => {
    const real = hero(); let state = { ...newTraining(real, config), distance: 5, enemyHp: 999, enemyMax: 999 };
    for (let i = 0; i < 3; i++) state = trainingAction(real, state, config, "attack", 0, rolls(2));
    expect(state.pf.actions).toBe(0); expect(state.pf.strikes).toBe(3);
    expect(state.log[2]).toContain(`+ ${trainingStats(real).weapons[0].attack - 5}`);
    expect(state.log[3]).toContain(`− ${Math.abs(trainingStats(real).weapons[0].attack - 10)}`);
    expect(actionBlock(real, state, "attack")).toContain("Нет действия");
  });
  it("D&D после уклонения не может начать атакующее действие", () => {
    const real = hero("dnd5e"); const state = { ...newTraining(real, config), distance: 5 };
    const defended = trainingAction(real, state, config, "defend");
    expect(defended.dnd.action).toBe(false);
    expect(actionBlock(real, defended, "attack")).toContain("Нет действия");
  });
  it("D&D перемещение не съедает основное действие", () => {
    const real = hero("dnd5e"); const state = newTraining(real, config);
    const next = trainingAction(real, state, config, "approach");
    expect(next.dnd.action).toBe(true); expect(next.movement).toBeLessThan(state.movement);
  });
  it("начатое действие атаки D&D нельзя заменить уклонением", () => {
    const real = hero("dnd5e"); real.level = 5;
    const state = { ...newTraining(real, config), distance: 5 };
    state.dnd.attacks = 1; state.dnd.action = true;
    expect(actionBlock(real, state, "defend")).toContain("уже выбрали действие атаки");
  });
  it("библиотека бросков считает поддерживаемую формулу", () => {
    expect(rollDice("1d1+4")).toBe(5);
  });
  it("PF оставляет минимум 1 урона при попадании и удваивает его на крите", () => {
    const real = hero(); const state = { ...newTraining(real, config), distance: 5 };
    expect(trainingAction(real, state, config, "attack", 0, rolls(12, -2)).enemyHp).toBe(state.enemyMax - 1);
    expect(trainingAction(real, state, config, "attack", 0, rolls(20, -2)).enemyHp).toBe(state.enemyMax - 2);
  });
  it("крит D&D удваивает кости, а PF — весь обычный урон", () => {
    expect(criticalFormula("1d8+4", "dnd5e")).toBe("2d8+4");
    expect(criticalFormula("1d8+4", "pf2e")).toBe("2*(1d8+4)");
    expect(damageFormula("1d8 рубящего +4 ярость +2 спец. +1")).toBe("1d8+4");
    expect(damageFormula("1d8 + яд")).toBeNull();
  });
  it("щит действует на ответ врага и сбрасывается только с новым ходом", () => {
    const real = hero(); const pool = trainingGear(real);
    const copy = equipTraining(real, pool.find(item => item.kind === "weapon" && !item.weapon?.twoHanded && item.weapon?.hands !== 2)!.id, "", true);
    const state = { ...newTraining(copy, config), distance: 5 };
    const defend = trainingAction(copy, state, config, "defend");
    expect(defend.defending).toBe(true);
    const next = trainingAction(copy, defend, config, "end", 0, rolls(2));
    expect(next.log.some(line => line.includes("с защитой"))).toBe(true);
    expect(next.defending).toBe(false); expect(next.pf.actions).toBe(3);
  });
  it("двуручное оружие исключает щит", () => {
    const real = hero(); const two = trainingGear(real).find(item => item.kind === "weapon" && (item.weapon?.twoHanded || item.weapon?.hands === 2))!;
    expect(trainingStats(equipTraining(real, two.id, "", true)).shield).toBe(false);
  });
  it("копия уже надетого оружия сохраняет его руны, не меняя оригинал", () => {
    const real = hero(); const item = real.items.find(row => row.kind === "weapon" && row.equipped)!;
    item.runes = { potency: 1, striking: 1 };
    const copy = equipTraining(real, item.catalogId!, "", false);
    expect(copy.items.find(row => row.kind === "weapon")?.runes).toEqual(item.runes);
    expect(copy.items.find(row => row.kind === "weapon")?.runes).not.toBe(item.runes);
  });
  it("победа и поражение заканчивают бой, а новая тренировка восстанавливает здоровье", () => {
    const real = hero("dnd5e");
    const won = trainingAction(real, { ...newTraining(real, config), distance: 5, enemyHp: 1 }, config, "attack", 0, rolls(20, 10));
    expect(won.status).toBe("won"); expect(actionBlock(real, won, "end")).toContain("завершён");
    const lost = trainingAction(real, { ...newTraining(real, config), hp: 1, distance: 5 }, config, "end", 0, rolls(20, 10));
    expect(lost.status).toBe("lost"); expect(lost.hp).toBe(0);
    expect(newTraining(real, config).hp).toBe(trainingStats(real).hp);
  });
  it("манекен не отвечает, кость 1 D&D промахивается при большом бонусе", () => {
    const real = hero("dnd5e"); const dummy = { ...config, enemy: "dummy" as const };
    const state = newTraining(real, dummy);
    const attack = trainingAction(real, state, dummy, "attack", 0, rolls(1));
    expect(attack.enemyHp).toBe(attack.enemyMax);
    const next = trainingAction(real, attack, dummy, "end", 0, rolls(20, 100));
    expect(next.hp).toBe(state.hp); expect(next.round).toBe(2);
  });
});
