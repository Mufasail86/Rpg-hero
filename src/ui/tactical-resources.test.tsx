import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { starterDraft } from "../beginner";
import { createCharacter } from "../create";
import { tutorialSpellPool } from "../data/tutorial-spells";
import { atTrainingLevel } from "../play/training-character";
import { trainingStats } from "../play/training";
import { battleRoller, executeTactical, heroActor, startTactical, type TacticalState } from "../play/tactical";
import type { Character } from "../types";
import { TacticalResources } from "./tactical-resources";

function scene(system: Character["system"], role: "боец" | "маг" | "целитель" = "боец", level = 1) {
  const made = createCharacter(starterDraft(system, role, "Проба").draft); if (!made.ok) throw Error(made.error);
  const hero = atTrainingLevel(made.character, level);
  for (const spell of tutorialSpellPool(system, hero.classId)) if (!hero.spells.some(row => row.id === spell.id)) hero.spells.push({ id: spell.id, name: spell.name, level: spell.rank, info: spell.explanation, school: "", time: "", range: "", duration: "" });
  hero.preparedIds = tutorialSpellPool(system, hero.classId).filter(row => row.rank === 1).map(row => row.id);
  const state = startTactical(hero, { map: "arena", scenario: "dummy", difficulty: "easy", ally: "target" }, battleRoller(true, [20, 1, 1, 1]));
  state.actors.find(row => row.id === "guard")!.pos = { x: 3, y: 6 };
  return { hero, state };
}
const miss = () => 1;
const html = (hero: Character, state: TacticalState) => renderToStaticMarkup(<TacticalResources hero={hero} actor={heroActor(state)} perAction={trainingStats(hero).perAction} />);

describe("видимые ресурсы учебного хода", () => {
  it("PF: три отметки становятся двумя после движения и нулём после заклинания за два действия", () => {
    const { hero, state } = scene("pf2e", "маг");
    expect(html(hero, state)).toContain('aria-label="Действия: 3 из 3"');
    const moved = executeTactical(hero, state, { type: "move", to: { x: 2, y: 5 } }, miss);
    expect(html(hero, moved)).toContain('aria-label="Действия: 2 из 3"');
    const cast = executeTactical(hero, moved, { type: "spell", spell: "electric-arc", targets: ["guard"] }, miss);
    expect(html(hero, cast)).toContain('aria-label="Действия: 0 из 3"');
  });
  it("D&D: оставшийся удар не выдаётся за свободное основное действие", () => {
    const { hero, state } = scene("dnd5e", "боец", 5);
    expect(html(hero, state)).toContain('aria-label="Удары при атаке: 2 из 2"');
    const first = executeTactical(hero, state, { type: "attack", target: "guard", weapon: 0 }, miss);
    expect(html(hero, first)).toContain('aria-label="Основное: 0 из 1"');
    expect(html(hero, first)).toContain('aria-label="Удары при атаке: 1 из 2"');
    const second = executeTactical(hero, first, { type: "attack", target: "guard", weapon: 0 }, miss);
    expect(html(hero, second)).toContain('aria-label="Удары при атаке: 0 из 2"');
  });
  it("Всплеск отдельно показывает запасённое действие, а следующая атака расходует его", () => {
    const { hero, state } = scene("dnd5e", "боец", 5); let next = state;
    for (let i = 0; i < 2; i++) next = executeTactical(hero, next, { type: "attack", target: "guard", weapon: 0 }, miss);
    next = executeTactical(hero, next, { type: "feature", feature: "surge" }, miss);
    expect(html(hero, next)).toContain("Всплеск: ещё одно действие");
    next = executeTactical(hero, next, { type: "attack", target: "guard", weapon: 0 }, miss);
    expect(html(hero, next)).not.toContain("Всплеск: ещё одно действие");
    expect(html(hero, next)).toContain('aria-label="Удары при атаке: 1 из 2"');
  });
  it("бонусное заклинание расходует бонусное и ячейку, но не основное действие", () => {
    const { hero, state } = scene("dnd5e", "целитель"); const before = heroActor(state).slots[1];
    const cast = executeTactical(hero, state, { type: "spell", spell: "healing-word", targets: ["ally"] }, miss);
    const result = html(hero, cast);
    expect(result).toContain('aria-label="Основное: 1 из 1"'); expect(result).toContain('aria-label="Бонусное: 0 из 1"');
    expect(result).toContain(`aria-label="Ячейки · 1 круг: ${before - 1} из ${before}"`);
  });
  it("шрифт показан отдельно от обычных ячеек и не расходует их при лечении", () => {
    const { hero, state } = scene("pf2e", "целитель"), before = heroActor(state);
    const cast = executeTactical(hero, state, { type: "spell", spell: "heal", targets: ["ally"] }, miss);
    expect(html(hero, cast)).toContain(`aria-label="Шрифт · 1 круг: ${before.font! - 1} из ${before.font}"`);
    expect(html(hero, cast)).toContain(`aria-label="Ячейки · 1 круг: ${before.slots[1]} из ${before.slots[1]}"`);
  });
  it("реакция и перемещение берутся из состояния, а не из декоративного счётчика", () => {
    const { hero, state } = scene("dnd5e"); heroActor(state).dnd.reaction = false; heroActor(state).move = 5;
    expect(html(hero, state)).toContain('aria-label="Реакция: 0 из 1"'); expect(html(hero, state)).toContain('aria-label="Движение: 5 футов"');
  });
  it("новый ход возвращает действия, но не потраченную ячейку", () => {
    const { hero, state } = scene("dnd5e", "целитель");
    const cast = executeTactical(hero, state, { type: "spell", spell: "healing-word", targets: ["ally"] }, miss);
    const next = executeTactical(hero, cast, { type: "end" }, miss);
    expect(html(hero, next)).toContain('aria-label="Бонусное: 1 из 1"'); expect(heroActor(next).slots).toEqual(heroActor(cast).slots);
  });
});
