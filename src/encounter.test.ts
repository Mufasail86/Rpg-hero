import { describe, expect, it } from "vitest";
import { dnd2014Guidance, dnd2024Budget, pfAward, pfBudget, pfCreatureXp, sameEdition } from "./encounter";

describe("бюджет встречи", () => {
  it("ремастер: умеренная встреча четырёх героев стоит 80, поправка низкой угрозы 20", () => {
    expect(pfBudget(4, "moderate").xp).toBe(80);
    expect(pfBudget(5, "moderate")).toEqual({ xp: 100, orLess: false });
    expect(pfBudget(4, "low").xp).toBe(60);
    expect(pfBudget(3, "low").xp).toBe(40);
    expect(pfBudget(4, "trivial")).toEqual({ xp: 40, orLess: true });
    expect(pfCreatureXp(5, 2)).toBe(15);
    expect(pfCreatureXp(5, 5)).toBe(40);
    expect(pfAward(5, [5, 5])).toEqual({ xp: 80, missing: 0 });
    expect(pfCreatureXp(5, 11)).toBeNull();
  });

  it("правила 2024 умножают таблицу страницы 202 на размер отряда", () => {
    expect(dnd2024Budget(1, 4, "low")).toBe(200);
    expect(dnd2024Budget(3, 5, "moderate")).toBe(1125);
    expect(dnd2024Budget(15, 6, "high")).toBe(46800);
    expect(dnd2024Budget(3, 5, "high")).toBe(2000);
  });

  it("справочник 5.1 не получает бюджет 2024 года", () => {
    expect(dnd2014Guidance()).toContain("5.1");
    expect(dnd2014Guidance()).not.toContain("7800");
    expect(sameEdition("dnd-2014", ["dnd-2014"])).toBe(true);
    expect(sameEdition("dnd-2024", ["dnd-2024", "dnd-2014"])).toBe(false);
    expect(sameEdition("pf-remaster", ["dnd-2024"])).toBe(false);
  });
});
