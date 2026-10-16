import { describe, expect, it } from "vitest";
import type { ItemInst } from "../types";
import { deriveProgress, sheetDnd } from "./build";
import { guardCharacter, guardItems, guardProgress } from "./guard";

function at(level: number, progress = guardProgress(), items = guardItems(), conditions: Record<string, number> = {}) {
  return deriveProgress(progress, items, conditions, [], level);
}

describe("Страж Ограда", () => {
  const sheet = at(20);

  it("считает контрольные показатели из выборов, без ветки по имени", () => {
    expect(sheet.abilities.str).toMatchObject({ score: 20, mod: 5 });
    expect(sheet.abilities.dex).toMatchObject({ score: 18, mod: 4 });
    expect(sheet.abilities.con).toMatchObject({ score: 20, mod: 5 });
    expect(sheet.abilities.int.mod).toBe(-1);
    expect(sheet.abilities.wis).toMatchObject({ score: 13, mod: 1 });
    expect(sheet.abilities.cha.mod).toBe(-1);
    expect(sheet.pb).toBe(6);
    expect(sheet.hp.value).toBe(264);
    expect(sheet.hp.formula).toBe("ПЗ +264 = (кость 10 + Телосложение +5) + (6 + Телосложение +5) × 19 + Живучесть 40");
    expect(sheet.ac.value).toBe(19);
    expect(sheet.ac.formula).toBe("КБ +19 = Кольчуга 16 + Ловкость +0 (предел +0) + оборона +1 + щит +2");
    expect(sheet.speed.value).toBe(30);
    expect(sheet.initiative.value).toBe(4);
    expect(sheet.initiative.aside.join(" ")).toMatch(/преимущество/);
    expect(sheet.saves.str.value).toBe(11);
    expect(sheet.saves.dex.value).toBe(4);
    expect(sheet.saves.dex.proficient).toBe(false);
    expect(sheet.skills.athletics.value).toBe(11);
    expect(sheet.skills.athletics.formula).toBe("Атлетика +11 = Сила +5 + мастерство +6");
    expect(sheet.skills.acrobatics.value).toBe(10);
    expect(sheet.skills.perception.value).toBe(7);
    const sword = sheet.attacks.find((attack) => attack.name.includes("Длинный"));
    expect(sword?.attack.value).toBe(11);
    expect(sword?.attack.formula).toBe("Длинный меч +11 = Сила +5 + мастерство +6");
    expect(sword?.damage).toBe("1d8 рубящего+7");
    expect(sheet.attacksPerAction).toBe(4);
    expect(sheet.crit).toBe("18–20");
    expect(sheet.resources.find((item) => item.id === "wind")?.max).toBe(4);
    expect(sheet.resources.find((item) => item.id === "surge")?.max).toBe(2);
    const build = sheet.issues.filter((issue) => issue.kind === "build");
    expect(build, build.map((issue) => issue.message).join("\n")).toEqual([]);
  });
});

describe("приёмка D&D", () => {
  it("Живучесть добавляет и снимает ровно 2 хита за уровень", () => {
    const progress = guardProgress();
    progress.choices = progress.choices.filter((choice) => choice.pick !== "feat:tough");
    expect(at(20).hp.value - at(20, progress).hp.value).toBe(40);
    expect(at(20, progress).hp.value).toBe(224);
  });

  it("Оборона даёт +1 только в доспехе, дуэль даёт +2 к урону и не к атаке", () => {
    const progress = guardProgress();
    progress.choices = progress.choices.map((choice) => choice.pick === "defense" ? { ...choice, pick: "archery" } : choice);
    expect(at(20).ac.value - at(20, progress).ac.value).toBe(1);
    const bare = guardItems().map((item) => item.kind === "armor" ? { ...item, equipped: false } : item);
    expect(at(20, guardProgress(), bare).ac.value).toBe(16);
    const noDuel = guardProgress();
    noDuel.choices = noDuel.choices.filter((choice) => choice.pick !== "dueling");
    expect(at(20, noDuel).attacks.find((attack) => attack.name.includes("Длинный"))?.damage).toBe("1d8 рубящего+5");
    expect(at(20, noDuel).attacks.find((attack) => attack.name.includes("Длинный"))?.attack.value).toBe(11);
  });

  it("дополнительная атака воина растёт по уровню и на 20 это четыре атаки", () => {
    expect(at(1).attacksPerAction).toBe(1);
    expect(at(5).attacksPerAction).toBe(2);
    expect(at(11).attacksPerAction).toBe(3);
    expect(at(20).attacksPerAction).toBe(4);
    expect(at(5).crit).toBe("19–20");
    expect(at(1).crit).toBe("20");
  });

  it("свой доспех и магический меч меняют КБ и атаку", () => {
    const items: ItemInst[] = [
      { uid: "plate", name: "Свой латный", qty: 1, weight: 65, equipped: true, kind: "armor", custom: true, magicBonus: 1, armor: { ac: 18, dexCap: 0, category: "heavy" } },
      { uid: "sword", name: "Меч +1", qty: 1, weight: 3, equipped: true, kind: "weapon", custom: true, magicBonus: 1, weapon: { damage: "1d8", attr: "str", category: "martial", hands: 1 } },
    ];
    const sheet = at(20, guardProgress(), items);
    expect(sheet.ac.value).toBe(20);
    expect(sheet.ac.formula).toMatch(/Ловкость \+0/);
    expect(sheet.attacks[0].attack.value).toBe(12);
    expect(sheet.attacks[0].damage).toBe("1d8+8");
  });

  it("истощение режет проверки и скорость и не складывается само с собой дважды", () => {
    const sheet = at(20, guardProgress(), guardItems(), { exhaustion: 2 });
    expect(sheet.skills.athletics.value).toBe(7);
    expect(sheet.attacks.find((attack) => attack.name.includes("Длинный"))?.attack.value).toBe(7);
    expect(sheet.speed.value).toBe(20);
    expect(sheet.ac.value).toBe(19);
  });

  it("ранний стиль ломается, если чемпиона сменить", () => {
    const progress = guardProgress();
    progress.subclassId = "";
    const sheet = at(20, progress);
    expect(sheet.issues.some((issue) => issue.kind === "build" && issue.message.includes("dueling"))).toBe(true);
    expect(sheet.attacks.find((attack) => attack.name.includes("Длинный"))?.damage).toBe("1d8 рубящего+5");
  });

  it("Борец без Силы 13 не повышает характеристику", () => {
    const progress = guardProgress();
    progress.base = { ...progress.base, str: 8, dex: 10 };
    progress.choices = progress.choices.map((choice) => choice.id === "asi-4" ? { ...choice, pick: "feat:grappler", detail: { ability: "str" } } : choice);
    const sheet = at(4, progress);
    expect(sheet.issues.some((issue) => issue.kind === "build" && issue.message.includes("Борец"))).toBe(true);
    expect(sheet.abilities.str.score).toBe(8);
  });

  it("просмотр 1 уровня не стирает план 20", () => {
    const progress = guardProgress();
    const early = at(1, progress);
    expect(early.abilities.str.score).toBe(17);
    expect(early.hp.value).toBe(15);
    expect(early.attacksPerAction).toBe(1);
    expect(progress.choices.some((choice) => choice.id === "asi-16")).toBe(true);
    expect(at(20, progress).abilities.str.score).toBe(20);
  });

  it("свой щит берёт записанный бонус КБ", () => {
    const items = guardItems().map((item) => item.kind === "shield"
      ? { ...item, magicBonus: 1, shield: { acBonus: 3, hardness: 0, hp: 0, bt: 0 } }
      : item);
    expect(at(20, guardProgress(), items).ac.value).toBe(21);
  });

  it("своя черта без включённого эффекта не меняет КБ", () => {
    const hero = guardCharacter();
    hero.feats.push({ id: "ward", name: "Свой оберег", info: "Проза не считается.", custom: true });
    const plain = sheetDnd(hero);
    expect(plain?.ac.value).toBe(19);
    expect(plain?.issues.some((issue) => issue.kind === "limit" && issue.message.includes("Свой оберег"))).toBe(true);
    hero.feats[hero.feats.length - 1].effects = [{ label: "Свой оберег", target: "ac", type: "untyped", value: 1, implemented: true }];
    expect(sheetDnd(hero)?.ac.value).toBe(20);
  });

  it("волшебник 5 уровня получает ячейки полной таблицы и предупреждение о подклассе", () => {
    const sheet = deriveProgress({
      speciesId: "human",
      backgroundId: "sage",
      classId: "wizard",
      subclassId: "evoker",
      base: { str: 8, dex: 14, con: 14, int: 15, wis: 12, cha: 10 },
      speed: 30,
      toggles: [],
      choices: [
        { id: "skill-species", level: 1, source: "skill", pick: "perception" },
        { id: "skill-class-0", level: 1, source: "skill", pick: "investigation" },
        { id: "skill-class-1", level: 1, source: "skill", pick: "medicine" },
        { id: "origin-feat", level: 1, source: "feat", pick: "feat:alert" },
        { id: "asi-4", level: 4, source: "asi", pick: "int+2" },
      ],
    }, [], {}, [], 5);
    expect(sheet.issues.filter((issue) => issue.kind === "build")).toEqual([]);
    expect(sheet.issues.some((issue) => issue.kind === "limit" && issue.message.includes("подкласса"))).toBe(true);
    expect(sheet.slots).toEqual([{ rank: 1, max: 4 }, { rank: 2, max: 3 }, { rank: 3, max: 2 }]);
    expect(sheet.abilities.int).toMatchObject({ score: 17, mod: 3 });
    expect(sheet.initiative.value).toBe(5);
    expect(sheet.hp.value).toBe(32);
  });

  it("снимок кладёт посчитанные характеристики и не читает заметку", () => {
    const hero = guardCharacter();
    expect(hero.notes).toMatch(/не из этого текста/);
    expect(hero.abilities.str).toBe(20);
    expect(hero.hpCurrent).toBe(264);
    expect(hero.skillRanks.athletics).toBe("proficient");
    expect(sheetDnd(hero)?.ac.value).toBe(19);
  });
});
