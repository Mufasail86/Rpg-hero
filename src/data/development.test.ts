import { describe, expect, it } from "vitest";
import { createCharacter } from "../create";
import { starterDraft, fillStep } from "../beginner";
import { developmentAdvice, developmentPaths, resolveDevelopment } from "./development";
import { learningNote, learningText } from "./learning";
import { adviceForOptions } from "./build-advice";

describe("объяснения и пути", () => {
  it("сложный путь расширяет развилки и предлагает архетипы", () => {
    expect(developmentPaths("fighter", "simple")).toHaveLength(2);
    expect(developmentPaths("fighter", "complex").length).toBeGreaterThan(2);
    expect(developmentAdvice("fighter", { complexity: "simple", path: "guardian" }).some(row => row.id.endsWith("dedication"))).toBe(false);
    expect(developmentAdvice("fighter", { complexity: "complex", path: "healer" }).some(row => row.id === "medic-dedication")).toBe(true);
  });
  it("не советует недоступные варианты и исправляет неизвестный путь", () => {
    const advice = developmentAdvice("fighter", { complexity: "complex", path: "healer" });
    expect(adviceForOptions([{ pick: "battle-medicine", name: "Боевая медицина" }], advice)).toHaveLength(1);
    expect(resolveDevelopment("wizard", { complexity: "simple", path: "bad" }).path.id).toBe("mage");
    const options = [{ pick: "toughness", name: "Живучесть" }, { pick: "fleet", name: "Быстроногий" }];
    const priorities = [{ id: "fleet", reason: "Скорость" }, { id: "toughness", reason: "Хиты" }];
    expect(adviceForOptions(options, priorities).map(row => row.pick)).toEqual(adviceForOptions([...options].reverse(), priorities).map(row => row.pick));
  });
  it("сохраняет направление на листе и учитывает его при выборе навыков", () => {
    const draft = starterDraft("pf2e", "боец", "Лекарь").draft;
    draft.development = { complexity: "complex", path: "healer" };
    const picked = fillStep(draft, "skills");
    expect(picked.multi?.skills).toContain("medicine");
    const made = createCharacter(draft);
    expect(made.ok).toBe(true);
    if (made.ok) expect(made.character.development).toEqual(draft.development);
  });
  it("поясняет народ, черту и архетип, сохраняя исходное правило", () => {
    for (const id of ["human", "battle-medicine", "medic-dedication"]) {
      const note = learningNote(id)!;
      for (const text of Object.values(note)) expect(text.length).toBeGreaterThan(40);
      expect(learningText(id, "Исходное правило")).toContain("Исходное правило");
    }
    expect(learningText("missing", "Неизвестный эффект")).toBe("Неизвестный эффект");
  });
});
