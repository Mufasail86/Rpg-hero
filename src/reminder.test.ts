import { describe, expect, it } from "vitest";
import { artefolCharacter } from "./pf2e/artefol";
import { ANATHEMA_NOTE, reminderFromClass, reminderOf, vowCount } from "./reminder";
import { readSave, serialize } from "./transfer";

describe("памятка", () => {
  it("хранит наказы, биографию и божество и не теряет их при переносе", () => {
    const hero = artefolCharacter();
    hero.reminder = reminderOf({
      reminder: {
        backstory: "Ищет сестру.",
        deity: { name: "Иомедэй", domains: "долг", symbol: "меч и солнце", weapon: "длинный меч", edicts: "Держать слово.", anathema: "Бросить слабого." },
        vows: [
          { id: "a", kind: "taboo", text: "Не бить безоружного." },
          { id: "b", kind: "bad", text: "Своя строка." },
        ],
      },
    });
    const text = serialize([hero]);
    const read = readSave(text);
    if ("error" in read) throw new Error(read.error);
    const back = reminderOf(read.characters[0]);
    expect(back.backstory).toBe("Ищет сестру.");
    expect(back.deity.weapon).toBe("длинный меч");
    expect(back.deity.anathema).toBe("Бросить слабого.");
    expect(vowCount(back)).toBe(2);
    expect(back.vows[1].kind).toBe("note");
    expect(ANATHEMA_NOTE).toMatch(/жреца/);
    expect(ANATHEMA_NOTE).toMatch(/не связывает/);
  });

  it("покровитель жреца попадает в памятку, обычный воин остаётся без божества", () => {
    const cleric = reminderFromClass("pf2e", "cleric", "light");
    expect(cleric?.deity.weapon).toBe("булава");
    expect(cleric?.deity.anathema).toMatch(/ранен/);
    expect(reminderFromClass("pf2e", "fighter", "light")).toBeUndefined();
    expect(reminderFromClass("dnd5e", "cleric", "light")).toBeUndefined();
  });

  it("пустая старая запись не падает", () => {
    const reminder = reminderOf({});
    expect(reminder.backstory).toBe("");
    expect(reminder.vows).toEqual([]);
    expect(vowCount(reminder)).toBe(0);
  });
});
