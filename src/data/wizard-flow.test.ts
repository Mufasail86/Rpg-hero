import { describe, expect, it } from "vitest";
import { blankDraft } from "../types";
import { stepLocked, stepsFor, validateStep } from "../create";
import { ADVICE_BOOKS, ADVICE_CLASSES, levelAdvice } from "./build-advice";

describe("мастер создания", () => {
  it("ставит наследие отдельным шагом между народом и происхождением", () => {
    const draft = blankDraft();
    draft.system = "pf2e";
    draft.edition = "pf-remaster";
    const steps = stepsFor(draft);
    expect(steps.indexOf("heritage")).toBe(steps.indexOf("ancestry") + 1);
    expect(steps.indexOf("background")).toBe(steps.indexOf("heritage") + 1);
    expect(steps).toEqual(expect.arrayContaining(["abilities", "skills", "feats", "gear"]));
  });

  it("запирает класс, пока не выбраны народ и наследие", () => {
    const draft = blankDraft();
    draft.system = "pf2e";
    draft.edition = "pf-remaster";
    draft.name = "Лира";
    const steps = stepsFor(draft);
    expect(stepLocked(draft, steps, steps.indexOf("heritage"))).toBe(true);
    draft.ancestryId = "human";
    expect(validateStep(draft, "ancestry")).toBeNull();
    expect(stepLocked(draft, steps, steps.indexOf("heritage"))).toBe(false);
    expect(validateStep(draft, "heritage")).toBe("Выберите наследие.");
    expect(stepLocked(draft, steps, steps.indexOf("class"))).toBe(true);
    draft.heritageId = "skilled";
    expect(validateStep(draft, "heritage")).toBeNull();
    expect(stepLocked(draft, steps, steps.indexOf("class"))).toBe(true);
  });
});

describe("советы по уровням", () => {
  it("есть на каждом уровне с 1 по 20 у названных классов и не выбирают сами", () => {
    for (const book of ADVICE_BOOKS) {
      for (const classId of ADVICE_CLASSES[book]) {
        for (let level = 1; level <= 20; level += 1) {
          const row = levelAdvice(book, classId, level);
          expect(row, `${book} ${classId} ${level}`).not.toBeNull();
          const picks = [...(row?.skills ?? []), ...(row?.feats ?? []), ...(row?.archetypes ?? [])];
          expect(picks.length).toBeGreaterThan(0);
          for (const pick of picks) {
            expect(pick.reason.length).toBeGreaterThan(8);
            expect(pick.reason).not.toMatch(/[A-Za-z]{4,}/);
          }
        }
      }
    }
  });
});
