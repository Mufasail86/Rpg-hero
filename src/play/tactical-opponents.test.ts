import { describe, expect, it } from "vitest";
import { starterDraft } from "../beginner";
import { createCharacter } from "../create";
import { battleRoller, executeTactical, heroActor, startTactical, type TacticalSetup } from "./tactical";
import { battleMap, gridDistance, walkable } from "./tactical-map";
import { atTrainingLevel } from "./training-character";
import { readTacticalSave } from "./tactical-storage";

describe("подвижные противники и роли союзника", () => {
  for (const system of ["dnd5e", "pf2e"] as const) {
    function scene(ally: TacticalSetup["ally"] = "none", scenario: TacticalSetup["scenario"] = "duel") {
      const made = createCharacter(starterDraft(system, "боец", "Ученик").draft); if (!made.ok) throw Error(made.error);
      const hero = atTrainingLevel(made.character, 1), setup: TacticalSetup = { map: "tavern", scenario, difficulty: "easy", ally };
      const state = startTactical(hero, setup, battleRoller(true, ally === "none" ? scenario === "duel" ? [20, 1] : [20, 1, 1] : scenario === "duel" ? [20, 1, 1] : [20, 1, 1, 1]));
      return { hero, state, setup };
    }
    it(`${system}: страж подходит и атакует после завершения хода`, () => {
      const { hero, state } = scene(), before = structuredClone(state);
      const result = executeTactical(hero, state, { type: "end" }, () => 1), guard = result.actors.find(row => row.id === "guard")!;
      expect(guard.pos).not.toEqual(state.actors.find(row => row.id === "guard")!.pos);
      expect(gridDistance(guard.pos, heroActor(result).pos, system)).toBe(5);
      expect(result.log.some(row => row.title.includes("Атака · Учебный страж"))).toBe(true);
      const steps = result.visuals!.filter(row => row.kind === "move" && row.actor === "guard");
      expect(steps.length).toBeGreaterThan(1);
      for (const step of steps) { expect(walkable(battleMap("tavern"), step.to)).toBe(true); expect(Math.max(Math.abs(step.to.x - step.from.x), Math.abs(step.to.y - step.from.y))).toBe(1); }
      expect(state).toEqual(before);
    });
    it(`${system}: боевой Лис идёт и атакует врага, а не героя`, () => {
      const { hero, state } = scene("fighter");
      const guard = state.actors.find(row => row.id === "guard")!; guard.pos = { x: 3, y: 5 }; guard.hp = guard.maxHp = 100;
      const result = executeTactical(hero, state, { type: "end" }, () => 1);
      expect(result.visuals!.some(row => row.kind === "move" && row.actor === "ally")).toBe(true);
      expect(result.log.some(row => row.title === "Атака · Союзник Лис")).toBe(true);
      expect(result.visuals!.filter(row => row.kind === "strike").some(row => row.to.x === guard.pos.x && row.to.y === guard.pos.y)).toBe(true);
    });
    it(`${system}: манекены и раненая цель остаются неподвижными по явному выбору`, () => {
      const { hero, state } = scene("target", "dummy"), result = executeTactical(hero, state, { type: "end" }, () => 1);
      expect(result.actors.map(row => row.pos)).toEqual(state.actors.map(row => row.pos));
      expect(result.visuals?.some(row => row.kind === "strike")).toBe(false);
      expect(result.log.some(row => row.title === "Союзник держит позицию")).toBe(true);
    });
    it(`${system}: действие противников не меняет бой наполовину, если отменён ручной бросок`, () => {
      const { hero, state } = scene(), before = structuredClone(state);
      expect(() => executeTactical(hero, state, { type: "end" }, battleRoller(true, []))).toThrow(); expect(state).toEqual(before);
    });
    it(`${system}: бой вдвоём сохраняется без фиктивного третьего участника`, () => {
      const { state, setup } = scene(); expect(state.actors).toHaveLength(2);
      expect(readTacticalSave(JSON.stringify({ source: "same", state, preferences: { weapon: "", armor: "", shield: false, prepared: [], setup } }), "same")?.state.actors).toHaveLength(2);
    });
  }
});
