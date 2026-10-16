export type SystemId = "dnd5e" | "pf2e";

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ABILITIES: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_NAME: Record<Ability, string> = {
  str: "Сила",
  dex: "Ловкость",
  con: "Телосложение",
  int: "Интеллект",
  wis: "Мудрость",
  cha: "Харизма",
};

export const ABILITY_SHORT: Record<Ability, string> = {
  str: "Сил",
  dex: "Лов",
  con: "Тел",
  int: "Инт",
  wis: "Мдр",
  cha: "Хар",
};

export const ABILITY_INFO: Record<Ability, string> = {
  str: "Сила — физическая мощь. В D&D 5e от неё зависят атаки ближнего боя без фехтовального свойства, урон таким оружием и грузоподъёмность (счёт × 15 фунтов). Проверка Силы — выломать дверь, удержать обрыв, толкнуть. Спасбросок Силы в правилах 2024 года встречается реже, чем проверка. Модификатор = (значение − 10) ÷ 2, округление вниз. Значение 10 даёт +0, 12 даёт +1, 8 даёт −1.",
  dex: "Ловкость — ловкость рук, равновесие и реакция. От неё зависят инициатива, класс брони (пока доспех не ограничивает бонус), атаки дальнобойным и фехтовальным оружием, навыки вроде Скрытности и Акробатики. Спасбросок Ловкости — увернуться от дыхания дракона или огненного шара.",
  con: "Телосложение — здоровье и выносливость. Модификатор прибавляется к хитам на каждом уровне. Спасбросок Телосложения — устоять перед ядом, болезнью, холодом и удержанием концентрации на заклинании в D&D 5e. В Pathfinder 2e тот же модификатор входит в хиты и в стойкость.",
  int: "Интеллект — память, логика и учёность. В D&D 5e на него опираются Магия, История и Расследование, а волшебник колдует через Интеллект. В Pathfinder 2e положительный модификатор даёт дополнительные обученные навыки и языки, а волшебник и ведьма используют его как ключевую характеристику.",
  wis: "Мудрость — чутьё и внимательность. От неё зависят Внимательность, Проницательность, выживание в дикой местности, пассивное восприятие. Жрец, друид и следопыт в D&D 5e колдуют через Мудрость. В Pathfinder 2e Мудрость входит в Восприятие и волю.",
  cha: "Харизма — сила личности, обаяние и воля. Обман, Запугивание и Убеждение завязаны на неё. Бард, чародей, колдун и паладин в D&D 5e колдуют через Харизму. В Pathfinder 2e бард опирается на Харизму, а божественный шрифт жреца зависит от её модификатора.",
};

export interface Coins {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface ArmorStat {
  ac?: number;
  bonus?: number;
  dexCap: number | null;
  category: "unarmored" | "light" | "medium" | "heavy";
  stealth?: boolean;
  strReq?: number;
}

export interface WeaponStat {
  damage: string;
  attr: "str" | "dex" | "finesse";
  category: "simple" | "martial" | "unarmed" | "advanced";
  light?: boolean;
  finesse?: boolean;
  ranged?: boolean;
  thrown?: boolean;
  twoHanded?: boolean;
  mastery?: string;
}

export interface ItemInst {
  uid: string;
  catalogId?: string;
  name: string;
  qty: number;
  weight: number;
  equipped: boolean;
  kind: "armor" | "shield" | "weapon" | "gear";
  notes?: string;
  armor?: ArmorStat;
  weapon?: WeaponStat;
}

export interface SpellInst {
  id: string;
  name: string;
  level: number;
  info: string;
  school: string;
  time: string;
  range: string;
  duration: string;
}

export interface SlotInst {
  rank: number;
  max: number;
  used: number;
  note?: string;
}

export interface ResourceInst {
  id: string;
  name: string;
  current: number;
  max: number;
  info: string;
}

export interface FeatInst {
  id: string;
  name: string;
  info: string;
}

export interface FeatureInst {
  name: string;
  info: string;
}

export interface ExtraSkill {
  id: string;
  name: string;
  ability: Ability;
  info: string;
}

export interface WeaponRules {
  simple: boolean;
  martial: boolean;
  martialFinesseOrLight: boolean;
  martialLight: boolean;
  unarmed: boolean;
}

export interface Spellcasting {
  kind: "prepared" | "known" | "book" | "pact";
  ability: Ability;
  listName: string;
  cantripLimit: number;
  prepareLimit: number;
  knownLimit: number;
}

export interface Character {
  id: string;
  system: SystemId;
  name: string;
  photo?: string;
  level: number;
  xp: number;
  hpCurrent: number;
  hpTemp: number;
  hpBonus: number;
  hpRolls: number[];
  hero: number;
  abilities: Record<Ability, number>;
  ancestryId: string;
  ancestryName: string;
  ancestryInfo: string;
  size: string;
  speed: number;
  senses: string;
  ancestryHp: number;
  tough: boolean;
  backgroundId: string;
  backgroundName: string;
  backgroundInfo: string;
  classId: string;
  className: string;
  classInfo: string;
  subclassName: string;
  hitDie: number;
  classHp: number;
  saves: Record<string, string>;
  skillRanks: Record<string, string>;
  extraSkills: ExtraSkill[];
  feats: FeatInst[];
  features: FeatureInst[];
  items: ItemInst[];
  coins: Coins;
  spellcasting: Spellcasting | null;
  spells: SpellInst[];
  preparedIds: string[];
  bonusSpellIds: string[];
  slots: SlotInst[];
  focus: { max: number; current: number } | null;
  hitDice: { sides: number; max: number; current: number };
  conditions: string[];
  conditionValues: Record<string, number>;
  languages: string;
  notes: string;
  shieldRaised: boolean;
  weaponRules: WeaponRules;
  armorTraining: string[];
  fightingStyle: string;
  unarmored: "none" | "barbarian" | "monk";
  keyAbility: Ability;
  armorRanks: Record<string, string>;
  weaponRanks: Record<string, string>;
  perceptionRank: string;
  classDcRank: string;
  spellRank: string;
  thiefDamage: boolean;
  resources: ResourceInst[];
  pendingAsi: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  kind: ItemInst["kind"];
  weight: number;
  costCp: number;
  info: string;
  armor?: ArmorStat;
  weapon?: WeaponStat;
  notes?: string;
}

export interface Opt {
  id: string;
  name: string;
  hint?: string;
  info: string;
}

export interface Draft {
  system: SystemId | null;
  name: string;
  ancestryId: string;
  heritageId: string;
  backgroundId: string;
  classId: string;
  choices: Record<string, string>;
  multi: Record<string, string[]>;
  scores: Record<Ability, number>;
  pool: number[];
  gearMode: string;
  bought: { id: string; qty: number }[];
  knownSpells: string[];
  preparedSpells: string[];
  customFeats: { name: string; info: string }[];
  customItems: { name: string; weight: string; qty: string; kind: ItemInst["kind"] }[];
  customSpells: { name: string; level: string; info: string }[];
  customAncestry: { name: string; info: string; speed: string; size: string; hp: string };
  customBackground: { name: string; info: string; skill: string };
  customClass: { name: string; info: string; hit: string; key: Ability; caster: string; hp: string };
  photo?: string;
}

export const SAVE_KEY = "rpg-hero-v1";
export const DRAFT_KEY = "rpg-hero-draft-v1";

export function emptyScores(n = 8): Record<Ability, number> {
  return { str: n, dex: n, con: n, int: n, wis: n, cha: n };
}

export function blankDraft(): Draft {
  return {
    system: null,
    name: "",
    ancestryId: "",
    heritageId: "",
    backgroundId: "",
    classId: "",
    choices: {},
    multi: {},
    scores: emptyScores(8),
    pool: [],
    gearMode: "",
    bought: [],
    knownSpells: [],
    preparedSpells: [],
    customFeats: [],
    customItems: [],
    customSpells: [],
    customAncestry: { name: "", info: "", speed: "30", size: "Средний", hp: "8" },
    customBackground: { name: "", info: "", skill: "" },
    customClass: { name: "", info: "", hit: "8", key: "str", caster: "none", hp: "8" },
  };
}

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function mod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function emptyCoins(): Coins {
  return { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
}
