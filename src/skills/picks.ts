import { SKILLS as DND_SKILLS } from "../data/dnd5e";
import { SKILLS as PF_SKILLS } from "../data/pf2e";
import { ABILITY_NAME, type Ability, mod } from "../types";

export type Frequency = "часто" | "иногда" | "редко";
export type Scene = "бой" | "поход" | "разговор";
export type PlayRole = "боец" | "целитель" | "маг" | "разведчик" | "поддержка";

/** Примета обычного стола, не цифра из книги. */
export const GUIDE_NOTE = "Как часто навык всплывает — примета обычного стола, не правило книги. У вашего мастера может быть иначе.";

export interface SkillCard {
  id: string;
  frequency: Frequency;
  scenes: Scene[];
  why: string;
  who: string;
  raise?: string;
  unlocks?: string;
}

export interface SkillTip {
  id: string;
  reason: string;
}

export interface SkillPlan {
  grow: SkillTip[];
  skip: SkillTip[];
}

const FREQ_RANK: Record<Frequency, number> = { часто: 0, иногда: 1, редко: 2 };

const PF_CLASS: Record<string, string[]> = {
  fighter: ["athletics", "acrobatics", "intimidation"],
  champion: ["athletics", "religion", "diplomacy"],
  barbarian: ["athletics", "intimidation"],
  monk: ["acrobatics", "athletics"],
  swashbuckler: ["acrobatics", "diplomacy"],
  rogue: ["stealth", "thievery", "acrobatics"],
  ranger: ["survival", "stealth", "nature"],
  investigator: ["society", "stealth"],
  cleric: ["medicine", "religion"],
  druid: ["nature", "medicine"],
  wizard: ["arcana", "crafting"],
  sorcerer: ["arcana", "diplomacy"],
  witch: ["occultism", "nature"],
  oracle: ["religion", "medicine"],
  bard: ["performance", "diplomacy", "occultism"],
  alchemist: ["crafting", "medicine"],
};

const DND_CLASS: Record<string, string[]> = {
  fighter: ["athletics", "perception", "intimidation"],
  barbarian: ["athletics", "perception", "intimidation"],
  paladin: ["athletics", "persuasion", "religion"],
  monk: ["acrobatics", "stealth", "athletics"],
  rogue: ["stealth", "sleight", "acrobatics", "perception"],
  ranger: ["survival", "stealth", "perception", "nature"],
  cleric: ["medicine", "religion", "insight"],
  druid: ["nature", "perception", "medicine"],
  wizard: ["arcana", "investigation", "history"],
  sorcerer: ["arcana", "persuasion"],
  warlock: ["arcana", "deception", "intimidation"],
  bard: ["persuasion", "performance", "deception"],
};

const ROLE_SKILLS: Record<PlayRole, string[]> = {
  боец: ["athletics", "intimidation", "acrobatics"],
  целитель: ["medicine", "religion", "nature", "insight"],
  маг: ["arcana", "occultism", "religion", "history", "investigation"],
  разведчик: ["stealth", "survival", "thievery", "perception", "acrobatics"],
  поддержка: ["diplomacy", "persuasion", "performance", "deception", "insight"],
};

/** Порядок совета. Скрытность воина сюда не входит: Ловкость у него уходит в защиту, а не в подкрадывание. */
const PF_ORDER: Record<string, string[]> = {
  fighter: ["athletics", "acrobatics", "intimidation", "medicine"],
  champion: ["religion", "athletics", "diplomacy", "medicine"],
  barbarian: ["athletics", "intimidation", "acrobatics", "medicine"],
  monk: ["acrobatics", "athletics", "stealth", "medicine"],
  swashbuckler: ["acrobatics", "diplomacy", "deception", "athletics"],
  rogue: ["stealth", "thievery", "acrobatics", "deception"],
  ranger: ["survival", "stealth", "nature", "athletics"],
  investigator: ["society", "stealth", "deception", "medicine"],
  cleric: ["religion", "medicine", "diplomacy", "nature"],
  druid: ["nature", "medicine", "survival", "athletics"],
  wizard: ["arcana", "society", "crafting", "occultism"],
  sorcerer: ["arcana", "diplomacy", "deception", "intimidation"],
  witch: ["occultism", "nature", "medicine", "diplomacy"],
  oracle: ["religion", "medicine", "diplomacy", "nature"],
  bard: ["performance", "diplomacy", "occultism", "deception"],
  alchemist: ["crafting", "medicine", "nature", "arcana"],
};

const DND_ORDER: Record<string, string[]> = {
  fighter: ["athletics", "perception", "acrobatics", "intimidation"],
  barbarian: ["athletics", "perception", "intimidation", "survival"],
  paladin: ["athletics", "persuasion", "religion", "insight"],
  monk: ["acrobatics", "stealth", "athletics", "insight"],
  rogue: ["stealth", "sleight", "acrobatics", "perception"],
  ranger: ["survival", "stealth", "perception", "nature"],
  cleric: ["medicine", "insight", "religion", "perception"],
  druid: ["nature", "perception", "medicine", "survival"],
  wizard: ["arcana", "investigation", "history", "insight"],
  sorcerer: ["arcana", "persuasion", "deception", "insight"],
  warlock: ["arcana", "deception", "intimidation", "investigation"],
  bard: ["persuasion", "performance", "deception", "insight"],
};

const WHO: Record<string, string> = {
  fighter: "воину",
  champion: "чемпиону",
  barbarian: "варвару",
  monk: "монаху",
  swashbuckler: "дуэлянту",
  rogue: "плуту",
  ranger: "следопыту",
  investigator: "следователю",
  cleric: "жрецу",
  druid: "друиду",
  wizard: "волшебнику",
  sorcerer: "чародею",
  witch: "ведьме",
  oracle: "оракулу",
  bard: "барду",
  alchemist: "алхимику",
  paladin: "паладину",
  warlock: "колдуну",
};

/** Коротко, что навык даёт. Согласование не нужно: фраза стоит после «отсюда». */
const HOOK: Record<string, string> = {
  athletics: "захват, толчок и сбить с ног",
  acrobatics: "кувырок и выход из захвата",
  intimidation: "деморализация",
  medicine: "лечение без магии",
  stealth: "подход незамеченным",
  diplomacy: "просьба и переговоры",
  deception: "ложь и отвлекающий финт",
  thievery: "замки и ловушки",
  survival: "следы и дорога",
  nature: "знание зверей и местности",
  religion: "знание веры и нежити",
  arcana: "знание магии",
  society: "законы и города",
  crafting: "починка и создание вещей",
  occultism: "проклятия и духи",
  performance: "песня и речь",
  perception: "засада и то, что отряд прошёл мимо",
  insight: "чужая ложь",
  persuasion: "честный разговор",
  investigation: "улики и механизмы",
  history: "гербы и старые войны",
  sleight: "карман и спрятанный жест",
  animal: "спокойный зверь",
};

const PF_CARDS: SkillCard[] = [
  { id: "athletics", frequency: "часто", scenes: ["бой", "поход"], why: "Лазать, прыгать, сбивать с ног и хватать.", who: "Воин, варвар, чемпион и любой, у кого сила — ключ.", raise: "Имеет смысл довести до мастера, если дерётесь вблизи.", unlocks: "Сбить с ног, схватить, толкнуть. Позже мощный бросок." },
  { id: "stealth", frequency: "часто", scenes: ["бой", "поход"], why: "Подойти незамеченным и начать бой с удобной позиции.", who: "Плут, следопыт и тот, кто ходит вперёд отряда.", raise: "Эксперт уже серьёзно. Мастер — если прячетесь почти каждый бой.", unlocks: "Прятаться и красться. От этого же скрытая атака плута." },
  { id: "medicine", frequency: "часто", scenes: ["бой", "поход"], why: "Поднять союзника без заклинания лечения.", who: "Жрец, друид и любой с высокой мудростью, кого просят лечить.", raise: "Эксперт нужен, чтобы лечение ран работало уверенно. Мастер — если вы лекарь отряда.", unlocks: "Боевая медицина, лечение ран, первая помощь при смерти." },
  { id: "intimidation", frequency: "часто", scenes: ["бой", "разговор"], why: "Испугать врага, чтобы он хуже бил и защищался.", who: "Воин, варвар и лицо отряда, которое давит, а не уговаривает.", raise: "Эксперта хватает для обычной деморализации. Мастер — если пугаете каждый бой.", unlocks: "Деморализация. Успех даёт испуг." },
  { id: "diplomacy", frequency: "часто", scenes: ["разговор"], why: "Договориться, выпросить слух или не довести до драки.", who: "Бард, чемпион и тот, кто говорит за отряд.", raise: "Эксперт лицу отряда. Мастер — если переговоры ваша основная работа.", unlocks: "Просьба и улучшение отношения. Это не контроль над разумом." },
  { id: "acrobatics", frequency: "иногда", scenes: ["бой", "поход"], why: "Удержать равновесие, кувыркнуться и выйти из захвата.", who: "Монах, плут, дуэлянт и герой с высокой ловкостью.", raise: "Эксперта обычно хватает. Мастер — если кувырок ваш постоянный приём.", unlocks: "Баланс, кувырок, протискивание, мягкое падение." },
  { id: "deception", frequency: "иногда", scenes: ["бой", "разговор"], why: "Солгать или отвлечь, чтобы следующий удар прошёл легче.", who: "Плут и обаятельный герой, который не хочет драться сразу.", raise: "Эксперт, если финт используете часто.", unlocks: "Ложь и финт в бою." },
  { id: "thievery", frequency: "иногда", scenes: ["поход"], why: "Открыть замок и снять ловушку, не поднимая шум.", who: "Плут. Остальным навык нужен, только если в отряде больше некому.", raise: "Эксперт, если замки и ловушки ваша работа.", unlocks: "Замки, ловушки, карман. Почти всегда нужны инструменты." },
  { id: "survival", frequency: "иногда", scenes: ["поход"], why: "Не потерять дорогу, найти еду и идти по следу.", who: "Следопыт и тот, кто водит отряд по дикой местности.", raise: "Следопыту стоит дойти до эксперта. Остальным хватает обученности.", unlocks: "Следы, ориентирование, пропитание." },
  { id: "nature", frequency: "иногда", scenes: ["поход", "бой"], why: "Вспомнить, что за зверь и чем он опасен.", who: "Друид, следопыт и герой с высокой мудростью.", raise: "Друиду и следопыту — эксперт. Остальным хватает обученности, чтобы пытаться.", unlocks: "Вспомнить знание о зверях, растениях и первозданной магии." },
  { id: "religion", frequency: "иногда", scenes: ["бой", "разговор"], why: "Узнать нежить и понять, какой обряд здесь уместен.", who: "Жрец и оракул. В подземелье с нежитью пригодится любому.", raise: "Жрецу — эксперт. Остальным обученности хватает для попытки.", unlocks: "Вспомнить знание о нежити и божественной магии." },
  { id: "arcana", frequency: "иногда", scenes: ["бой", "поход"], why: "Понять конструкта, магическую ловушку или школу заклинания.", who: "Волшебник, чародей и учёный отряда.", raise: "Эксперт, если арканная магия — ваша традиция. Иначе хватает обученности.", unlocks: "Вспомнить знание о конструктах и арканной магии." },
  { id: "society", frequency: "иногда", scenes: ["разговор", "поход"], why: "Узнать герб, закон и как себя вести при дворе.", who: "Следователь и городской герой.", raise: "Обученности хватает. Эксперт — если города ваша тема.", unlocks: "Вспомнить знание о людях, законах и городах." },
  { id: "crafting", frequency: "редко", scenes: ["поход"], why: "Починить снаряжение и сделать вещь в дни отдыха.", who: "Алхимик и волшебник, который сам готовит формулы.", raise: "Мастер нужен только тому, кто ремеслом зарабатывает. Остальным хватает обученности.", unlocks: "Починка, опознание предмета, создание по формуле." },
  { id: "occultism", frequency: "редко", scenes: ["бой", "поход"], why: "Разобрать проклятие, духа или странный ритуал.", who: "Бард, ведьма и тот, чья магия оккультная.", raise: "Эксперт, если это ваша традиция. Иначе навык всплывает редко.", unlocks: "Вспомнить знание о духах, проклятиях и оккультной магии." },
  { id: "performance", frequency: "редко", scenes: ["разговор"], why: "Собрать толпу, отвлечь или заработать монету песней.", who: "Почти только бард. Остальным стол просит выступление редко.", raise: "Мастер имеет смысл барду. Другому классу повышение сюда обычно жалко.", unlocks: "Песня и речь. Бард на этом держит композицию." },
];

const DND_CARDS: SkillCard[] = [
  { id: "athletics", frequency: "часто", scenes: ["бой", "поход"], why: "Лазать, прыгать, выламывать и бороться.", who: "Воин, варвар, паладин и любой с высокой силой." },
  { id: "perception", frequency: "часто", scenes: ["бой", "поход"], why: "Заметить засаду, тайник и то, что отряд прошёл мимо.", who: "Почти всем. Следопыт, плут и жрец берут его особенно охотно." },
  { id: "stealth", frequency: "часто", scenes: ["бой", "поход"], why: "Пройти мимо стражи и застать врага врасплох.", who: "Плут, следопыт, монах." },
  { id: "insight", frequency: "часто", scenes: ["разговор"], why: "Понять, что собеседник лжёт или чего он боится.", who: "Жрец, бард и тот, кто ведёт разговоры." },
  { id: "persuasion", frequency: "часто", scenes: ["разговор"], why: "Честно уговорить, не превращая каждый спор в драку.", who: "Бард, паладин, чародей." },
  { id: "intimidation", frequency: "часто", scenes: ["бой", "разговор"], why: "Заставить уступить угрозой.", who: "Варвар, воин, колдун." },
  { id: "medicine", frequency: "иногда", scenes: ["бой", "поход"], why: "Стабилизировать союзника на нуле хитов.", who: "Жрец, друид и тот, у кого нет лечащих заклинаний." },
  { id: "acrobatics", frequency: "иногда", scenes: ["бой", "поход"], why: "Не упасть, пролезть и вывернуться из захвата.", who: "Монах, плут и ловкий боец." },
  { id: "survival", frequency: "иногда", scenes: ["поход"], why: "Идти по следу и не заблудиться.", who: "Следопыт и проводник отряда." },
  { id: "investigation", frequency: "иногда", scenes: ["поход"], why: "Найти улику и понять, как устроен механизм.", who: "Волшебник и сыщик." },
  { id: "arcana", frequency: "иногда", scenes: ["бой", "поход"], why: "Вспомнить, как работает заклинание или символ.", who: "Волшебник, чародей, колдун." },
  { id: "nature", frequency: "иногда", scenes: ["поход"], why: "Узнать зверя, растение и ядовитую ягоду.", who: "Друид и следопыт." },
  { id: "religion", frequency: "иногда", scenes: ["бой", "разговор"], why: "Узнать культ, обряд и нежить.", who: "Жрец и паладин." },
  { id: "deception", frequency: "иногда", scenes: ["разговор"], why: "Солгать так, чтобы вам поверили.", who: "Бард, колдун, плут." },
  { id: "sleight", frequency: "иногда", scenes: ["разговор", "поход"], why: "Срезать кошель или спрятать жест.", who: "Плут. Остальным почти некогда этим заниматься." },
  { id: "history", frequency: "редко", scenes: ["разговор", "поход"], why: "Узнать герб, руины и чей это старый закон.", who: "Волшебник и учёный. В бою почти не бросается." },
  { id: "performance", frequency: "редко", scenes: ["разговор"], why: "Спеть, отвлечь толпу или заработать мелочь.", who: "Бард. Другому классу стол просит это редко." },
  { id: "animal", frequency: "редко", scenes: ["поход"], why: "Успокоить зверя или удержать скакуна.", who: "Друид и следопыт, и то не каждую игру." },
];

const CARDS: Record<"pf2e" | "dnd5e", SkillCard[]> = { pf2e: PF_CARDS, dnd5e: DND_CARDS };
const NAMES: Record<"pf2e" | "dnd5e", Map<string, { name: string; ability: Ability }>> = {
  pf2e: new Map(PF_SKILLS.map((skill) => [skill.id, skill])),
  dnd5e: new Map(DND_SKILLS.map((skill) => [skill.id, skill])),
};

export function skillCards(system: "pf2e" | "dnd5e"): SkillCard[] {
  return [...CARDS[system]].sort((left, right) => FREQ_RANK[left.frequency] - FREQ_RANK[right.frequency] || left.id.localeCompare(right.id));
}

export function skillTitle(system: "pf2e" | "dnd5e", id: string): string {
  return NAMES[system].get(id)?.name ?? id;
}

export function skillPlan(input: {
  system: "pf2e" | "dnd5e";
  classId: string;
  keyAbility: Ability;
  role: PlayRole;
  scores?: Partial<Record<Ability, number>>;
}): SkillPlan {
  const cards = CARDS[input.system];
  const names = NAMES[input.system];
  const classSkills = new Set((input.system === "pf2e" ? PF_CLASS : DND_CLASS)[input.classId] ?? []);
  const roleSkills = new Set(ROLE_SKILLS[input.role] ?? []);
  const order = (input.system === "pf2e" ? PF_ORDER : DND_ORDER)[input.classId] ?? [];
  const who = WHO[input.classId] ?? "вам";
  const ranked = cards.map((card) => {
    const ability = names.get(card.id)?.ability ?? "str";
    const abilityMod = input.scores ? mod(input.scores[ability] ?? 10) : 0;
    const pref = order.indexOf(card.id);
    const classSkill = classSkills.has(card.id);
    const key = ability === input.keyAbility;
    let score = pref >= 0 ? 40 - pref * 5 : card.frequency === "часто" ? 4 : card.frequency === "иногда" ? 2 : 0;
    if (classSkill && pref < 0) score += 8;
    if (roleSkills.has(card.id)) score += 3;
    if (key) score += 6;
    score += abilityMod;
    if (abilityMod < 0 && (pref >= 0 || classSkill)) score -= 8;
    return { card, ability, abilityMod, score, classSkill, key };
  }).sort((left, right) => right.score - left.score || left.card.id.localeCompare(right.card.id));

  const grow = ranked.slice(0, 4).map((row) => ({
    id: row.card.id,
    reason: growLine(row, who),
  }));
  const growIds = new Set(grow.map((row) => row.id));
  const skip = [...ranked].reverse().filter((row) => !growIds.has(row.card.id)).slice(0, 3).map((row) => ({
    id: row.card.id,
    reason: skipLine(row.card, row.ability, row.abilityMod, input.scores != null),
  }));
  return { grow, skip };
}

const FROM: Record<Ability, string> = {
  str: "Силы",
  dex: "Ловкости",
  con: "Телосложения",
  int: "Интеллекта",
  wis: "Мудрости",
  cha: "Харизмы",
};

const PRONOUN: Record<Ability, string> = {
  str: "она",
  dex: "она",
  con: "оно",
  int: "он",
  wis: "она",
  cha: "она",
};

const TALL: Record<Ability, string> = {
  str: "высокая",
  dex: "высокая",
  con: "высокое",
  int: "высокий",
  wis: "высокая",
  cha: "высокая",
};

const FLAT: Record<Ability, string> = {
  str: "средняя",
  dex: "средняя",
  con: "среднее",
  int: "средний",
  wis: "средняя",
  cha: "средняя",
};

const WEAK: Record<Ability, string> = {
  str: "слабая",
  dex: "слабая",
  con: "слабое",
  int: "слабый",
  wis: "слабая",
  cha: "слабая",
};

function hookOf(id: string): string {
  return HOOK[id] ?? "это дело";
}

function growLine(
  row: { card: SkillCard; ability: Ability; abilityMod: number; classSkill: boolean; key: boolean },
  who: string,
): string {
  const ability = FROM[row.ability];
  const hook = hookOf(row.card.id);
  if (row.key) return `Идёт от ${ability} — вашей главной характеристики; ${who} отсюда ${hook}.`;
  if (row.abilityMod >= 3) return `Идёт от ${ability}, ${PRONOUN[row.ability]} у вас ${TALL[row.ability]}; ${who} отсюда ${hook}.`;
  if (row.abilityMod < 0) return `Идёт от ${ability}, ${PRONOUN[row.ability]} ${WEAK[row.ability]}; ${who} отсюда всё равно ${hook}.`;
  if (row.abilityMod === 0 && row.classSkill) return `Идёт от ${ability}, ${PRONOUN[row.ability]} ${FLAT[row.ability]}; ${who} отсюда ${hook}.`;
  return `Идёт от ${ability}; ${who} отсюда ${hook}.`;
}

function skipLine(card: SkillCard, ability: Ability, abilityMod: number, known: boolean): string {
  const hook = hookOf(card.id);
  if (known && abilityMod <= 0) return `${ABILITY_NAME[ability]} ${WEAK[ability]}, так что ${hook} лучше не развивать.`;
  if (card.frequency === "редко") return `Редко всплывает и не связано с вашей ролью: ${hook}.`;
  return `Полезнее вложиться в другие навыки, чем в ${hook}.`;
}
