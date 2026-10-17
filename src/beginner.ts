import { skillFeatBlock } from "./pf2e/eligibility";
import { levelOneClassFeats } from "./data/pf-index";
import {
  classKey,
  fixedSkills,
  scoresOf,
  skillNeed,
  spellBudget,
  type StepId,
} from "./create";
import {
  ANCESTRIES,
  CLASSES as CL2,
  SKILL_FEATS,
  SKILLS as SK2,
  SPELLS as SP2,
  backgroundById,
} from "./data/pf2e";
import { CLASSES as CL5, SKILLS as SK5, SPELLS as SP5 } from "./data/dnd5e";
import {
  type Ability,
  type Draft,
  blankDraft,
} from "./types";

export const TOUR_KEY = "rpg-hero-tour";
export const HINTS_KEY = "rpg-hero-hints";
export const TURN_SEEN_KEY = "rpg-hero-turn-seen";

export interface Gloss {
  id: string;
  title: string;
  text: string;
}

/** Короткие слова для «?». Абзацы книг сюда не копируются. */
export const TERMS: Gloss[] = [
  { id: "ac", title: "КБ", text: "Класс брони — насколько вас трудно попасть. Это не бросок. Чужой удар сравнивают с вашим КБ: если выпало меньше, удар мимо. Пример: КБ 16, на кости 12 — промах." },
  { id: "dc", title: "СЛ", text: "Сложность — число, которое нужно набрать или превзойти, чтобы дело удалось. Пример: вскрыть замок СЛ 15 значит итог проверки 15 или выше." },
  { id: "save", title: "Спасбросок", text: "Бросок, когда опасность сама на вас действует: огонь, яд, страх. В Pathfinder это стойкость, рефлексы и воля. В D&D — спасбросок характеристики. Пример: волна огня просит рефлексы." },
  { id: "rank", title: "Метки О, Э, М, Л", text: "Ступени умения в Pathfinder: обученный, эксперт, мастер, легенда. Чем выше ступень, тем больше бонус. Пустые точки значат, что ступени ещё нет. Пример: эксперт оружия бьёт заметно точнее обученного." },
  { id: "actions", title: "Действия ◆, ↺ и ◇", text: "В Pathfinder в свой ход обычно три действия ◆◆◆. Удар — одно, шаг — одно, многие заклинания — два. ↺ реакция случается не в ваш ход, когда что-то произошло. ◇ свободное действие почти ничего не стоит. Пример: шаг, удар, поднять щит — ход кончился." },
  { id: "level", title: "Уровень и круг", text: "Уровень — насколько герой опытен, от 1 до 20. Круг — сила заклинания. Они не одно и то же. Пример: герой 1 уровня творит заклинание 1 круга." },
  { id: "trait", title: "Метка", text: "Короткая плашка на карточке: она говорит, к чему правило относится. Сама плашка число на листе не меняет, если в тексте нет отдельного бонуса. Пример: метка «Жизненная сила» значит, что эффект лечит живых и обычно ранит нежить." },
  { id: "vitality", title: "Жизненная сила", text: "Метка лечения жизнью. Живому существу она возвращает хиты. Нежить от той же силы обычно получает урон. Пример: «Лечение» с этой меткой поднимает союзника и бьёт скелета." },
  { id: "boost", title: "Повышение характеристики", text: "В Pathfinder повышение прибавляет +2 к Силе, Ловкости, Телосложению, Интеллекту, Мудрости или Харизме. Если число уже 18 или выше, это повышение даёт только +1. Пример: Сила 10 и одно повышение становятся 12." },
  { id: "archetype", title: "Свободный архетип", text: "Правило стола, не обязательное. На чётных уровнях дают ещё одну черту чужого пути, например лекаря или мага. Сначала его выключают. Пример: воин на 2 уровне может взять посвящение лекаря, если стол так договорился." },
  { id: "ancestry", title: "Народ", text: "Кем герой родился: человек, дварф, эльф. От народа хиты, скорость, размер и одна черта. Это не профессия. Пример: дварф крепче и медленнее человека." },
  { id: "heritage", title: "Наследие", text: "Уточнение народа: откуда именно эта семья или эта кровь. Наследие не заменяет народ. Пример: у дварфа наследие «Скальный» помогает устоять, когда толкают." },
  { id: "background", title: "Происхождение", text: "Чем герой жил до приключения: стражник, послушник, артист. Оно даёт навык и повышения характеристик. Пример: послушник уже умеет религию." },
  { id: "class", title: "Класс", text: "Чем герой занят в опасную минуту: бьёт, лечит, колдует, крадётся. Класс задаёт хиты, оружие и главные правила. Пример: воин много держит удар и мало читает заклинаний." },
  { id: "feat", title: "Черта", text: "Отдельное умение на выбор. Черта народа, класса, навыка или общая — разные слоты, их не подменяют друг другом. Пример: «Внезапный рывок» даёт воину шаг и удар одним приёмом." },
  { id: "skill", title: "Навык", text: "Дело, которому герой обучен: спрятаться, уговорить, выследить. Необученный тоже может попробовать, но бонус меньше. Пример: обученная Скрытность помогает пройти мимо часового." },
  { id: "ability", title: "Характеристика", text: "Шесть чисел тела и ума: Сила, Ловкость, Телосложение, Интеллект, Мудрость, Харизма. От них удары, хиты, заклинания и навыки. Пример: высокая Ловкость помогает стрелять и уворачиваться." },
  { id: "spell", title: "Заклинание", text: "Магический приём. Заговор можно повторять. Заклинание круга тратит ячейку, пока не отдохнёте или не подготовитесь снова. Пример: «Лечение» тратит ячейку и возвращает хиты." },
  { id: "turn", title: "Ход", text: "Ваша очередь в бою. В Pathfinder тратьте три действия. В D&D есть действие, бонусное действие и перемещение. Пример: подбежать и ударить — обычный первый ход воина." },
  { id: "tough", title: "Живучесть", text: "Черта, от которой герой держит больше хитов. Берите, если персонаж часто падает первым. Пример: воин с живучестью переживает лишний удар." },
];

const TERM_BY_ID = new Map(TERMS.map((term) => [term.id, term]));

export function termById(id: string): Gloss | undefined {
  return TERM_BY_ID.get(id);
}

export function traitPlain(id: string, fallback: string): string {
  if (id === "vitality") return TERMS.find((term) => term.id === "vitality")?.text ?? fallback;
  if (id === "healing") return "Метка лечения. Она возвращает хиты живому. Мёртвого одной этой меткой не поднять.";
  if (id === "attack") return "Метка атаки. Это удар, его сравнивают с защитой цели.";
  if (id === "move") return "Метка движения. Пока вы так двигаетесь, чужая реакция вроде удара возможности может сработать.";
  if (id === "concentrate") return "Метка концентрации. Пока держите эффект, часть других заклинаний с той же меткой нельзя начать.";
  if (id === "manipulate") return "Метка рук. Существо, которое мешает жестам, может сорвать такое действие.";
  if (id === "death") return "Метка смерти. Эффект связан с гибелью. На живого он обычно страшнее, чем на нежить.";
  if (id === "fear") return "Метка страха. Провал часто даёт испуг: существо хуже дерётся, пока не успокоится.";
  if (id === "healing") return "Метка лечения. Живому возвращают хиты.";
  return fallback;
}

export const STEP_EXPLAIN: Record<StepId, { what: string; example: string }> = {
  system: {
    what: "Сначала игра. D&D и Pathfinder считаются по-разному, и старую редакцию с новой не смешивают.",
    example: "новичку проще начать с Pathfinder, воин, или с D&D, воин.",
  },
  name: {
    what: "Имя — только подпись на листе. На числа оно не влияет, и его можно сменить потом.",
    example: "Марта Щит, Тень, Искра.",
  },
  ancestry: {
    what: "Народ — кем герой родился. Он задаёт здоровье, скорость и одну врождённую черту.",
    example: "человек удобен новичкам: мало обязательных штрафов.",
  },
  background: {
    what: "Происхождение — жизнь до приключения. Оно даёт навык и чуть поднимает характеристики.",
    example: "стражник или боец уже умеет давить угрозой.",
  },
  class: {
    what: "Класс — роль в опасную минуту. От него оружие, хиты и то, колдуете ли вы.",
    example: "воин простой и прочный, мало отдельных правил.",
  },
  abilities: {
    what: "Характеристики — шесть чисел. Высокое число даёт прибавку к ударам, хитам или заклинаниям. Повышение — это +2 к одному числу.",
    example: "воину советуют Силу и Телосложение, магу — Интеллект.",
  },
  skills: {
    what: "Навык — одно дело, которое у вас получается лучше. Берите то, чего ещё нет от народа, прошлого и класса.",
    example: "воину часто хватает Атлетики, лекарю — Медицины.",
  },
  feats: {
    what: "Черта — отдельное умение. Серая или запрещённая черта просто ещё не подходит по условиям.",
    example: "воину на старте удобен внезапный рывок: подбежать и ударить.",
  },
  gear: {
    what: "Снаряжение — доспех, оружие и мелочь. Готовый набор уже законный, лавка нужна только если хотите другое.",
    example: "набор воина: кольчуга, щит и меч.",
  },
  spells: {
    what: "Заклинание — магический приём. Заговор повторяется. Заклинание круга тратит ячейку до отдыха.",
    example: "лекарю нужно «Лечение», магу — щит и стрела, которая не промахивается.",
  },
  review: {
    what: "Последний взгляд: имя, числа и что герой умеет. Потом лист можно править.",
    example: "если шаг подсветил ошибку, вернитесь только на него.",
  },
};

export const STEP_TERMS: Record<StepId, string[]> = {
  system: ["ac", "dc", "save"],
  name: [],
  ancestry: ["ancestry", "heritage"],
  background: ["background", "boost"],
  class: ["class", "archetype"],
  abilities: ["ability", "boost"],
  skills: ["skill", "rank"],
  feats: ["feat"],
  gear: [],
  spells: ["spell", "level"],
  review: ["level"],
};

export type Difficulty = "простой" | "средний" | "сложный";
export type RoleName = "боец" | "целитель" | "маг" | "разведчик" | "поддержка";

export interface ClassFace {
  difficulty: Difficulty;
  role: RoleName;
  reason: string;
  recommend?: boolean;
}

const PF_FACE: Record<string, ClassFace> = {
  fighter: { difficulty: "простой", role: "боец", reason: "крепкий, мало правил", recommend: true },
  champion: { difficulty: "простой", role: "боец", reason: "щит, доспех и защита союзника", recommend: true },
  rogue: { difficulty: "средний", role: "разведчик", reason: "ловкий удар и много навыков", recommend: true },
  cleric: { difficulty: "средний", role: "целитель", reason: "лечит и держит союзников", recommend: true },
  wizard: { difficulty: "сложный", role: "маг", reason: "книга заклинаний, хрупкий, но сильный", recommend: true },
  bard: { difficulty: "средний", role: "поддержка", reason: "песня помогает всему отряду" },
  barbarian: { difficulty: "простой", role: "боец", reason: "много хитов и ярость" },
  ranger: { difficulty: "средний", role: "разведчик", reason: "охота на одну цель" },
  monk: { difficulty: "средний", role: "боец", reason: "бой без доспеха, много действий" },
  druid: { difficulty: "средний", role: "целитель", reason: "природа, лечение и зверь" },
  sorcerer: { difficulty: "средний", role: "маг", reason: "магия без книги, но мало заклинаний" },
  witch: { difficulty: "сложный", role: "маг", reason: "покровитель и фамильяр" },
  oracle: { difficulty: "сложный", role: "маг", reason: "сила с проклятием" },
  alchemist: { difficulty: "сложный", role: "поддержка", reason: "предметы вместо заклинаний" },
  investigator: { difficulty: "средний", role: "разведчик", reason: "заранее знает, удастся ли удар" },
  swashbuckler: { difficulty: "средний", role: "боец", reason: "стиль и точный выпад" },
};

const DND_FACE: Record<string, ClassFace> = {
  fighter: { difficulty: "простой", role: "боец", reason: "крепкий, мало правил", recommend: true },
  cleric: { difficulty: "средний", role: "целитель", reason: "лечит и носит доспех", recommend: true },
  rogue: { difficulty: "средний", role: "разведчик", reason: "точный удар из тени", recommend: true },
  wizard: { difficulty: "сложный", role: "маг", reason: "книга и сильные заклинания", recommend: true },
  bard: { difficulty: "средний", role: "поддержка", reason: "вдохновение и немного всего", recommend: true },
  barbarian: { difficulty: "простой", role: "боец", reason: "ярость и много хитов" },
  paladin: { difficulty: "средний", role: "боец", reason: "доспех и лечение касанием" },
  ranger: { difficulty: "средний", role: "разведчик", reason: "лук и метка добычи" },
  druid: { difficulty: "средний", role: "маг", reason: "природа и смена облика позже" },
  monk: { difficulty: "средний", role: "боец", reason: "бой без доспеха" },
  sorcerer: { difficulty: "средний", role: "маг", reason: "врождённая магия, мало известных заклинаний" },
  warlock: { difficulty: "сложный", role: "маг", reason: "мало ячеек, но они быстро возвращаются" },
};

export function classFace(system: "pf2e" | "dnd5e" | null, id: string): ClassFace {
  const table = system === "dnd5e" ? DND_FACE : PF_FACE;
  return table[id] ?? { difficulty: "средний", role: "боец", reason: "больше частных правил, чем у воина" };
}

export function recommendedClasses(system: "pf2e" | "dnd5e"): string[] {
  const table = system === "dnd5e" ? DND_FACE : PF_FACE;
  return Object.entries(table).filter(([, face]) => face.recommend).map(([id]) => id);
}

export interface Advice {
  id: string;
  reason: string;
}

export function ancestryAdvice(system: "pf2e" | "dnd5e"): Advice[] {
  if (system === "dnd5e") {
    return [
      { id: "human", reason: "навык и черта на выбор, без странных штрафов" },
      { id: "dwarf", reason: "больше хитов и трудно отравить" },
      { id: "elf", reason: "зоркий и не спит как человек" },
      { id: "orc", reason: "рывок и шанс устоять на 1 хите" },
    ];
  }
  return [
    { id: "human", reason: "два свободных повышения, удобно новичку" },
    { id: "dwarf", reason: "крепкий и не любит, когда его толкают" },
    { id: "elf", reason: "быстрый и зоркий в сумраке" },
    { id: "orc", reason: "много хитов и тёмное зрение" },
    { id: "halfling", reason: "везучий, если бросок уже провален" },
  ];
}

export function backgroundAdvice(system: "pf2e" | "dnd5e"): Advice[] {
  if (system === "dnd5e") {
    return [
      { id: "soldier", reason: "строй и оружие, понятное прошлое" },
      { id: "acolyte", reason: "храм, лечение и чужая вера" },
      { id: "criminal", reason: "замки, тень и тихие руки" },
      { id: "sage", reason: "книги и магическая учёность" },
    ];
  }
  return [
    { id: "warrior", reason: "уже умеет пугать и держать строй" },
    { id: "guard", reason: "караул и короткий нажим" },
    { id: "acolyte", reason: "храм и знание обрядов" },
    { id: "scholar", reason: "учёба, удобно магу" },
    { id: "hunter", reason: "след и лес" },
  ];
}

export function featAdvice(): Advice[] {
  return [
    { id: "sudden-charge", reason: "подбежать и ударить" },
    { id: "reactive-shield", reason: "щит успевает подняться" },
    { id: "exacting", reason: "промах не портит следующий удар" },
    { id: "shield-block", reason: "щит срезает часть урона" },
    { id: "fleet", reason: "просто быстрее ходите" },
    { id: "toughness", reason: "больше хитов, герой дольше держится" },
    { id: "battle-medicine", reason: "лечить в бою без магии" },
    { id: "natural-ambition", reason: "ещё одна черта класса в начале" },
    { id: "defense", reason: "доспех даёт +1 к защите" },
    { id: "alert", reason: "реже оказываетесь последним в бою" },
  ];
}

export function spellAdvice(system: "pf2e" | "dnd5e"): Advice[] {
  if (system === "dnd5e") {
    return [
      { id: "cure-wounds", reason: "крепко лечит касанием" },
      { id: "healing-word", reason: "лечит бонусным действием, издалека" },
      { id: "bless", reason: "весь отряд бьёт чуть точнее" },
      { id: "shield", reason: "реакция, когда по вам уже попали" },
      { id: "magic-missile", reason: "попадает само, без броска атаки" },
      { id: "sacred-flame", reason: "укрытие врагу не помогает" },
    ];
  }
  return [
    { id: "heal", reason: "главное лечение и урон нежити" },
    { id: "shield", reason: "на действие поднимает защиту" },
    { id: "electric-arc", reason: "бьёт сразу двух врагов" },
    { id: "magic-missile", reason: "сила, которая не промахивается" },
    { id: "courageous-anthem", reason: "песня даёт союзникам +1" },
    { id: "guidance", reason: "одно действие и +1 союзнику" },
  ];
}

export function adviceReason(list: Advice[], id: string): string | undefined {
  return list.find((item) => item.id === id)?.reason;
}

export function recommendedBoosts(draft: Draft): Ability[] {
  const key = classKey(draft);
  const extra: Ability = key === "con" ? "str" : "con";
  return [key, extra].filter((ability): ability is Ability => Boolean(ability));
}

export type BeginnerRole = RoleName;

export interface Premade {
  id: string;
  system: "pf2e" | "dnd5e";
  role: BeginnerRole;
  name: string;
  blurb: string;
  notes: string[];
  draft: Draft;
}

const PF_CANTRIP = ["shield", "electric-arc", "light", "telekinetic-projectile", "detect-magic"];
const PF_BOOK = ["fear", "magic-missile", "mystic-armor", "sure-strike", "sleep", "grease", "breathe-fire", "hydraulic-push", "runic-weapon", "alarm"];
const DIVINE_CANTRIP = ["guidance", "light", "stabilize", "shield", "forbidding-ward"];
const BARD_CANTRIP = ["courageous-anthem", "guidance", "light", "telekinetic-projectile", "shield"];

function base(system: "pf2e" | "dnd5e", name: string): Draft {
  const draft = blankDraft();
  draft.system = system;
  draft.edition = system === "pf2e" ? "pf-remaster" : "dnd-2024";
  draft.name = name;
  return draft;
}

function pfFighter(name: string): Draft {
  const draft = base("pf2e", name);
  draft.ancestryId = "human";
  draft.heritageId = "skilled";
  draft.choices = {
    ancestryMode: "free",
    humanSkill: "society",
    ancestryFeat: "natural-ambition",
    skillFeat: "glare",
    classFeat: "sudden-charge",
    key: "str",
    fighterSkill: "athletics",
    abilityMethod: "boost",
    bgFixed: "str",
    bgFree: "con",
  };
  draft.multi = {
    ancestryBoosts: ["str", "con"],
    freeBoosts: ["str", "dex", "con", "wis"],
    skills: ["acrobatics", "medicine", "diplomacy"],
  };
  draft.backgroundId = "warrior";
  draft.classId = "fighter";
  draft.gearMode = "kit";
  return draft;
}

function pfRogue(name: string): Draft {
  const draft = base("pf2e", name);
  draft.ancestryId = "human";
  draft.heritageId = "skilled";
  draft.choices = {
    ancestryMode: "free",
    humanSkill: "society",
    ancestryFeat: "general-training",
    generalFeat: "fleet",
    skillFeat: "cat-fall",
    racket: "thief",
    abilityMethod: "boost",
    bgFixed: "dex",
    bgFree: "con",
  };
  draft.multi = {
    ancestryBoosts: ["dex", "cha"],
    freeBoosts: ["dex", "con", "wis", "cha"],
    skills: ["athletics", "deception", "diplomacy", "intimidation", "medicine", "performance", "survival"],
  };
  draft.backgroundId = "acrobat";
  draft.classId = "rogue";
  draft.gearMode = "kit";
  return draft;
}

function pfCleric(name: string): Draft {
  const draft = base("pf2e", name);
  draft.ancestryId = "dwarf";
  draft.heritageId = "rock";
  draft.choices = {
    ancestryMode: "listed",
    ancFree: "dex",
    ancestryFeat: "dwarf-lore",
    skillFeat: "student-canon",
    doctrine: "war",
    font: "heal",
    deity: "light",
    abilityMethod: "boost",
    bgFixed: "wis",
    bgFree: "con",
  };
  draft.multi = {
    freeBoosts: ["wis", "con", "str", "dex"],
    skills: ["diplomacy", "nature"],
  };
  draft.backgroundId = "acolyte";
  draft.classId = "cleric";
  draft.gearMode = "kit";
  draft.knownSpells = [...DIVINE_CANTRIP];
  draft.preparedSpells = ["heal", "command"];
  return draft;
}

function pfWizard(name: string): Draft {
  const draft = base("pf2e", name);
  draft.ancestryId = "elf";
  draft.heritageId = "seer";
  draft.choices = {
    ancestryMode: "listed",
    ancFree: "wis",
    ancestryFeat: "nimble",
    skillFeat: "assurance",
    school: "unified",
    thesis: "staff",
    abilityMethod: "boost",
    bgFixed: "int",
    bgFree: "con",
    bgSkill: "nature",
  };
  draft.multi = {
    freeBoosts: ["int", "dex", "wis", "con"],
    skills: ["occultism", "crafting", "medicine", "society", "diplomacy", "stealth"],
  };
  draft.backgroundId = "scholar";
  draft.classId = "wizard";
  draft.gearMode = "kit";
  draft.knownSpells = [...PF_CANTRIP, ...PF_BOOK];
  draft.preparedSpells = ["magic-missile", "mystic-armor"];
  return draft;
}

function pfBard(name: string): Draft {
  const draft = base("pf2e", name);
  draft.ancestryId = "human";
  draft.heritageId = "skilled";
  draft.choices = {
    ancestryMode: "free",
    humanSkill: "society",
    ancestryFeat: "general-training",
    generalFeat: "fleet",
    skillFeat: "fascinating",
    muse: "maestro",
    abilityMethod: "boost",
    bgFixed: "cha",
    bgFree: "con",
  };
  draft.multi = {
    ancestryBoosts: ["cha", "dex"],
    freeBoosts: ["cha", "con", "dex", "wis"],
    skills: ["diplomacy", "deception", "stealth", "medicine"],
  };
  draft.backgroundId = "entertainer";
  draft.classId = "bard";
  draft.gearMode = "kit";
  draft.knownSpells = [...BARD_CANTRIP, "magic-missile", "fear"];
  return draft;
}

function pfRanger(name: string): Draft {
  const draft = base("pf2e", name);
  draft.ancestryId = "elf";
  draft.heritageId = "woodland";
  draft.choices = {
    ancestryMode: "listed",
    ancFree: "wis",
    ancestryFeat: "nimble",
    skillFeat: "survey",
    key: "dex",
    edge: "precision",
    classFeat: "hunted-shot",
    abilityMethod: "boost",
    bgFixed: "dex",
    bgFree: "con",
  };
  draft.multi = {
    freeBoosts: ["dex", "con", "wis", "str"],
    skills: ["stealth", "acrobatics", "athletics", "medicine", "diplomacy"],
  };
  draft.backgroundId = "hunter";
  draft.classId = "ranger";
  draft.gearMode = "kit";
  return draft;
}

function dndHuman(draft: Draft, skill: string) {
  draft.ancestryId = "human";
  draft.choices.size = "Средний";
  draft.choices.humanSkill = skill;
  draft.choices.humanFeat = "alert";
}

function dndFighter(name: string): Draft {
  const draft = base("dnd5e", name);
  dndHuman(draft, "perception");
  draft.choices.humanFeat = "skilled";
  draft.multi.hskilled = ["acrobatics", "history", "nature"];
  draft.backgroundId = "soldier";
  draft.classId = "fighter";
  draft.choices.abilityMethod = "standard";
  draft.choices.boostMode = "split";
  draft.choices.boost2 = "str";
  draft.choices.boost1 = "con";
  draft.choices.style = "defense";
  draft.scores = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
  draft.multi.mastery = ["longsword", "longbow", "greatsword"];
  draft.multi.skills = ["insight", "survival"];
  draft.gearMode = "a";
  return draft;
}

function dndRogue(name: string): Draft {
  const draft = base("dnd5e", name);
  dndHuman(draft, "perception");
  draft.choices.humanFeat = "skilled";
  draft.multi.hskilled = ["athletics", "history", "investigation"];
  draft.backgroundId = "criminal";
  draft.classId = "rogue";
  draft.choices.abilityMethod = "standard";
  draft.choices.boostMode = "split";
  draft.choices.boost2 = "dex";
  draft.choices.boost1 = "con";
  draft.scores = { str: 8, dex: 15, con: 14, int: 13, wis: 12, cha: 10 };
  draft.multi.skills = ["acrobatics", "deception", "insight", "persuasion"];
  draft.multi.expertise = ["stealth", "acrobatics"];
  draft.multi.mastery = ["dagger", "shortsword"];
  draft.gearMode = "a";
  return draft;
}

function dndCleric(name: string): Draft {
  const draft = base("dnd5e", name);
  dndHuman(draft, "medicine");
  draft.backgroundId = "acolyte";
  draft.classId = "cleric";
  draft.choices.order = "protector";
  draft.choices.abilityMethod = "standard";
  draft.choices.boostMode = "split";
  draft.choices.boost2 = "wis";
  draft.choices.boost1 = "cha";
  draft.choices.bgSpell = "cure-wounds";
  draft.choices.bgc1 = "guidance";
  draft.choices.bgc2 = "light";
  draft.choices.bgAbility = "wis";
  draft.scores = { str: 13, dex: 10, con: 14, int: 8, wis: 15, cha: 12 };
  draft.multi.skills = ["persuasion", "history"];
  draft.gearMode = "a";
  draft.knownSpells = ["sacred-flame", "guidance", "light", "bless", "cure-wounds", "healing-word", "guiding-bolt"];
  draft.preparedSpells = ["bless", "cure-wounds", "healing-word", "guiding-bolt"];
  return draft;
}

function dndWizard(name: string): Draft {
  const draft = base("dnd5e", name);
  dndHuman(draft, "investigation");
  draft.backgroundId = "sage";
  draft.classId = "wizard";
  draft.choices.abilityMethod = "standard";
  draft.choices.boostMode = "split";
  draft.choices.boost2 = "int";
  draft.choices.boost1 = "con";
  draft.choices.bgSpell = "magic-missile";
  draft.choices.bgc1 = "fire-bolt";
  draft.choices.bgc2 = "mage-hand";
  draft.choices.bgAbility = "int";
  draft.scores = { str: 8, dex: 12, con: 14, int: 15, wis: 13, cha: 10 };
  draft.multi.skills = ["insight", "medicine"];
  draft.gearMode = "a";
  draft.knownSpells = ["fire-bolt", "mage-hand", "light", "magic-missile", "shield", "mage-armor", "sleep", "detect-magic", "burning-hands"];
  draft.preparedSpells = ["magic-missile", "shield", "mage-armor", "sleep"];
  return draft;
}

function dndBard(name: string): Draft {
  const draft = base("dnd5e", name);
  dndHuman(draft, "perception");
  draft.backgroundId = "acolyte";
  draft.classId = "bard";
  draft.choices.abilityMethod = "standard";
  draft.choices.boostMode = "split";
  draft.choices.boost2 = "cha";
  draft.choices.boost1 = "wis";
  draft.choices.bgSpell = "cure-wounds";
  draft.choices.bgc1 = "guidance";
  draft.choices.bgc2 = "sacred-flame";
  draft.choices.bgAbility = "cha";
  draft.scores = { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 };
  draft.multi.skills = ["performance", "persuasion", "deception"];
  draft.gearMode = "a";
  draft.knownSpells = ["vicious-mockery", "light", "healing-word", "thunderwave", "disguise-self", "sleep"];
  draft.preparedSpells = ["healing-word", "thunderwave", "disguise-self", "sleep"];
  return draft;
}

function pack(id: string, system: "pf2e" | "dnd5e", role: BeginnerRole, name: string, blurb: string, notes: string[], draft: Draft): Premade {
  return { id, system, role, name, blurb, notes, draft };
}

export function premades(system: "pf2e" | "dnd5e"): Premade[] {
  if (system === "pf2e") {
    return [
      pack("pf-fighter", "pf2e", "боец", "Марта Щит", "Воин в кольчуге. Бьёт мечом и закрывается щитом.", [
        "Народ человек: свободные повышения в Силу и Телосложение.",
        "Происхождение «Боец» даёт Запугивание.",
        "Ключ — Сила. Черта «Внезапный рывок»: подбежать и ударить.",
        "Набор класса: кольчуга, щит и меч.",
      ], pfFighter("Марта Щит")),
      pack("pf-rogue", "pf2e", "разведчик", "Тень", "Плут. Прячется и бьёт, когда цель не ждёт.", [
        "Уловка «Вор»: урон от Ловкости.",
        "Происхождение акробата и мягкое падение.",
        "Навыков много: это и есть сила плута.",
      ], pfRogue("Тень")),
      pack("pf-cleric", "pf2e", "целитель", "Свет", "Жрец. Лечит и стоит в доспехе.", [
        "Доктрина военного жреца: доспех уже на 1 уровне.",
        "Шрифт лечения и заклинание «Лечение».",
        "Покровитель света даёт Медицину.",
      ], pfCleric("Свет")),
      pack("pf-wizard", "pf2e", "маг", "Искра", "Волшебник с книгой. Хрупкий, бьёт издалека.", [
        "Школа без узкой программы, диссертация посоха.",
        "В книге десять заклинаний, на день готовятся два.",
        "Силовой залп попадает без броска атаки.",
      ], pfWizard("Искра")),
      pack("pf-bard", "pf2e", "поддержка", "Лира", "Бард. Песня даёт союзникам +1.", [
        "Муза маэстро и боевой гимн.",
        "Происхождение артиста.",
        "Харизма — ключ песни и заклинаний.",
      ], pfBard("Лира")),
      pack("pf-ranger", "pf2e", "разведчик", "Кедр", "Следопыт с луком. Помечает одну добычу.", [
        "Край точности: первый удар по добыче больнее.",
        "Черта «Выстрел по добыче».",
        "Происхождение охотника.",
      ], pfRanger("Кедр")),
    ];
  }
  return [
    pack("dnd-fighter", "dnd5e", "боец", "Марта Щит", "Воин. Доспех, меч и простой стиль обороны.", [
      "Происхождение солдата: Атлетика и Запугивание.",
      "Стиль обороны: +1 к защите в доспехе.",
      "Набор «Латный строй».",
    ], dndFighter("Марта Щит")),
    pack("dnd-rogue", "dnd5e", "разведчик", "Тень", "Плут. Скрытая атака, если есть преимущество или союзник рядом.", [
      "Происхождение преступника.",
      "Экспертиза в Скрытности и Акробатике.",
      "Набор «Кожа и отмычки».",
    ], dndRogue("Тень")),
    pack("dnd-cleric", "dnd5e", "целитель", "Свет", "Жрец-защитник. Лечит и носит тяжёлый доспех.", [
      "Порядок защитника.",
      "На день готовятся благословение и лечение.",
      "Происхождение послушника.",
    ], dndCleric("Свет")),
    pack("dnd-wizard", "dnd5e", "маг", "Искра", "Волшебник. Книга, щит реакцией и стрела без промаха.", [
      "Происхождение мудреца.",
      "В книге шесть заклинаний, на день готовятся четыре.",
      "Набор «Книга и посох».",
    ], dndWizard("Искра")),
    pack("dnd-bard", "dnd5e", "поддержка", "Лира", "Бард. Вдохновение союзнику и пара заклинаний.", [
      "Харизма выше остальных чисел.",
      "Насмешка и лечащее слово.",
      "Набор «Кожа и песня».",
    ], dndBard("Лира")),
  ];
}

export function starterDraft(system: "pf2e" | "dnd5e", role: BeginnerRole, name: string): Premade {
  const found = premades(system).find((item) => item.role === role) ?? premades(system)[0];
  const draft = structuredClone(found.draft);
  draft.name = name.trim() || found.name;
  return { ...found, name: draft.name, draft };
}

export function slotTitle(source: string, fallback: string): string {
  if (source === "class-feat") return "Новая черта класса";
  if (source === "skill-feat") return "Новая черта навыка";
  if (source === "general-feat") return "Общая черта";
  if (source === "ancestry-feat") return "Черта народа";
  if (source === "free-archetype") return "Черта архетипа";
  if (source === "free-boost") return "+1 к четырём характеристикам";
  if (source.endsWith("-boost")) return "Повышение характеристики";
  if (source === "skill-increase" || source === "class-skill" || source === "heritage-skill") return "Навык становится сильнее";
  if (source === "asi") return "+1 к двум характеристикам или новая черта";
  if (source === "feat" || source === "origin-feat") return "Новая черта";
  if (source === "subclass") return "Путь внутри класса";
  if (source === "epic") return "Дар высокого уровня";
  return fallback;
}

export function slotReason(source: string, name: string): string {
  if (source === "free-boost" || source.endsWith("-boost") || source === "asi") return `${name}: выше число — сильнее удары, хиты или заклинания`;
  if (source.includes("skill")) return `${name}: чаще получается это дело`;
  return name;
}

const WIZARD_FEATS: { id: string; reason: string }[] = [
  { id: "sudden-charge", reason: "подбежать и ударить" },
  { id: "reactive-shield", reason: "щит успевает подняться" },
  { id: "exacting-strike", reason: "промах не портит следующий удар" },
  { id: "vicious-swing", reason: "один сильный удар по одной цели" },
  { id: "double-slice", reason: "два оружия бьют одну цель" },
  { id: "snagging-strike", reason: "удар, и врагу труднее уйти" },
  { id: "shield-block", reason: "щит срезает часть урона" },
  { id: "battle-medicine", reason: "лечить в бою без магии" },
  { id: "fleet", reason: "просто быстрее ходите" },
  { id: "toughness", reason: "больше хитов, герой дольше держится" },
  { id: "defense", reason: "доспех даёт +1 к защите" },
  { id: "alert", reason: "реже оказываетесь последним в бою" },
  { id: "feat:tough", reason: "больше хитов, герой дольше держится" },
  { id: "feat:alert", reason: "реже оказываетесь последним в бою" },
];

const WIZARD_ARCHETYPE: { id: string; reason: string }[] = [
  { id: "medic-dedication", reason: "лечит отряд и почти не путает правила" },
  { id: "rogue-dedication", reason: "тихое дело и навыки, если хотите разнообразия" },
];

/** A few legal picks a new player can understand. The full list stays in the level plan. */
export function wizardOptions(source: string, options: { pick: string; name: string }[]): { pick: string; name: string; reason: string }[] {
  const withReason = (option: { pick: string; name: string }, reason?: string) => ({
    pick: option.pick,
    name: option.name,
    reason: reason ?? slotReason(source, option.name),
  });
  if (source.includes("boost")) return options.map((option) => withReason(option));
  if (source === "asi") {
    const prefer = ["str+2", "con+2", "dex+2", "feat:tough"];
    const picked = prefer.flatMap((id) => options.filter((option) => option.pick === id));
    const shown = (picked.length ? picked : options).slice(0, 4);
    return shown.map((option) => withReason(option, WIZARD_FEATS.find((row) => row.id === option.pick)?.reason));
  }
  if (source === "class-skill" || source === "heritage-skill" || source === "skill-increase" || source === "skill" || source === "expertise") {
    const prefer = ["athletics", "acrobatics", "medicine", "stealth", "perception", "intimidation"];
    const ranked = [...options].sort((left, right) => {
      const leftAt = prefer.indexOf(left.pick);
      const rightAt = prefer.indexOf(right.pick);
      return (leftAt < 0 ? 99 : leftAt) - (rightAt < 0 ? 99 : rightAt) || left.name.localeCompare(right.name, "ru");
    });
    return ranked.slice(0, 4).map((option) => withReason(option));
  }
  const table = source === "free-archetype" ? WIZARD_ARCHETYPE : WIZARD_FEATS;
  const byId = new Map(options.map((option) => [option.pick, option]));
  const advised = table.flatMap((row) => {
    const option = byId.get(row.id);
    return option ? [withReason(option, row.reason)] : [];
  }).slice(0, 4);
  if (advised.length >= 2) return advised;
  const dedication = (option: { pick: string; name: string }) => /посвящ/i.test(option.name) || option.pick.includes("dedication");
  const plain = options.filter((option) => source === "free-archetype" || !dedication(option));
  const rest = (plain.length ? plain : options).filter((option) => !advised.some((row) => row.pick === option.pick));
  return [...advised, ...rest.slice(0, 4 - advised.length).map((option) => withReason(option))];
}

const PREFER_SKILLS = ["athletics", "acrobatics", "medicine", "stealth", "diplomacy", "perception", "survival", "intimidation", "deception", "insight", "nature", "religion", "arcana", "society", "occultism", "crafting", "performance", "thievery", "persuasion", "history"];

function unique(list: Ability[]): Ability[] {
  const seen = new Set<Ability>();
  const out: Ability[] = [];
  for (const ability of list) {
    if (!seen.has(ability)) {
      seen.add(ability);
      out.push(ability);
    }
  }
  return out;
}

export function fillStep(draft: Draft, step: StepId): Partial<Draft> {
  if (step === "abilities") return fillAbilities(draft);
  if (step === "skills") return fillSkills(draft);
  if (step === "feats") return fillFeats(draft);
  if (step === "spells") return fillSpells(draft);
  if (step === "gear") return fillGear(draft);
  return {};
}

function fillAbilities(draft: Draft): Partial<Draft> {
  if (draft.system === "dnd5e") {
    const primary = CL5.find((item) => item.id === draft.classId)?.primary ?? ["str"];
    const order = unique([...primary, "con", "wis", "dex", "int", "cha", "str"]).slice(0, 6);
    const values = [15, 14, 13, 12, 10, 8];
    const scores = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
    order.forEach((ability, index) => {
      scores[ability] = values[index] ?? 8;
    });
    const fromBg = backgroundAbilities(draft);
    const boost2 = fromBg.includes(primary[0]) ? primary[0] : fromBg[0] ?? "";
    const boost1 = fromBg.find((ability) => ability !== boost2) ?? "";
    return {
      choices: {
        ...draft.choices,
        abilityMethod: "standard",
        ...(fromBg.length === 3 ? { boostMode: "split", boost2, boost1 } : {}),
      },
      scores,
    };
  }
  const cls = CL2.find((item) => item.id === draft.classId);
  const key = (draft.choices.key as Ability) || (draft.choices.rogueKey as Ability) || cls?.key[0] || "str";
  const choices: Record<string, string> = { ...draft.choices, abilityMethod: "boost" };
  if (cls && cls.key.length > 1 && !choices.key) choices.key = key;
  const ancestry = ANCESTRIES.find((item) => item.id === draft.ancestryId);
  const multi = { ...draft.multi };
  const freeAncestry = !ancestry || ancestry.boosts.length === 0 || choices.ancestryMode === "free" || draft.ancestryId === "custom";
  if (freeAncestry) {
    const second: Ability = key === "con" ? "str" : "con";
    multi.ancestryBoosts = unique([key, second]).slice(0, 2);
    if (multi.ancestryBoosts.length < 2) multi.ancestryBoosts.push("dex");
  } else if (ancestry) {
    const prefer = unique([key, "con", "dex", "wis", "str", "int", "cha"]).find((ability) => !ancestry.boosts.includes(ability));
    if (prefer) choices.ancFree = prefer;
  }
  const background = backgroundById(draft.backgroundId);
  if (background) {
    if (background.abilities.length) choices.bgFixed = background.abilities.includes(key) ? key : background.abilities[0];
    const used = new Set<Ability>(choices.bgFixed ? [choices.bgFixed as Ability] : []);
    const keys = ["bgFree", "bgFree2", "bgFree3"].slice(0, background.freeBoosts);
    for (const name of keys) {
      const pick = unique([key, "con", "dex", "wis", "str", "int", "cha"]).find((ability) => !used.has(ability));
      if (!pick) break;
      choices[name] = pick;
      used.add(pick);
    }
  }
  multi.freeBoosts = unique([key, "con", "dex", "wis", "str", "cha", "int"]).slice(0, 4);
  return { choices, multi };
}

function backgroundAbilities(draft: Draft): Ability[] {
  if (draft.system !== "dnd5e" || draft.backgroundId === "custom" || draft.edition === "dnd-2014") return [];
  const bg = draft.backgroundId;
  if (bg === "acolyte") return ["int", "wis", "cha"];
  if (bg === "criminal") return ["dex", "con", "int"];
  if (bg === "sage") return ["con", "int", "wis"];
  if (bg === "soldier") return ["str", "dex", "con"];
  return [];
}

function fillSkills(draft: Draft): Partial<Draft> {
  const scored = scoresOf({ ...draft, ...fillAbilities(draft) });
  if (!scored.ok || !draft.system) return {};
  const need = skillNeed(draft, scored.scores);
  const fixed = new Set(fixedSkills(draft));
  const catalog = draft.system === "pf2e" ? SK2 : SK5;
  const allowed = draft.system === "dnd5e" ? CL5.find((item) => item.id === draft.classId)?.skillChoices : "any";
  const pool = catalog
    .map((skill) => skill.id)
    .filter((id) => !fixed.has(id))
    .filter((id) => allowed === "any" || !allowed || allowed.includes(id));
  const prefer = [...PREFER_SKILLS.filter((id) => pool.includes(id)), ...pool];
  const skills: string[] = [];
  for (const id of prefer) {
    if (skills.length >= need) break;
    if (!skills.includes(id)) skills.push(id);
  }
  return { multi: { ...draft.multi, skills } };
}

function fillFeats(draft: Draft): Partial<Draft> {
  const choices = { ...draft.choices };
  const multi = { ...draft.multi };
  if (draft.system === "dnd5e") {
    const cls = CL5.find((item) => item.id === draft.classId);
    if (cls?.fightingStyle && !choices.style) choices.style = "defense";
    if (cls?.mastery && (multi.mastery ?? []).length !== cls.mastery) {
      const weapons = ["longsword", "longbow", "greatsword", "shortsword", "dagger", "mace"];
      multi.mastery = weapons.slice(0, cls.mastery);
    }
    if (cls?.expertise && (multi.expertise ?? []).length !== cls.expertise) {
      const have = [...new Set([...fixedSkills(draft), ...(draft.multi.skills ?? [])])];
      multi.expertise = have.slice(0, cls.expertise);
    }
    if (draft.ancestryId === "human" && !choices.humanFeat) choices.humanFeat = "alert";
    if (choices.humanFeat === "skilled" && (multi.hskilled ?? []).length !== 3) {
      const blocked = new Set([...fixedSkills({ ...draft, choices: { ...choices, humanFeat: "" } }), ...(multi.skills ?? [])]);
      multi.hskilled = SK5.map((skill) => skill.id).filter((id) => !blocked.has(id)).slice(0, 3);
    }
    return { choices, multi };
  }
  if (draft.heritageId === "skilled" && !choices.humanSkill) choices.humanSkill = "society";
  const ancestry = ANCESTRIES.find((item) => item.id === draft.ancestryId);
  if (draft.ancestryId !== "custom" && !choices.ancestryFeat) {
    choices.ancestryFeat = ancestry?.feats.find((feat) => feat.id !== "general-training" && feat.id !== "natural-ambition")?.id
      ?? ancestry?.feats[0]?.id
      ?? "natural-ambition";
  }
  const trained = new Set([...fixedSkills({ ...draft, choices }), ...(draft.multi.skills ?? [])]);
  if (!choices.skillFeat) {
    const legal = SKILL_FEATS.find((feat) => !skillFeatBlock(feat.id, trained));
    choices.skillFeat = legal?.id ?? "assurance";
  }
  const generalSlot = draft.heritageId === "versatile" || choices.ancestryFeat === "general-training";
  if (generalSlot && !choices.generalFeat) choices.generalFeat = "fleet";
  const cls = CL2.find((item) => item.id === draft.classId);
  const needsClass = Boolean(cls?.featLevel1 || choices.ancestryFeat === "natural-ambition");
  if (needsClass && !choices.classFeat) {
    choices.classFeat = cls?.feats[0]?.id ?? levelOneClassFeats(draft.classId)[0]?.id ?? "";
  }
  return { choices, multi };
}

function fillSpells(draft: Draft): Partial<Draft> {
  const budget = spellBudget(draft);
  if (!budget || !draft.system) return {};
  const spells = draft.system === "pf2e"
    ? SP2.filter((spell) => {
      const tradition = CL2.find((item) => item.id === draft.classId)?.spell?.tradition;
      return !tradition || spell.traditions.includes(tradition);
    })
    : SP5.filter((spell) => spell.classes.includes(draft.classId) || draft.classId === "custom");
  const cantrips = spells.filter((spell) => spell.level === 0).map((spell) => spell.id);
  const leveled = spells.filter((spell) => spell.level === 1).map((spell) => spell.id);
  const known = [...cantrips.slice(0, budget.cantrips)];
  const bookCount = budget.kind === "book" ? budget.known : budget.kind === "known" || budget.kind === "pact" ? budget.known : 0;
  known.push(...leveled.slice(0, bookCount));
  const prepared = budget.kind === "prepared" || budget.kind === "book" ? leveled.slice(0, budget.prepare) : [];
  if (budget.kind === "prepared") {
    for (const id of prepared) if (!known.includes(id)) known.push(id);
  }
  return { knownSpells: known, preparedSpells: prepared };
}

function fillGear(draft: Draft): Partial<Draft> {
  if (draft.system === "pf2e") return { gearMode: "kit" };
  if (draft.system === "dnd5e") {
    const pack = CL5.find((item) => item.id === draft.classId)?.packages[0];
    return { gearMode: pack?.id ?? "a" };
  }
  return {};
}

export function plainWords(card: { id: string; kind: string; trigger?: string; summary?: string }): string {
  const exact: Record<string, string> = {
    heal: "Берите, когда надо вернуть хиты союзнику или ударить нежить.",
    fireball: "Берите, когда врагов много и они стоят кучно.",
    "nimble-dodge": "Берите, чтобы уклониться, когда вас уже атакуют.",
    "shield-block": "Берите, чтобы щитом срезать часть урона.",
    "medic-dedication": "Берите, если хотите лечить в бою навыком, а не только магией.",
    "sudden-charge": "Берите, чтобы за один приём подбежать и ударить.",
    "magic-missile": "Берите, когда надо попасть наверняка.",
    shield: "Берите, когда по вам уже попали и нужна защита на этот ход.",
  };
  if (exact[card.id]) return exact[card.id];
  const summary = (card.summary ?? "").replace(/\s+/g, " ").trim();
  const trigger = (card.trigger ?? "").replace(/\s+/g, " ").trim();
  let line = "Берите, если вам подходит ситуация в тексте ниже.";
  if (card.kind === "spell" || card.kind === "focus" || card.kind === "ritual") {
    line = summary ? `Берите, когда нужен такой эффект: ${summary}` : "Берите, если этого приёма не хватает в ваш ход.";
  } else if (trigger) {
    line = `Берите, чтобы ответить, когда ${trigger.charAt(0).toLocaleLowerCase("ru")}${trigger.slice(1)}`;
  } else if (summary) {
    line = `Простыми словами: ${summary}`;
  }
  return line.length > 160 ? `${line.slice(0, 157)}…` : line;
}

export function hintsDefaultOn(): boolean {
  try {
    return localStorage.getItem(HINTS_KEY) !== "0";
  } catch {
    return true;
  }
}

/** First visit shows the full turn panel. Later visits start from one line. */
export function turnPanelStartsOpen(): boolean {
  try {
    return localStorage.getItem(TURN_SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markTurnPanelSeen(): void {
  try {
    localStorage.setItem(TURN_SEEN_KEY, "1");
  } catch {
    /* приватный режим */
  }
}

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return false;
  }
}
