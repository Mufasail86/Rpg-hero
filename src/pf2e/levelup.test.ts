import { describe, expect, it } from "vitest";
import { blankDraft } from "../types";
import { createCharacter } from "../create";
import { hpMax } from "../rules";
import { optionsForSlot, slotsForProgress } from "./build";

function druidDraft() {
  const draft = blankDraft();
  draft.system = "pf2e";
  draft.name = "Камень";
  draft.ancestryId = "dwarf";
  draft.heritageId = "rock";
  draft.choices.ancestryMode = "listed";
  draft.choices.ancFree = "dex";
  draft.choices.ancestryFeat = "dwarf-lore";
  draft.backgroundId = "acolyte";
  draft.choices.bgFixed = "wis";
  draft.choices.bgFree = "con";
  draft.choices.skillFeat = "student-canon";
  draft.classId = "druid";
  draft.choices.order = "animal";
  draft.choices.classFeat = "animal-companion";
  draft.choices.abilityMethod = "boost";
  draft.multi.freeBoosts = ["con", "str", "dex", "int"];
  draft.multi.skills = ["medicine", "stealth", "diplomacy"];
  draft.gearMode = "kit";
  draft.knownSpells = ["electric-arc", "produce-flame", "light", "stabilize", "guidance"];
  draft.preparedSpells = ["heal", "breathe-fire"];
  return draft;
}

describe("сбор до уровня", () => {
  it("друид 10 уровня пересчитывает хиты, ячейки и слоты черт", () => {
    const draft = druidDraft();
    draft.choices.buildLevel = "10";
    draft.choices.freeArchetype = "yes";
    const made = createCharacter(draft);
    expect(made.ok).toBe(true);
    if (!made.ok || !made.character.progress) return;
    expect(made.character.level).toBe(10);
    expect(made.character.progress.freeArchetype).toBe(true);
    expect(hpMax(made.character)).toBeGreaterThan(21);
    expect(made.character.slots.map((slot) => [slot.rank, slot.max])).toEqual([[1, 3], [2, 3], [3, 3], [4, 3], [5, 3]]);
    expect(made.character.spellcasting?.prepareLimit).toBe(15);
    expect(made.character.spellcasting?.cantripLimit).toBe(5);
    const slots = slotsForProgress(made.character.progress, 10);
    expect(slots.some((slot) => slot.source === "class-feat" && slot.level === 10)).toBe(true);
    expect(slots.some((slot) => slot.source === "free-archetype" && slot.level === 2)).toBe(true);
    expect(slots.some((slot) => slot.source === "free-boost" && slot.level === 10)).toBe(true);
    const classFeats = optionsForSlot("class-feat", { classId: "druid", level: 2, taken: ["battle-medicine"], ranks: { medicine: "trained" } });
    expect(classFeats.some((option) => option.pick === "medic-dedication")).toBe(true);
    const blocked = optionsForSlot("class-feat", { classId: "druid", level: 8, taken: ["medic-dedication"] });
    expect(blocked.some((option) => option.pick.endsWith("-dedication") && option.pick !== "medic-dedication")).toBe(false);
  });
});
