import { describe, expect, it } from "vitest";
import { artefolCharacter, artefolInput } from "./artefol";
import { derive, trainedSkills, type DeriveInput } from "./build";
import type { ItemInst } from "../types";

function input(partial: Partial<DeriveInput> = {}): DeriveInput {
  const base = artefolInput();
  return {
    ...base,
    ...partial,
    progress: partial.progress ?? structuredClone(base.progress),
    items: partial.items ?? base.items.map((item) => ({ ...item, armor: item.armor ? { ...item.armor } : undefined, weapon: item.weapon ? { ...item.weapon } : undefined })),
  };
}

describe("Артефол Побочка", () => {
  const sheet = derive(artefolInput());

  it("считает контрольные показатели из выборов, без ветки по имени", () => {
    const renamed = derive(input());
    expect(sheet.hp.value).toBe(renamed.hp.value);
    expect(sheet.abilities.str.mod).toBe(6);
    expect(sheet.abilities.dex.mod).toBe(5);
    expect(sheet.abilities.con.mod).toBe(5);
    expect(sheet.abilities.int.mod).toBe(0);
    expect(sheet.abilities.wis.mod).toBe(4);
    expect(sheet.abilities.cha.mod).toBe(0);
    expect(sheet.abilities.str.score).toBe(22);
    expect(sheet.abilities.wis.score).toBe(18);
    expect(sheet.abilities.wis.partial).toBe(true);
    expect(sheet.hp.value).toBe(328);
    expect(sheet.speed.value).toBe(30);
    expect(sheet.skills.athletics.value).toBe(34);
    expect(sheet.skills.athletics.formula).toBe("Атлетика +34 = Сила +6 + уровень 20 + легенда +8");
    expect(sheet.skills.stealth.value).toBe(33);
    expect(sheet.skills.medicine.value).toBe(32);
    expect(sheet.skills.thievery.value).toBe(31);
    expect(sheet.skills.acrobatics.value).toBe(31);
    expect(sheet.skills.thievery.rank).toBe("master");
    expect(sheet.skills.acrobatics.rank).toBe("master");
    expect(sheet.saves.will.value).toBe(30);
    expect(sheet.saves.will.rank).toBe("master");
    const sword = sheet.attacks.find((attack) => attack.name.includes("меч"));
    expect(sword?.attack.value).toBe(34);
    expect(sword?.rank).toBe("legendary");
    expect(sheet.ac.value).toBe(41);
    expect(sheet.ac.aside.join(" ")).toMatch(/не входит в обычный/i);
    const build = sheet.issues.filter((issue) => issue.kind === "build");
    expect(build, build.map((issue) => issue.message).join("\n")).toEqual([]);
  });

  it("дуэльное парирование даёт 43 и не сидит в выключенном КБ", () => {
    expect(derive(artefolInput()).ac.value).toBe(41);
    const on = derive(input({ toggles: ["dueling-parry"] }));
    expect(on.ac.value).toBe(43);
    expect(on.ac.formula).toMatch(/дуэльное парирование \+2/);
  });
});

describe("приёмка расчёта", () => {
  it("Живучесть добавляет и снимает только свой уровень хитов", () => {
    const withFeat = derive(input());
    const progress = structuredClone(input().progress);
    progress.choices = progress.choices.filter((choice) => choice.pick !== "toughness");
    const without = derive(input({ progress }));
    expect(withFeat.hp.value - without.hp.value).toBe(20);
    expect(without.hp.value).toBe(308);
  });

  it("Быстроногий даёт +5 футов и снимается вместе с чертой", () => {
    const progress = structuredClone(input().progress);
    progress.choices = progress.choices.filter((choice) => choice.pick !== "fleet");
    expect(derive(input()).speed.value - derive(input({ progress })).speed.value).toBe(5);
    expect(derive(input({ progress })).speed.value).toBe(25);
  });

  it("владение оружием воина растёт по классу и на 20 уровне не эксперт", () => {
    const at1 = derive(input({ level: 1 }));
    const at5 = derive(input({ level: 5 }));
    const at20 = derive(input({ level: 20 }));
    const sword = (sheet: ReturnType<typeof derive>) => sheet.attacks.find((attack) => attack.group === "sword");
    const bow = (sheet: ReturnType<typeof derive>) => sheet.attacks.find((attack) => attack.group === "bow");
    expect(sword(at1)?.rank).toBe("expert");
    expect(sword(at5)?.rank).toBe("master");
    expect(bow(at5)?.rank).toBe("expert");
    const at13 = derive(input({ level: 13 }));
    expect(sword(at13)?.rank).toBe("legendary");
    expect(bow(at13)?.rank).toBe("master");
    expect(sword(at20)?.rank).toBe("legendary");
    expect(sword(at20)?.rank).not.toBe("expert");
  });

  it("Тяжёлая ноша двигает только предел объёма", () => {
    const withFeat = derive(input());
    const progress = structuredClone(input().progress);
    progress.choices = progress.choices.filter((choice) => choice.pick !== "hefty");
    const without = derive(input({ progress }));
    expect(withFeat.load.limit - without.load.limit).toBe(2);
    expect(withFeat.ac.value).toBe(without.ac.value);
    expect(withFeat.hp.value).toBe(without.hp.value);
  });

  it("нереализованный свой эффект не меняет КБ и попадает в ограничение", () => {
    const plain = derive(input());
    const marked = derive(input({ customEffects: [{ label: "Своя черта", target: "ac", type: "circumstance", value: 2, implemented: false }] }));
    expect(marked.ac.value).toBe(plain.ac.value);
    expect(marked.issues.some((issue) => issue.kind === "limit" && issue.message.includes("Своя черта"))).toBe(true);
  });

  it("свой доспех меняет КБ, предел Ловкости и объём", () => {
    const items: ItemInst[] = [
      {
        uid: "custom",
        name: "Своя кираса",
        qty: 1,
        weight: 3,
        equipped: true,
        kind: "armor",
        custom: true,
        armor: { bonus: 4, dexCap: 0, category: "heavy", strReq: 14, checkPenalty: 3, speedPenalty: 10 },
      },
      ...artefolInput().items.filter((item) => item.kind === "weapon"),
    ];
    const sheet = derive(input({ items }));
    expect(sheet.ac.value).toBe(40);
    expect(sheet.ac.formula).toMatch(/Ловкость \+0/);
    expect(sheet.load.bulk).toBe(5);
  });

  it("Мастерство навыка поднимает ранги и даёт черту, а не два новых навыка", () => {
    const before = derive(input({ level: 9 }));
    const after = derive(input({ level: 10 }));
    expect(trainedSkills(before).sort()).toEqual(trainedSkills(after).sort());
    expect(before.skills.acrobatics.rank).toBe("expert");
    expect(after.skills.acrobatics.rank).toBe("master");
    expect(before.skills.thievery.rank).toBe("trained");
    expect(after.skills.thievery.rank).toBe("expert");
    expect(after.feats.some((feat) => feat.id === "pickpocket")).toBe(true);
    expect(after.issues.filter((issue) => issue.kind === "build")).toEqual([]);
  });

  it("ранний выбор заново проверяет мастерство навыка", () => {
    const progress = structuredClone(input().progress);
    const heritage = progress.choices.find((choice) => choice.id === "heritage-skill");
    if (!heritage) throw new Error("нет наследия");
    heritage.pick = "society";
    const sheet = derive(input({ progress }));
    expect(sheet.issues.some((issue) => issue.kind === "build" && issue.message.includes("Мастерство навыка"))).toBe(true);
    expect(sheet.skills.acrobatics.rank).not.toBe("master");
  });

  it("одинаковые штрафы состояния не складываются", () => {
    const sheet = derive(input({ conditions: { frightened: 2, sickened: 1 } }));
    expect(sheet.skills.athletics.value).toBe(32);
  });

  it("предметные бонусы рун не складываются", () => {
    const items = structuredClone(artefolInput().items);
    const sword = items.find((item) => item.catalogId === "longsword");
    if (!sword) throw new Error("меч");
    sword.runes = { potency: 1 };
    const plain = derive(input());
    const runed = derive(input({ items }));
    expect(runed.attacks.find((attack) => attack.group === "sword")?.attack.value).toBe((plain.attacks.find((attack) => attack.group === "sword")?.attack.value ?? 0) + 1);
    sword.runes = { potency: 2 };
    const stronger = derive(input({ items: structuredClone(items) }));
    expect(stronger.attacks.find((attack) => attack.group === "sword")?.attack.value).toBe((plain.attacks.find((attack) => attack.group === "sword")?.attack.value ?? 0) + 2);
  });

  it("универсальное наследие не меняет хиты и пишет, что число не прибавлено", () => {
    const progress = structuredClone(artefolInput().progress);
    progress.versatileHeritageId = "dhampir";
    const sheet = derive(input({ progress }));
    expect(sheet.hp.value).toBe(328);
    expect(sheet.speed.value).toBe(30);
    expect(sheet.issues.some((issue) => issue.kind === "limit" && issue.message.includes("Универсальное наследие"))).toBe(true);
  });
});

describe("снимок персонажа", () => {
  it("кладёт посчитанные характеристики в лист и не берёт их из заметки", () => {
    const hero = artefolCharacter();
    expect(hero.notes).toMatch(/не из этого текста/);
    expect(hero.abilities.str).toBe(22);
    expect(hero.hpCurrent).toBe(328);
    expect(hero.skillRanks.athletics).toBe("legendary");
  });
});
