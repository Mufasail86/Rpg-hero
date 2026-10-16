import { catalog } from "../create";
import { emptyCoins, type BuildChoice, type Character, type DndProgress, type ItemInst } from "../types";
import { deriveProgress, snapshotDnd } from "./build";

function choice(id: string, level: number, source: string, pick: string, detail?: Record<string, string>): BuildChoice {
  return { id, level, source, pick, detail };
}

/** Контрольный воин 20. Имя в расчёт не входит. */
export function guardProgress(): DndProgress {
  return {
    speciesId: "human",
    backgroundId: "soldier",
    classId: "fighter",
    subclassId: "champion",
    base: { str: 17, dex: 13, con: 16, int: 8, wis: 12, cha: 8 },
    speed: 30,
    toggles: [],
    choices: [
      choice("skill-species", 1, "skill", "acrobatics"),
      choice("skill-class-0", 1, "skill", "perception"),
      choice("skill-class-1", 1, "skill", "survival"),
      choice("style-1", 1, "style", "defense"),
      choice("style-7", 7, "style", "dueling"),
      choice("mastery-0", 1, "mastery", "longsword"),
      choice("mastery-1", 1, "mastery", "greatsword"),
      choice("mastery-2", 1, "mastery", "javelin"),
      choice("mastery-3", 4, "mastery", "flail"),
      choice("mastery-4", 10, "mastery", "longbow"),
      choice("mastery-5", 16, "mastery", "shortsword"),
      choice("asi-4", 4, "asi", "str+2"),
      choice("asi-6", 6, "asi", "str+1,wis+1"),
      choice("asi-8", 8, "asi", "con+2"),
      choice("asi-12", 12, "asi", "con+2"),
      choice("asi-14", 14, "asi", "dex+2"),
      choice("asi-16", 16, "asi", "dex+2"),
      choice("origin-feat", 1, "feat", "feat:tough"),
      choice("epic-19", 19, "epic", "boon:combat-prowess", { ability: "dex" }),
    ],
  };
}

export function guardItems(): ItemInst[] {
  return [gear("chainmail", true), gear("shield", true), gear("longsword", true), gear("greatsword", false)];
}

export function guardCharacter(): Character {
  const dnd = guardProgress();
  const derived = deriveProgress(dnd, guardItems(), {}, [], 20);
  const base: Character = {
    id: "strazh-ograda",
    system: "dnd5e",
    name: "Страж Ограда",
    level: 20,
    xp: 0,
    hpCurrent: derived.hp.value,
    hpTemp: 0,
    hpBonus: 0,
    hpRolls: [],
    hero: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    ancestryId: "human",
    ancestryName: "Человек",
    ancestryInfo: "Навык, черта происхождения Живучесть, вдохновение после долгого отдыха.",
    size: "Средний",
    speed: 30,
    senses: "Обычное зрение",
    ancestryHp: 0,
    tough: false,
    backgroundId: "soldier",
    backgroundName: "Солдат",
    backgroundInfo: "Атлетика, Запугивание и Дикий натиск.",
    classId: "fighter",
    className: "Воин",
    classInfo: "Чемпион. Кольчуга, щит и длинный меч, без магических предметов.",
    subclassName: "Чемпион",
    hitDie: 10,
    classHp: 6,
    saves: { str: "proficient", con: "proficient" },
    skillRanks: {},
    extraSkills: [],
    feats: [{ id: "tough", name: "Живучесть", info: "Максимум хитов +2 за каждый уровень." }, { id: "savage", name: "Дикий натиск", info: "Раз за ход можно взять лучший из двух бросков костей урона оружия." }],
    features: [],
    items: guardItems(),
    coins: emptyCoins(),
    spellcasting: null,
    spells: [],
    preparedIds: [],
    bonusSpellIds: [],
    slots: [],
    focus: null,
    hitDice: { sides: 10, max: 20, current: 10 },
    conditions: [],
    conditionValues: {},
    languages: "Общий",
    notes: "Контрольный персонаж D&D. Числа считает лист из выборов, не из этого текста.",
    shieldRaised: false,
    weaponRules: { simple: true, martial: true, martialFinesseOrLight: true, martialLight: true, unarmed: true },
    armorTraining: ["light", "medium", "heavy", "shield"],
    fightingStyle: "",
    unarmored: "none",
    keyAbility: "str",
    armorRanks: {},
    weaponRanks: {},
    perceptionRank: "untrained",
    classDcRank: "untrained",
    spellRank: "untrained",
    thiefDamage: false,
    resources: [],
    pendingAsi: false,
    createdAt: 1,
    updatedAt: 1,
    formatVersion: 2,
    dnd,
  };
  const next = snapshotDnd({ ...base, hpCurrent: derived.hp.value });
  next.hpCurrent = derived.hp.value;
  return next;
}

function gear(id: string, equipped: boolean): ItemInst {
  const item = catalog("dnd5e").find((entry) => entry.id === id);
  if (!item) throw new Error(id);
  return {
    uid: id,
    catalogId: id,
    name: item.name,
    qty: 1,
    weight: item.weight,
    equipped,
    kind: item.kind,
    notes: item.info,
    armor: item.armor,
    weapon: item.weapon ? { ...item.weapon, hands: item.weapon.twoHanded ? 2 : 1 } : undefined,
  };
}
