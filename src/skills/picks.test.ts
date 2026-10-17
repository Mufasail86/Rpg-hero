import { describe, expect, it } from "vitest";
import { classFace, premades, wizardOptions } from "../beginner";
import { classKey, scoresOf } from "../create";
import { SKILLS as DND_SKILLS } from "../data/dnd5e";
import { SKILLS as PF_SKILLS } from "../data/pf2e";
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
    expect(plan.grow[0]?.reason).toMatch(/Силы — вашей главной характеристики/);
    expect(plan.grow[0]?.reason).toMatch(/захват/);
    expect(plan.grow[0]?.reason).not.toMatch(/ключ класса|Класс на этом/);
    expect(plan.grow.map((row) => row.id)).toEqual(["athletics", "acrobatics", "intimidation", "medicine"]);
    expect(plan.grow.find((row) => row.id === "acrobatics")?.reason).toMatch(/Ловкости/);
    expect(plan.grow.map((row) => row.id)).not.toContain("stealth");
    expect(plan.grow.map((row) => row.id)).not.toContain("crafting");
    expect(plan.skip.map((row) => row.id)).toContain("crafting");
    expect(plan.skip.every((row) => row.reason.length > 10)).toBe(true);
    expect(plan.skip.every((row) => !plan.grow.some((grow) => grow.id === row.id))).toBe(true);
  });

  it("жрецу D&D ставит медицину выше истории", () => {
    const plan = skillPlan({ system: "dnd5e", classId: "cleric", keyAbility: "wis", role: "целитель" });
    const grow = plan.grow.map((row) => row.id);
    expect(grow).toContain("medicine");
    expect(grow).not.toContain("history");
    expect(plan.skip.map((row) => row.id)).toContain("history");
  });

  it("готовым героям советует навыки их роли, а не случайную высокую характеристику", () => {
    const expectGrow: Record<string, string[]> = {
      "pf-fighter": ["athletics", "acrobatics", "intimidation", "medicine"],
      "pf-rogue": ["stealth", "thievery", "acrobatics", "deception"],
      "pf-cleric": ["religion", "medicine"],
      "pf-wizard": ["arcana"],
      "pf-bard": ["performance", "diplomacy"],
      "pf-ranger": ["survival", "stealth", "nature"],
      "dnd-fighter": ["athletics", "perception", "acrobatics"],
      "dnd-rogue": ["stealth", "sleight", "acrobatics"],
      "dnd-cleric": ["medicine", "insight", "religion"],
      "dnd-wizard": ["arcana", "investigation"],
      "dnd-bard": ["persuasion", "performance", "deception"],
    };
    for (const premade of [...premades("pf2e"), ...premades("dnd5e")]) {
      const scored = scoresOf(premade.draft);
      expect(scored.ok).toBe(true);
      if (!scored.ok) continue;
      const plan = skillPlan({
        system: premade.system,
        classId: premade.draft.classId,
        keyAbility: classKey(premade.draft) ?? "str",
        role: classFace(premade.system, premade.draft.classId).role,
        scores: scored.scores,
      });
      const grow = plan.grow.map((row) => row.id);
      for (const id of expectGrow[premade.id] ?? []) expect(grow, premade.id).toContain(id);
      if (premade.draft.classId === "fighter") expect(grow, premade.id).not.toContain("stealth");
      for (const row of [...plan.grow, ...plan.skip]) {
        expect(row.reason, `${premade.id} ${row.id}`).not.toMatch(/ключ класса|Класс на этом/);
      }
    }
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
    expect(shown[0]?.reason).toMatch(/Силы/);
    expect(shown[0]?.reason).not.toMatch(/ключ класса|Класс на этом/);
    expect(shown.some((row) => row.pick === "crafting")).toBe(false);
  });
});
