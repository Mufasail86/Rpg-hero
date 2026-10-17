import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ANCESTRIES, CLASSES } from "./pf2e";
import { EXCLUDED } from "./roster";
import { VERSATILE } from "./versatile";
import { featChoices } from "./pf-index";
import { portraitFile } from "../ui/art";
import { ruSort } from "../sort";
import { slotsForProgress } from "../pf2e/build";
import type { Pf2eProgress } from "../types";

function bare(classId: string): Pf2eProgress {
  return {
    freeArchetype: false,
    ancestryId: "human",
    heritageId: "",
    backgroundId: "warrior",
    classId,
    keyAbility: "str",
    toggles: [],
    dailyFeats: [],
    choices: [],
  };
}

describe("полный список ORC", () => {
  it("кладёт в конструктор народы и классы с открытой лицензией", () => {
    expect(ANCESTRIES).toHaveLength(34);
    expect(CLASSES).toHaveLength(28);
    expect(ANCESTRIES.map((item) => item.name)).toEqual(expect.arrayContaining(["Автоматон", "Котолюд", "Холо", "Людоящер", "Крысолюд", "Пробуждённое животное"]));
    expect(CLASSES.map((item) => item.name)).toEqual(expect.arrayContaining(["Защитник", "Следователь", "Колдун", "Экстрасенс", "Рунотворец"]));
    expect(ANCESTRIES.some((item) => item.id === "kitsune")).toBe(false);
    expect(CLASSES.some((item) => item.id === "kineticist")).toBe(false);
    expect(EXCLUDED.some((item) => item.id === "kineticist" && item.license === "OGL")).toBe(true);
    expect(EXCLUDED.some((item) => item.id === "ardande" && item.license === "OGL")).toBe(true);
    expect(EXCLUDED.some((item) => item.id === "talos" && item.license === "OGL")).toBe(true);
  });

  it("называет универсальные наследия как на pf2.ru и не берёт OGL", () => {
    const names = Object.fromEntries(VERSATILE.map((item) => [item.id, item.name]));
    expect(names.aiuvarin).toBe("Аюварин");
    expect(names.dromaar).toBe("Дромаар");
    expect(names.dhampir).toBe("Дампир");
    expect(names.dragonblood).toBe("Драконорождённый");
    expect(names.hungerseed).toBe("Ненасытный");
    expect(names.duskwalker).toBe("Сумеречный");
    expect(names.talos).toBeUndefined();
    expect(names.ardande).toBeUndefined();
  });

  it("сортирует имена русской локалью и даёт портрет каждому народу", () => {
    const names = ANCESTRIES.map((item) => item.name);
    expect(ruSort(names, (name) => name)).toEqual([...names].sort((left, right) => left.localeCompare(right, "ru")));
    for (const ancestry of ANCESTRIES) {
      const file = portraitFile(ancestry.id);
      expect(file, ancestry.id).toBeTruthy();
      expect(existsSync(new URL(`../../public/art/${file}`, import.meta.url))).toBe(true);
    }
  });

  it("открывает черты класса и посвящения на каждом нужном уровне", () => {
    expect(featChoices({ kind: "class", classId: "fighter", level: 1 }).length).toBeGreaterThan(0);
    expect(featChoices({ kind: "class", classId: "guardian", level: 1 }).length).toBeGreaterThan(0);
    expect(featChoices({ kind: "archetype", level: 2 }).length).toBeGreaterThan(20);
    const slots = slotsForProgress(bare("guardian"), 20).map((slot) => slot.id);
    expect(slots).toContain("class-feat-1");
    expect(slots).toContain("class-feat-20");
    expect(slotsForProgress(bare("wizard"), 1).map((slot) => slot.id)).not.toContain("class-feat-1");
  });
});
