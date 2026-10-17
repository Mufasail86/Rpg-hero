import { describe, expect, it } from "vitest";
import { SKILLS as DND_SKILLS } from "../data/dnd5e";
import { SKILLS as PF_SKILLS } from "../data/pf2e";
import { wizardOptions } from "../beginner";
import { GUIDE_NOTE, skillCards, skillPlan } from "./picks";

describe("какие навыки брать", () => {
  it("покрывает каждый навык обеих систем и помечает частоту как совет, не правило", () => {
    expect(GUIDE_NOTE).toMatch(/не правило/);
    for (const [system, skills] of [["pf2e", PF_SKILLS], ["dnd5e", DND_SKILLS]] as const) {
      const cards = skillCards(system);
      expect(cards.map((card) => card.id).sort()).toEqual(skills.map((skill) => skill.id).sort());
      expect(cards[0]?.frequency).toBe("часто");
      expect(cards.at(-1)?.frequency).toBe("редко");
      for (const card of cards) {
        expect(card.why.length).toBeGreaterThan(10);
        expect(card.who.length).toBeGreaterThan(5);
        expect(card.scenes.length).toBeGreaterThan(0);
        if (system === "pf2e") {
          expect(card.raise).toBeTruthy();
          expect(card.unlocks).toBeTruthy();
        }
      }
    }
  });

  it("воину с силой советует атлетику и не просит вкладываться в ремесло", () => {
    const plan = skillPlan({
      system: "pf2e",
      classId: "fighter",
      keyAbility: "str",
      role: "боец",
      scores: { str: 22, dex: 20, con: 20, int: 10, wis: 18, cha: 10 },
    });
    expect(plan.grow).toHaveLength(4);
    expect(plan.grow[0]?.id).toBe("athletics");
    expect(plan.grow[0]?.reason).toMatch(/ключ класса/);
    expect(plan.grow.map((row) => row.id)).not.toContain("crafting");
    expect(plan.skip.map((row) => row.id)).toContain("crafting");
    expect(plan.skip.every((row) => !plan.grow.some((grow) => grow.id === row.id))).toBe(true);
  });

  it("жрецу D&D ставит медицину выше истории", () => {
    const plan = skillPlan({ system: "dnd5e", classId: "cleric", keyAbility: "wis", role: "целитель" });
    const grow = plan.grow.map((row) => row.id);
    expect(grow).toContain("medicine");
    expect(grow).not.toContain("history");
    expect(plan.skip.map((row) => row.id)).toContain("history");
  });

  it("повышение навыка подсвечивает личный совет, а не общий список", () => {
    const plan = skillPlan({ system: "pf2e", classId: "fighter", keyAbility: "str", role: "боец" });
    const shown = wizardOptions("skill-increase", [
      { pick: "crafting", name: "Ремесло" },
      { pick: "athletics", name: "Атлетика" },
      { pick: "arcana", name: "Аркана" },
      { pick: "performance", name: "Выступление" },
    ], plan.grow.map((row) => ({ pick: row.id, reason: row.reason })));
    expect(shown[0]?.pick).toBe("athletics");
    expect(shown[0]?.advised).toBe(true);
    expect(shown[0]?.reason).toMatch(/ключ класса|Класс на этом/);
    expect(shown.some((row) => row.pick === "crafting")).toBe(false);
  });
});
