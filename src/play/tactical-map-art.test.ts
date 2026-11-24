import { describe, expect, it } from "vitest";
import layout from "../../public/art/tactical/layout.json";
import { starterDraft } from "../beginner";
import { createCharacter } from "../create";
import { tutorialSpellPool } from "../data/tutorial-spells";
import { battleMap, lineOfSight } from "./tactical-map";
import { battleRoller, executeTactical, heroActor, movePreview, startTactical, type TacticalIntent, type TacticalSetup } from "./tactical";
import { equipTraining } from "./training";

describe("контракт готовых карт Ирис", () => {
  for (const id of ["tavern", "arena"] as const) it(`${id}: рисунок использует неизменную матрицу поля 12 на 9`, () => {
    expect(battleMap(id)).toEqual(layout.maps.find(row => row.id === id));
  });

  for (const system of ["dnd5e", "pf2e"] as const) describe(system, () => {
    function scene(map: TacticalSetup["map"]) {
      const made = createCharacter(starterDraft(system, system === "pf2e" ? "маг" : "боец", "Проверка карты").draft);
      if (!made.ok) throw new Error(made.error);
      const hero = equipTraining(made.character, system === "dnd5e" ? "shortbow" : "dagger", "", false);
      const spell = tutorialSpellPool(system, hero.classId).find(row => row.id === "telekinetic-projectile");
      if (spell && !hero.spells.some(row => row.id === spell.id)) hero.spells.push({ id: spell.id, name: spell.name, level: 0, info: spell.explanation, school: "", time: "", range: "", duration: "" });
      const state = startTactical(hero, { map, scenario: "dummy", difficulty: "easy" }, battleRoller(true, [20, 1, 1, 1]));
      const attack: TacticalIntent = system === "dnd5e" ? { type: "attack", target: "guard", weapon: 0 } : { type: "spell", spell: "telekinetic-projectile", targets: ["guard"] };
      return { hero, state, attack };
    }

    it("таверна: D5 даёт укрытие +2 по I4, E6 открывает линию", () => {
      for (const [pos, cover] of [[{ x: 3, y: 4 }, 2], [{ x: 4, y: 5 }, 0]] as const) {
        const { hero, state, attack } = scene("tavern"); heroActor(state).pos = pos;
        expect(lineOfSight(battleMap("tavern"), pos, { x: 8, y: 3 })).toEqual({ visible: true, cover });
        const result = executeTactical(hero, state, attack, battleRoller(true, [2]));
        expect(result.log.some(row => row.detail.includes("укрытие +2"))).toBe(cover === 2);
      }
    });

    it("зал: D5 закрыта опорой F5 до броска, E6 открыта", () => {
      const { hero, state, attack } = scene("arena"); heroActor(state).pos = { x: 3, y: 4 };
      let rolls = 0; const original = structuredClone(state);
      expect(() => executeTactical(hero, state, attack, () => { rolls++; return 2; })).toThrow(/стен/i);
      expect(rolls).toBe(0); expect(state).toEqual(original);
      heroActor(state).pos = { x: 4, y: 5 };
      expect(lineOfSight(battleMap("arena"), heroActor(state).pos, { x: 8, y: 3 }).visible).toBe(true);
      expect(() => executeTactical(hero, state, attack, battleRoller(true, [2]))).not.toThrow();
    });

    it("таверна: E5 недоступна без расхода хода, D6 доступна", () => {
      const { hero, state } = scene("tavern"); heroActor(state).pos = { x: 3, y: 4 };
      const original = structuredClone(state);
      expect(movePreview(state, hero, { x: 4, y: 4 }).allowed).toBe(false);
      expect(() => executeTactical(hero, state, { type: "move", to: { x: 4, y: 4 } }, battleRoller(true, []))).toThrow();
      expect(state).toEqual(original);
      expect(movePreview(state, hero, { x: 3, y: 5 })).toMatchObject({ feet: 5, allowed: true });
    });

    it("из F6: G6 стоит 10 футов, F7 стоит 5; осторожный шаг PF не идёт в завал", () => {
      const { hero, state } = scene("arena"); heroActor(state).pos = { x: 5, y: 5 };
      expect(movePreview(state, hero, { x: 6, y: 5 })).toMatchObject({ feet: 10, allowed: true });
      expect(movePreview(state, hero, { x: 5, y: 6 })).toMatchObject({ feet: 5, allowed: true });
      if (system === "pf2e") {
        expect(movePreview(state, hero, { x: 6, y: 5 }, true)).toMatchObject({ allowed: false });
        expect(() => executeTactical(hero, state, { type: "move", to: { x: 6, y: 5 }, step: true }, battleRoller(true, []))).toThrow("сложной местности");
      }
    });
  });
});
