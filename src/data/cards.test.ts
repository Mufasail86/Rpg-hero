import { describe, expect, it } from "vitest";
import { CARDS, CARD_BY_ID, actionGlyph, prereqLine } from "./cards";

const BANNED = ["не перенесена", "задано,", "Из полей"];

function cardBlob(card: (typeof CARDS)[number]): string {
  return [
    card.summary,
    card.trigger,
    card.requirements,
    card.frequency,
    card.prereqNote,
    card.heightened,
    card.defense,
    card.cast,
    card.duration,
    card.range,
    card.area,
    card.targets,
  ].filter(Boolean).join(" ");
}

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

  it("ловкое уклонение пересказывает триггер, требование и эффект", () => {
    const card = CARD_BY_ID.get("nimble-dodge");
    expect(card?.trigger).toBe("враг, которого вы видите, атакует вас");
    expect(card?.requirements).toBe("вы не обременены");
    expect(card?.summary).toContain("+2 к КБ");
    expect(cardBlob(card!)).not.toContain("не перенесена");
  });

  it("ни одна карточка не держит заглушку поля", () => {
    const left = CARDS.filter((card) => BANNED.some((needle) => cardBlob(card).includes(needle)));
    expect(left.map((card) => card.id)).toEqual([]);
  });

  it("лечение не повторяет сотворение и усиление в абзаце эффекта", () => {
    const card = CARD_BY_ID.get("heal");
    expect(card?.summary).not.toContain("Сотворение");
    expect(card?.summary).not.toContain("круге");
    expect(card?.heightened).toContain("1d8");
  });

  it("посвящение медика требует медицину и боевую медицину", () => {
    const card = CARD_BY_ID.get("medic-dedication");
    expect(card?.kind).toBe("dedication");
    expect(prereqLine(card!)).toContain("Медицина");
    expect(card?.gates.some((gate) => gate.kind === "feat" && gate.id === "battle-medicine")).toBe(true);
    expect(card?.summary).toContain("Медицина");
  });
});
