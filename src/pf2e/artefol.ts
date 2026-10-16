import { catalog } from "../create";
import { emptyCoins, type BuildChoice, type Character, type ItemInst, type Pf2eProgress } from "../types";
import { derive, snapshot, type DeriveInput } from "./build";

function choice(id: string, level: number, source: string, pick: string, detail?: Record<string, string>): BuildChoice {
  return { id, level, source, pick, detail };
}

/** Контрольный воин 20. Имя нигде не читается расчётом: те же выборы дают те же числа. */
export function artefolProgress(): Pf2eProgress {
  const boost = (level: number, source: string, picks: string[]): BuildChoice[] =>
    picks.map((pick, index) => choice(
      source === "free-boost" ? `boost-${level}-free-${index}` : source === "ancestry-boost" ? `boost-1-ancestry-${index}` : source === "background-boost" ? `boost-1-background-${index}` : "boost-1-class",
      level,
      source,
      pick,
    ));
  return {
    freeArchetype: true,
    ancestryId: "human",
    heritageId: "skilled",
    backgroundId: "field-medic",
    classId: "fighter",
    keyAbility: "str",
    toggles: [],
    dailyFeats: [],
    choices: [
      ...boost(1, "ancestry-boost", ["str", "dex"]),
      ...boost(1, "background-boost", ["con", "str"]),
      ...boost(1, "class-boost", ["str"]),
      ...boost(1, "free-boost", ["str", "dex", "con", "wis"]),
      ...boost(5, "free-boost", ["str", "dex", "con", "wis"]),
      ...boost(10, "free-boost", ["str", "dex", "con", "wis"]),
      ...boost(15, "free-boost", ["str", "dex", "con", "wis"]),
      ...boost(20, "free-boost", ["str", "dex", "con", "wis"]),
      choice("class-skill-primary", 1, "class-skill", "athletics"),
      choice("class-skill-extra-0", 1, "class-skill", "stealth"),
      choice("class-skill-extra-1", 1, "class-skill", "thievery"),
      choice("class-skill-extra-2", 1, "class-skill", "crafting"),
      choice("heritage-skill", 1, "heritage-skill", "acrobatics"),
      choice("weapon-group", 5, "weapon-group", "sword"),
      choice("ancestry-feat-1", 1, "ancestry-feat", "cooperative-nature"),
      choice("ancestry-feat-5", 5, "ancestry-feat", "haughty-obstinacy"),
      choice("ancestry-feat-9", 9, "ancestry-feat", "unconventional-weaponry"),
      choice("ancestry-feat-13", 13, "ancestry-feat", "incredible-improvisation"),
      choice("ancestry-feat-17", 17, "ancestry-feat", "heroic-presence"),
      choice("class-feat-1", 1, "class-feat", "sudden-charge"),
      choice("class-feat-2", 2, "class-feat", "dueling-parry"),
      choice("class-feat-4", 4, "class-feat", "knockdown"),
      choice("class-feat-6", 6, "class-feat", "double-slice"),
      choice("class-feat-8", 8, "class-feat", "vicious-swing"),
      choice("class-feat-10", 10, "class-feat", "snagging-strike"),
      choice("class-feat-12", 12, "class-feat", "combat-grab"),
      choice("class-feat-14", 14, "class-feat", "intimidating-strike"),
      choice("class-feat-16", 16, "class-feat", "aggressive-block"),
      choice("class-feat-18", 18, "class-feat", "lightning-swap"),
      choice("class-feat-20", 20, "class-feat", "brutish-shove"),
      choice("skill-feat-2", 2, "skill-feat", "assurance", { skill: "athletics" }),
      choice("skill-feat-4", 4, "skill-feat", "hefty"),
      choice("skill-feat-6", 6, "skill-feat", "experienced-smuggler"),
      choice("skill-feat-8", 8, "skill-feat", "cat-fall"),
      choice("skill-feat-10", 10, "skill-feat", "survey"),
      choice("skill-feat-12", 12, "skill-feat", "underwater"),
      choice("skill-feat-14", 14, "skill-feat", "continual-recovery"),
      choice("skill-feat-16", 16, "skill-feat", "assurance", { skill: "stealth" }),
      choice("skill-feat-18", 18, "skill-feat", "assurance", { skill: "medicine" }),
      choice("skill-feat-20", 20, "skill-feat", "assurance", { skill: "thievery" }),
      choice("general-feat-3", 3, "general-feat", "canny-acumen", { defense: "will" }),
      choice("general-feat-7", 7, "general-feat", "toughness"),
      choice("general-feat-11", 11, "general-feat", "fleet"),
      choice("general-feat-15", 15, "general-feat", "diehard"),
      choice("general-feat-19", 19, "general-feat", "breath-control"),
      choice("skill-increase-3", 3, "skill-increase", "athletics"),
      choice("skill-increase-5", 5, "skill-increase", "stealth"),
      choice("skill-increase-7", 7, "skill-increase", "athletics"),
      choice("skill-increase-9", 9, "skill-increase", "stealth"),
      choice("skill-increase-11", 11, "skill-increase", "medicine"),
      choice("skill-increase-13", 13, "skill-increase", "thievery"),
      choice("skill-increase-15", 15, "skill-increase", "athletics"),
      choice("skill-increase-17", 17, "skill-increase", "stealth"),
      choice("skill-increase-19", 19, "skill-increase", "medicine"),
      choice("free-archetype-2", 2, "free-archetype", "medic-dedication"),
      choice("free-archetype-4", 4, "free-archetype", "doctors-visitation"),
      choice("free-archetype-6", 6, "free-archetype", "treat-condition"),
      choice("free-archetype-8", 8, "free-archetype", "rogue-dedication", { primary: "society", extra: "survival", feat: "dubious" }),
      choice("free-archetype-10", 10, "free-archetype", "skill-mastery", { toMaster: "acrobatics", toExpert: "thievery", feat: "pickpocket" }),
      choice("free-archetype-12", 12, "free-archetype", "basic-trickery"),
      choice("free-archetype-14", 14, "free-archetype", "sneak-attacker"),
      choice("free-archetype-16", 16, "free-archetype", "uncanny-dodge"),
      choice("free-archetype-18", 18, "free-archetype", "evasiveness"),
      choice("free-archetype-20", 20, "free-archetype", "tactical-entry"),
    ],
  };
}

export function artefolItems(): ItemInst[] {
  return [gear("scale-mail", true), gear("longsword", true), gear("shortbow", false)];
}

export function artefolInput(): DeriveInput {
  return { progress: artefolProgress(), items: artefolItems(), level: 20, conditions: {}, toggles: [], shieldRaised: false };
}

export function artefolCharacter(): Character {
  const progress = artefolProgress();
  const base: Character = {
    id: "artefol-pobochka",
    system: "pf2e",
    name: "Артефол Побочка",
    level: 20,
    xp: 0,
    hpCurrent: 1,
    hpTemp: 0,
    hpBonus: 0,
    hpRolls: [],
    hero: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    ancestryId: "human",
    ancestryName: "Человек",
    ancestryInfo: "Умелое наследие. Два свободных повышения.",
    size: "Средний",
    speed: 25,
    senses: "Обычное зрение",
    ancestryHp: 8,
    tough: false,
    backgroundId: "field-medic",
    backgroundName: "Полевой лекарь",
    backgroundInfo: "Медицина и Боевая медицина.",
    classId: "fighter",
    className: "Воин",
    classInfo: "Свободные архетипы: медик и плут.",
    subclassName: "",
    hitDie: 10,
    classHp: 10,
    saves: { fort: "expert", ref: "expert", will: "trained" },
    skillRanks: {},
    extraSkills: [],
    feats: [],
    features: [],
    items: artefolItems(),
    coins: emptyCoins(),
    spellcasting: null,
    spells: [],
    preparedIds: [],
    bonusSpellIds: [],
    slots: [],
    focus: null,
    hitDice: { sides: 10, max: 20, current: 20 },
    conditions: [],
    conditionValues: {},
    languages: "Всеобщий",
    notes: "Контрольный персонаж. Числа считает лист из выборов, не из этого текста.",
    shieldRaised: false,
    weaponRules: { simple: true, martial: true, martialFinesseOrLight: true, martialLight: true, unarmed: true },
    armorTraining: ["light", "medium", "heavy", "unarmored"],
    fightingStyle: "",
    unarmored: "none",
    keyAbility: "str",
    armorRanks: {},
    weaponRanks: {},
    perceptionRank: "expert",
    classDcRank: "trained",
    spellRank: "untrained",
    thiefDamage: false,
    resources: [],
    pendingAsi: false,
    createdAt: 1,
    updatedAt: 1,
    formatVersion: 2,
    progress,
  };
  const sheet = derive(artefolInput());
  const next = snapshot({ ...base, hpCurrent: sheet.hp.value });
  next.hpCurrent = sheet.hp.value;
  next.tough = true;
  return next;
}

function gear(id: string, equipped: boolean): ItemInst {
  const item = catalog("pf2e").find((entry) => entry.id === id);
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
    weapon: item.weapon
      ? { ...item.weapon, group: id === "longsword" ? "sword" : id === "shortbow" ? "bow" : item.weapon.group, hands: item.weapon.twoHanded ? 2 : 1 }
      : undefined,
  };
}
