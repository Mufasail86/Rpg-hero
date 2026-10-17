import { describe, expect, it } from "vitest";
import { CARD_BY_ID, actionGlyph, prereqLine } from "./cards";

describe("карточки правил", () => {
  it("блок щитом показывает реакцию, черту и книгу", () => {
    const card = CARD_BY_ID.get("shield-block");
    expect(card?.kind).toBe("feat");
    expect(card?.level).toBe(1);
    expect(actionGlyph(card?.actions ?? "")).toBe("↺");
    expect(card?.traits).toContain("general");
    expect(card?.book).toBe("Ядро игрока");
    expect(card?.summary).not.toContain("Черта из полей");
    expect(card?.originalName).toBe("Shield Block");
  });

  it("лечение собрано из полей круга, традиций и повышения", () => {
    const card = CARD_BY_ID.get("heal");
    expect(card?.kind).toBe("spell");
    expect(card?.level).toBe(1);
    expect(card?.traditions).toEqual(["божественная", "первозданная"]);
    expect(card?.cast).toBe("от 1 до 3 действий");
    expect(card?.defense).toContain("Стойкость");
    expect(card?.heightened).toContain("1d8");
    expect(card?.summary).not.toContain("You channel");
  });

  it("посвящение медика требует медицину и боевую медицину", () => {
    const card = CARD_BY_ID.get("medic-dedication");
    expect(card?.kind).toBe("dedication");
    expect(prereqLine(card!)).toContain("Медицина");
    expect(card?.gates.some((gate) => gate.kind === "feat" && gate.id === "battle-medicine")).toBe(true);
    expect(card?.summary).toContain("Медицина");
  });
});
