import { describe, expect, it } from "vitest";
import { looksLikeRawId, reviewSummary } from "./create";
import { BACKGROUNDS_2014, BACKGROUNDS as BG5, CLASSES as CL5, SPECIES } from "./data/dnd5e";
import { ANCESTRIES, BACKGROUNDS as BG2, CLASSES as CL2 } from "./data/pf2e";
import { blankDraft, type Draft } from "./types";

function draft(partial: Partial<Draft>): Draft {
  return { ...blankDraft(), ...partial, choices: partial.choices ?? {}, multi: partial.multi ?? {} };
}

function expectNamed(text: string, id: string) {
  expect(text).not.toBe(id);
  expect(looksLikeRawId(text)).toBe(false);
  expect(text).toMatch(/[А-Яа-яЁё]/);
}

describe("сводка конструктора", () => {
  it("не показывает сырые id народа, происхождения и класса", () => {
    const dnd = reviewSummary(draft({
      system: "dnd5e",
      edition: "dnd-2024",
      ancestryId: "elf",
      backgroundId: "sage",
      classId: "warlock",
    }));
    expect(dnd).toEqual({ heading: "D&D, 2024", ancestry: "Эльф", background: "Мудрец", className: "Колдун" });

    const legacy = reviewSummary(draft({
      system: "dnd5e",
      edition: "dnd-2014",
      ancestryId: "elf",
      backgroundId: "acolyte",
      classId: "fighter",
    }));
    expect(legacy.heading).toBe("D&D, 2014");
    expect(legacy.ancestry).toBe("Эльф");
    expect(legacy.background).toBe("Послушник");
    expect(legacy.className).toBe("Воин");

    const pf = reviewSummary(draft({
      system: "pf2e",
      edition: "pf-remaster",
      ancestryId: "human",
      backgroundId: BG2[0].id,
      classId: "fighter",
    }));
    expect(pf.heading).toBe("Pathfinder, ремастер");
    expect(pf.ancestry).toBe("Человек");
    expect(pf.className).toBe("Воин");
    expectNamed(pf.background, BG2[0].id);

    for (const row of SPECIES) expectNamed(reviewSummary(draft({ system: "dnd5e", edition: "dnd-2024", ancestryId: row.id })).ancestry, row.id);
    for (const row of BG5) expectNamed(reviewSummary(draft({ system: "dnd5e", edition: "dnd-2024", backgroundId: row.id })).background, row.id);
    for (const row of BACKGROUNDS_2014) expectNamed(reviewSummary(draft({ system: "dnd5e", edition: "dnd-2014", backgroundId: row.id })).background, row.id);
    for (const row of CL5) expectNamed(reviewSummary(draft({ system: "dnd5e", edition: "dnd-2024", classId: row.id })).className, row.id);
    for (const row of ANCESTRIES) expectNamed(reviewSummary(draft({ system: "pf2e", edition: "pf-remaster", ancestryId: row.id })).ancestry, row.id);
    for (const row of BG2) expectNamed(reviewSummary(draft({ system: "pf2e", edition: "pf-remaster", backgroundId: row.id })).background, row.id);
    for (const row of CL2) expectNamed(reviewSummary(draft({ system: "pf2e", edition: "pf-remaster", classId: row.id })).className, row.id);
  });
});
