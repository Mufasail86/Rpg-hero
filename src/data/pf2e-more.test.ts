import { describe, expect, it } from "vitest";
import { ANCESTRIES, CLASSES } from "./pf2e";
import { derive } from "../pf2e/build";
import type { Pf2eProgress } from "../types";

describe("черновики второй книги ядра", () => {
  it("держит народы и классы открытой лицензии", () => {
    expect(ANCESTRIES.length).toBeGreaterThanOrEqual(34);
    expect(CLASSES.length).toBeGreaterThanOrEqual(28);
    expect(ANCESTRIES.find((item) => item.id === "kobold")?.hp).toBe(6);
    expect(ANCESTRIES.find((item) => item.id === "kholo")?.boosts).toEqual(["str", "int"]);
    expect(CLASSES.find((item) => item.id === "alchemist")?.spell).toBeUndefined();
    expect(CLASSES.find((item) => item.id === "sorcerer")?.extraSkills).toBe(2);
    expect(CLASSES.find((item) => item.id === "barbarian")?.will).toBe("expert");
  });

  it("считает хиты кхоло-варвара из хитов народа и класса", () => {
    const progress: Pf2eProgress = {
      freeArchetype: false,
      ancestryId: "kholo",
      heritageId: "kholo-cave",
      backgroundId: "warrior",
      classId: "barbarian",
      keyAbility: "str",
      toggles: [],
      dailyFeats: [],
      choices: [
        { id: "a", level: 1, source: "ancestry-boost", pick: "str" },
        { id: "b0", level: 1, source: "background-boost", pick: "str" },
        { id: "b1", level: 1, source: "background-boost", pick: "con" },
        { id: "c", level: 1, source: "class-boost", pick: "str" },
        { id: "f0", level: 1, source: "free-boost", pick: "str" },
        { id: "f1", level: 1, source: "free-boost", pick: "con" },
        { id: "f2", level: 1, source: "free-boost", pick: "dex" },
        { id: "f3", level: 1, source: "free-boost", pick: "wis" },
      ],
    };
    const sheet = derive({ progress, items: [], level: 1 });
    expect(sheet.abilities.con.mod).toBe(2);
    expect(sheet.abilities.int.mod).toBe(1);
    expect(sheet.hp.value).toBe(8 + 12 + 2);
  });
});
