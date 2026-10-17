import { describe, expect, it } from "vitest";
import { artefolCharacter } from "../pf2e/artefol";
import { actionGate, resolveCheck, skillCard, skillSnapshot } from "./guide";

describe("карточки навыков", () => {
  it("у Следопыта есть вспомнить, деморализовать, лечение ран и три действия воровства", () => {
    expect(skillCard("pf2e", "arcana").actions.some((action) => action.name === "Вспомнить знание")).toBe(true);
    expect(skillCard("pf2e", "intimidation").actions.some((action) => action.id === "demoralize")).toBe(true);
    expect(skillCard("pf2e", "medicine").actions.some((action) => action.id === "treat-wounds")).toBe(true);
    const thievery = skillCard("pf2e", "thievery").actions.map((action) => action.id);
    expect(thievery).toEqual(["steal", "lock", "device"]);
  });

  it("необученное воровство не открывает кражу, обучение открывает", () => {
    const steal = skillCard("pf2e", "thievery").actions[0];
    expect(actionGate("untrained", steal, false)).toMatch(/обучение/);
    expect(actionGate("trained", steal, false)).toBeNull();
  });

  it("боевая медицина требует и обучение, и черту", () => {
    const action = skillCard("pf2e", "medicine").actions.find((item) => item.id === "battle-medicine");
    if (!action) throw new Error("нет действия");
    expect(actionGate("untrained", action, true)).toMatch(/обучение/);
    expect(actionGate("trained", action, false)).toMatch(/черта/);
    expect(actionGate("trained", action, true)).toBeNull();
  });

  it("у правил 2024 есть все 18 навыков и стабилизация не лечит", () => {
    const ids = ["acrobatics", "animal", "arcana", "athletics", "deception", "history", "insight", "intimidation", "investigation", "medicine", "nature", "perception", "performance", "persuasion", "religion", "sleight", "stealth", "survival"];
    for (const id of ids) {
      const card = skillCard("dnd5e", id);
      expect(card.when.length).toBeGreaterThan(8);
      expect(card.roll).toMatch(/к20/);
      expect(card.outcome.length).toBeGreaterThan(8);
    }
    expect(skillCard("dnd5e", "medicine").outcome).toMatch(/не лечит/);
    expect(skillCard("dnd5e", "sleight").roll).toMatch(/инструмент/);
  });
});

describe("бросок навыка", () => {
  it("прибавляет модификатор один раз", () => {
    const check = resolveCheck("pf2e", 13, 7, 18);
    expect(check.total).toBe(20);
    expect(check.verdict).toBe("успех");
  });

  it("кость 1 снижает ступень Следопыта и не лечит бросок сама", () => {
    expect(resolveCheck("pf2e", 1, 30, 10).verdict).toBe("успех");
    expect(resolveCheck("dnd5e", 20, 0, 25).verdict).toMatch(/провал/);
    expect(resolveCheck("dnd5e", 20, 0, 25).verdict).toMatch(/не решает/);
    expect(resolveCheck("dnd5e", 12, 7, null).verdict).toBe("");
  });

  it("испуг уже вычтен из числа Артефола", () => {
    const calm = skillSnapshot(artefolCharacter()).find((line) => line.id === "athletics");
    const hero = artefolCharacter();
    hero.conditionValues = { frightened: 1 };
    const scared = skillSnapshot(hero).find((line) => line.id === "athletics");
    expect(calm && scared && scared.modifier).toBe((calm?.modifier ?? 0) - 1);
    expect(scared?.statusNote).toMatch(/уже/);
  });
});
