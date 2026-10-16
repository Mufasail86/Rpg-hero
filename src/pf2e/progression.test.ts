import { describe, expect, it } from "vitest";
import type { ItemInst, Pf2eProgress } from "../types";
import { slotsFor } from "../rules";
import { derive } from "./build";
import { artefolProgress } from "./artefol";

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

function weapon(category: "simple" | "martial" | "advanced" | "unarmed", group = "axe"): ItemInst {
  return {
    uid: `${category}-${group}`,
    name: category,
    qty: 1,
    weight: 1,
    equipped: true,
    kind: "weapon",
    weapon: { damage: "1d8", attr: "str", category, group },
  };
}

describe("владение 1–20 из фраз класса", () => {
  it("воин Артефола на 20 уровне не меняет волю и оставляет группу мечей легендарной", () => {
    const sheet = derive({
      progress: artefolProgress(),
      items: [weapon("martial", "sword"), weapon("martial", "axe"), weapon("advanced", "sword")],
      level: 20,
      toggles: artefolProgress().toggles,
    });
    expect(sheet.saves.will.rank).toBe("master");
    expect(sheet.saves.fort.rank).toBe("master");
    expect(sheet.saves.ref.rank).toBe("master");
    expect(sheet.perception.rank).toBe("master");
    expect(sheet.attacks.find((attack) => attack.group === "sword" && attack.category === "martial")?.rank).toBe("legendary");
    expect(sheet.attacks.find((attack) => attack.group === "axe")?.rank).toBe("legendary");
    expect(sheet.attacks.find((attack) => attack.category === "advanced")?.rank).toBe("master");
  });

  it("у волшебника простое оружие становится экспертом, воинское нет", () => {
    const progress = bare("wizard");
    const early = derive({ progress, items: [weapon("simple"), weapon("martial")], level: 1 });
    expect(early.attacks.find((attack) => attack.category === "simple")?.rank).toBe("trained");
    expect(early.attacks.find((attack) => attack.category === "martial")?.rank).toBe("untrained");
    const later = derive({ progress, items: [weapon("simple"), weapon("martial")], level: 11 });
    expect(later.attacks.find((attack) => attack.category === "simple")?.rank).toBe("expert");
    expect(later.attacks.find((attack) => attack.category === "martial")?.rank).toBe("untrained");
    expect(later.spell?.rank).toBe("expert");
  });

  it("друид не получает воинское оружие из чужой фразы", () => {
    const sheet = derive({ progress: bare("druid"), items: [weapon("martial"), weapon("simple")], level: 20 });
    expect(sheet.attacks.find((attack) => attack.category === "martial")?.rank).toBe("untrained");
    expect(sheet.attacks.find((attack) => attack.category === "simple")?.rank).toBe("expert");
    expect(sheet.spell?.rank).toBe("legendary");
  });

  it("монах не поднимает испытание, пока игрок его не выбрал", () => {
    const open = derive({ progress: bare("monk"), items: [], level: 7 });
    expect(open.saves.fort.rank).toBe("expert");
    expect(open.issues.some((issue) => issue.message.includes("Путь к совершенству"))).toBe(true);
    const progress = bare("monk");
    progress.choices = [
      { id: "monk-save-7", level: 7, source: "monk-save", pick: "ref" },
      { id: "monk-save-11", level: 11, source: "monk-save", pick: "will" },
      { id: "monk-save-15", level: 15, source: "monk-save", pick: "ref" },
    ];
    const sheet = derive({ progress, items: [], level: 15 });
    expect(sheet.saves.ref.rank).toBe("legendary");
    expect(sheet.saves.will.rank).toBe("master");
    expect(sheet.saves.fort.rank).toBe("expert");
  });

  it("военная доктрина учит лёгкому доспеху и не делает все доспехи экспертами на 1 уровне", () => {
    const progress = bare("cleric");
    progress.keyAbility = "wis";
    progress.choices = [{ id: "doctrine", level: 1, source: "doctrine", pick: "warpriest" }];
    const armor: ItemInst = {
      uid: "mail",
      name: "Кольчуга",
      qty: 1,
      weight: 2,
      equipped: true,
      kind: "armor",
      armor: { bonus: 4, dexCap: 1, category: "medium", strReq: 16, checkPenalty: 2, speedPenalty: 5 },
    };
    const first = derive({ progress, items: [armor], level: 1 });
    expect(first.ac.formula).toContain("обучен");
    const later = derive({ progress, items: [armor, weapon("martial")], level: 7 });
    expect(later.attacks[0].rank).toBe("expert");
  });

  it("руна ударов увеличивает число костей, устойчивость входит в испытание", () => {
    const sword: ItemInst = {
      uid: "sword",
      name: "Меч",
      qty: 1,
      weight: 1,
      equipped: true,
      kind: "weapon",
      weapon: { damage: "1d8", attr: "str", category: "martial", group: "sword" },
      runes: { potency: 1, striking: 2, property: [{ id: "flaming", name: "Пламенная" }] },
    };
    const mail: ItemInst = {
      uid: "mail",
      name: "Кольчуга",
      qty: 1,
      weight: 2,
      equipped: true,
      kind: "armor",
      armor: { bonus: 4, dexCap: 1, category: "medium", strReq: 16, checkPenalty: 2, speedPenalty: 5 },
      runes: { potency: 1, resilient: 1 },
    };
    const sheet = derive({ progress: bare("fighter"), items: [sword, mail], level: 1 });
    expect(sheet.attacks[0].damage.startsWith("3d8")).toBe(true);
    expect(sheet.attacks[0].attack.formula).toContain("руна мощи +1");
    expect(sheet.attacks[0].attack.aside.join(" ")).toContain("Пламенная");
    expect(sheet.saves.fort.formula).toContain("руна устойчивости +1");
  });

  it("проклятие предков делает неуклюжим на величину ступени", () => {
    const progress = bare("oracle");
    progress.keyAbility = "cha";
    progress.choices = [{ id: "class-path", level: 1, source: "mystery", pick: "ancestors" }];
    progress.cursebound = 2;
    const sheet = derive({ progress, items: [], level: 1 });
    expect(sheet.ac.formula).toContain("неуклюжий −2");
  });

  it("встречаный ветер штрафует дальнюю атаку со 2 ступени и скорость на 4", () => {
    const progress = bare("oracle");
    progress.choices = [{ id: "class-path", level: 1, source: "mystery", pick: "tempest" }];
    progress.cursebound = 2;
    const bow = weapon("martial", "bow");
    bow.weapon = { ...bow.weapon!, ranged: true, attr: "dex" };
    const low = derive({ progress, items: [bow], level: 5 });
    expect(low.attacks[0].attack.formula).toContain("встречный ветер −2");
    progress.cursebound = 4;
    const high = derive({ progress, items: [], level: 17 });
    expect(high.speed.formula).toContain("проклятие −10");
  });
});

describe("ячейки только из текста класса", () => {
  function caster(classId: string, level: number) {
    return slotsFor({
      system: "pf2e",
      classId,
      level,
      spellcasting: { kind: "known", ability: "cha", listName: "divine", cantripLimit: 0, prepareLimit: 0, knownLimit: 0 },
    } as never);
  }

  it("оракул и чародей на 1 уровне имеют три ячейки, а таблицу выше не выдумывают", () => {
    expect(caster("oracle", 1).find((slot) => slot.rank === 1)?.max).toBe(3);
    expect(caster("sorcerer", 1).find((slot) => slot.rank === 1)?.max).toBe(3);
    expect(caster("wizard", 1).find((slot) => slot.rank === 1)?.max).toBe(2);
    expect(caster("bard", 1).find((slot) => slot.rank === 1)?.max).toBe(2);
    const later = caster("oracle", 5);
    expect(later.some((slot) => slot.rank === 3)).toBe(false);
    expect(later.some((slot) => slot.note?.includes("не лежит"))).toBe(true);
    expect(caster("oracle", 19).find((slot) => slot.rank === 10)?.max).toBe(1);
  });

  it("шрифт жреца на 1 уровне — четыре ячейки 1 круга, не модификатор Харизмы", () => {
    const slots = caster("cleric", 1);
    expect(slots.find((slot) => slot.note === "шрифт")?.max).toBe(4);
    expect(caster("cleric", 5).find((slot) => slot.note?.startsWith("шрифт"))?.max).toBe(5);
    expect(caster("cleric", 15).find((slot) => slot.note?.startsWith("шрифт"))?.max).toBe(6);
  });
});
