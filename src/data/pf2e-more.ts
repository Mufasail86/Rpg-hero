import type { Ability } from "../types";

const DRAFT = "Черновик, не сверено. ";

interface Heritage {
  id: string;
  name: string;
  info: string;
  hp?: number;
}

interface Ancestry {
  id: string;
  name: string;
  hint: string;
  info: string;
  short: string;
  hp: number;
  size: string;
  speed: number;
  senses: string;
  languages: string;
  boosts: Ability[];
  flaw?: Ability;
  freeBoosts: number;
  heritages: Heritage[];
  feats: { id: string; name: string; info: string; level: number; short: string }[];
}

function people(
  id: string,
  name: string,
  hp: number,
  size: string,
  speed: number,
  senses: string,
  boosts: Ability[],
  flaw: Ability | undefined,
  heritages: Heritage[],
): Ancestry {
  return {
    id,
    name,
    hint: `${hp} хитов · черновик`,
    short: "Черновик, не сверено",
    hp,
    size,
    speed,
    senses,
    languages: "Всеобщий и языки по Интеллекту. Точный список языков этого народа ещё не сверен.",
    boosts,
    flaw,
    freeBoosts: 1,
    info: `${DRAFT}${name}: ${hp} хитов, ${size.toLowerCase()} размер, скорость ${speed}. Повышения и изъян ниже — рабочая память правил, не сверка с книгой. На 1 уровне одна черта народа.`,
    heritages,
    feats: [
      { id: `${id}-lore`, name: "Знание народа", info: `${DRAFT}Обучены одному знанию своего народа. В расчёт навыка само не входит: выберите знание на шаге навыков или запишите заметкой.`, level: 1, short: "Черновик" },
    ],
  };
}

export const MORE_ANCESTRIES: Ancestry[] = [
  people("catfolk", "Амуррун", 8, "Средний", 25, "Сумеречное зрение", ["dex", "cha"], "wis", [
    { id: "catfolk-climber", name: "Лазающий", info: `${DRAFT}Лазать для вас обычнее, чем для большинства. Скорость лазания лист сам не ставит. В справочнике народ назван «Кошачий народ».` },
    { id: "catfolk-night", name: "Ночной", info: `${DRAFT}Сумеречное зрение уже есть. В темноте вам проще не шуметь: отметьте +1 к Скрытности в темноте, лист сам это не прибавляет.` },
    { id: "catfolk-nine", name: "Девять жизней", info: `${DRAFT}Раз в день, когда вы должны упасть до 0 хитов, остаётесь с 1 хитом. Кнопка урона это не перехватывает: нажмите отмену, если правило сработало.` },
  ]),
  people("hobgoblin", "Хобгоблин", 8, "Средний", 25, "Тёмное зрение", ["con", "int"], "wis", [
    { id: "hob-short", name: "Короткий", info: `${DRAFT}Рост меньше обычного. Размер остаётся средним, если мастер не скажет иначе.` },
    { id: "hob-smokeworker", name: "Дымный", info: `${DRAFT}Дым и едкий воздух мешают вам на ступень слабее.` },
    { id: "hob-warmarch", name: "Походный", info: `${DRAFT}Долгий переход утомляет вас меньше. Лист скорость не повышает.` },
  ]),
  people("kholo", "Кхоло", 8, "Средний", 25, "Сумеречное зрение", ["str", "int"], "wis", [
    { id: "kholo-ant", name: "Муравьиный", info: `${DRAFT}Можете нести больше обычного. К пределу объёма лист сам не прибавляет: запишите +1, если стол так играет.` },
    { id: "kholo-cave", name: "Пещерный", info: `${DRAFT}Тёмное зрение вместо сумеречного.` },
    { id: "kholo-winter", name: "Зимний", info: `${DRAFT}Холод среды для вас на ступень слабее.` },
  ]),
  people("kobold", "Кобольд", 6, "Малый", 25, "Тёмное зрение", ["dex", "cha"], "con", [
    { id: "kobold-cave", name: "Пещерный", info: `${DRAFT}В тесноте и под землёй вам привычнее. Отдельного бонуса к скорости нет.` },
    { id: "kobold-dragon", name: "Драконий", info: `${DRAFT}Сопротивление одной энергии на выбор, равное половине уровня, минимум 1. Выберите энергию в заметке.` },
    { id: "kobold-spellscale", name: "Чешуя чар", info: `${DRAFT}Врождённый заговор одной традиции. Он не попадает в список заклинаний сам.` },
  ]),
  people("tripkee", "Трипки", 6, "Малый", 25, "Сумеречное зрение", ["dex", "wis"], "str", [
    { id: "tripkee-snare", name: "Силковый", info: `${DRAFT}Вам проще ставить простые силки. Формула силка в сумку сама не кладётся.` },
    { id: "tripkee-poison", name: "Ядовитый", info: `${DRAFT}Раз в день можете смазать оружие слабым ядом. Урон яда лист не бросает.` },
    { id: "tripkee-wind", name: "Ветреный", info: `${DRAFT}Прыжок с места чуть дальше. Дистанцию назовите мастеру, лист её не прибавляет к скорости.` },
  ]),
  people("ratfolk", "Крысиный народ", 6, "Малый", 25, "Сумеречное зрение", ["dex", "int"], "str", [
    { id: "rat-deep", name: "Глубинный", info: `${DRAFT}Тёмное зрение.` },
    { id: "rat-long", name: "Длиннозубый", info: `${DRAFT}Укус 1d6 колющего как безоружная атака. В атаку листа сам не добавляется.` },
    { id: "rat-warren", name: "Норовой", info: `${DRAFT}В толпе своего народа вам проще остаться незамеченным. Числовой бонус отметьте сами.` },
  ]),
  people("tengu", "Тенгу", 6, "Средний", 25, "Сумеречное зрение", ["dex"], undefined, [
    { id: "tengu-sky", name: "Небесный", info: `${DRAFT}Падая, вы планируете и получаете меньше урона. Точную формулу скажет книга, лист её не считает.` },
    { id: "tengu-storm", name: "Грозовой", info: `${DRAFT}Сопротивление электричеству, равное половине уровня, минимум 1.` },
    { id: "tengu-taloned", name: "Когтистый", info: `${DRAFT}Когти — безоружная атака 1d4 рубящего.` },
  ]),
  people("lizardfolk", "Ящеролюд", 8, "Средний", 25, "Обычное зрение", ["str", "wis"], "int", [
    { id: "lizard-claws", name: "Когти", info: `${DRAFT}Когти 1d4 рубящего и вам проще лазать.` },
    { id: "lizard-frilled", name: "Воротник", info: `${DRAFT}Можете деморализовать без языка, если цель вас видит.` },
    { id: "lizard-wet", name: "Речной", info: `${DRAFT}Вы дышите под водой и плаваете со своей скоростью. Скорость ходьбы лист не меняет.` },
  ]),
];

interface ClassRow {
  id: string;
  name: string;
  hint: string;
  info: string;
  short: string;
  hp: number;
  key: Ability[];
  perception: string;
  fort: string;
  ref: string;
  will: string;
  skillsFixed: string[];
  extraSkills: number;
  attacks: Record<string, string>;
  armor: Record<string, string>;
  spell?: { tradition: string; cantrips: number; slots: number; prepared: boolean };
  classDc: string;
  spellRank: string;
  featLevel1: boolean;
  features: { name: string; info: string; short: string }[];
  choices: { id: string; title: string; options: { id: string; name: string; info: string }[] }[];
  feats: { id: string; name: string; info: string; level: number; short: string }[];
  kit: string[];
}

function klass(row: Omit<ClassRow, "short" | "featLevel1" | "classDc" | "spellRank" | "feats" | "kit" | "choices"> & { choices?: ClassRow["choices"]; spell?: ClassRow["spell"] }): ClassRow {
  return {
    ...row,
    short: "Черновик, не сверено",
    classDc: "trained",
    spellRank: row.spell ? "trained" : "untrained",
    featLevel1: false,
    choices: row.choices ?? [],
    feats: [],
    kit: [],
    info: `${DRAFT}${row.info}`,
  };
}

const martial = { simple: "trained", martial: "trained", unarmed: "trained", advanced: "untrained" };
const simple = { simple: "trained", martial: "untrained", unarmed: "trained", advanced: "untrained" };

export const MORE_CLASSES: ClassRow[] = [
  klass({
    id: "alchemist",
    name: "Алхимик",
    hint: "8 хитов · Интеллект · формулы",
    hp: 8,
    key: ["int"],
    perception: "trained",
    fort: "expert",
    ref: "expert",
    will: "trained",
    skillsFixed: ["crafting"],
    extraSkills: 3,
    attacks: simple,
    armor: { unarmored: "trained", light: "trained", medium: "trained", heavy: "untrained" },
    features: [{ name: "Формулы", info: `${DRAFT}На 1 уровне есть набор формул и реагенты на день. Число реагентов лист не тратит: запишите его в заметке.`, short: "Черновик" }],
    info: "Алхимик готовит предметы, а не ячейки заклинаний. Средние доспехи, простое оружие. Классовые черты 1 уровня в этот черновик не вошли.",
  }),
  klass({
    id: "barbarian",
    name: "Варвар",
    hint: "12 хитов · Сила · ярость",
    hp: 12,
    key: ["str"],
    perception: "expert",
    fort: "expert",
    ref: "trained",
    will: "expert",
    skillsFixed: ["athletics"],
    extraSkills: 3,
    attacks: martial,
    armor: { unarmored: "trained", light: "trained", medium: "trained", heavy: "untrained" },
    features: [{ name: "Ярость", info: `${DRAFT}Действие: больше урона и временные хиты, хуже действия, которым нужна сосредоточенность. Кнопки ярости на листе нет.`, short: "Черновик" }],
    info: "Больше всех хитов среди этих классов. Воинское оружие и средние доспехи. Инстинкт ярости выберите заметкой: в расчёт он не входит.",
  }),
  klass({
    id: "champion",
    name: "Чемпион",
    hint: "10 хитов · Сила или Ловкость · тяжёлые доспехи",
    hp: 10,
    key: ["str", "dex"],
    perception: "trained",
    fort: "expert",
    ref: "trained",
    will: "expert",
    skillsFixed: ["religion"],
    extraSkills: 2,
    attacks: martial,
    armor: { unarmored: "trained", light: "trained", medium: "trained", heavy: "trained" },
    features: [{ name: "Обет", info: `${DRAFT}Реакция защищает союзника или карает врага. Причина и божество пишутся в памятке. Урон реакции лист не считает.`, short: "Черновик" }],
    info: "Тяжёлые доспехи и воинское оружие. Заклинания преданности в ячейки не кладутся: это черновик.",
  }),
  klass({
    id: "investigator",
    name: "Сыщик",
    hint: "8 хитов · Интеллект · зацепка",
    hp: 8,
    key: ["int"],
    perception: "expert",
    fort: "trained",
    ref: "expert",
    will: "expert",
    skillsFixed: ["society"],
    extraSkills: 4,
    attacks: martial,
    armor: { unarmored: "trained", light: "trained", medium: "untrained", heavy: "untrained" },
    features: [{ name: "Зацепка", info: `${DRAFT}Одно действие заранее бросает атаку по существу, которое вы изучаете. Повторно в ход не бросает. Лист бросок не хранит.`, short: "Черновик" }],
    info: "Много навыков, воинское оружие, лёгкие доспехи. Методология — заметка, не отдельный расчёт.",
  }),
  klass({
    id: "monk",
    name: "Монах",
    hint: "10 хитов · Сила или Ловкость · без доспеха",
    hp: 10,
    key: ["str", "dex"],
    perception: "trained",
    fort: "expert",
    ref: "expert",
    will: "expert",
    skillsFixed: [],
    extraSkills: 4,
    attacks: { simple: "trained", martial: "untrained", unarmed: "trained", advanced: "untrained" },
    armor: { unarmored: "expert", light: "untrained", medium: "untrained", heavy: "untrained" },
    features: [{ name: "Сильный кулак", info: `${DRAFT}Безоружный удар растёт с уровнем. На 1 уровне это 1d6. В строку атаки лист сам не подставляет.`, short: "Черновик" }],
    info: "Эксперт без доспеха и безоружных ударов. Доспех эту защиту ломает. Стойка выбирается заметкой.",
  }),
  klass({
    id: "oracle",
    name: "Оракул",
    hint: "8 хитов · Харизма · божественный спонтанный",
    hp: 8,
    key: ["cha"],
    perception: "trained",
    fort: "trained",
    ref: "trained",
    will: "expert",
    skillsFixed: ["religion"],
    extraSkills: 3,
    attacks: simple,
    armor: { unarmored: "trained", light: "trained", medium: "untrained", heavy: "untrained" },
    features: [{ name: "Проклятие", info: `${DRAFT}Тайна даёт силу и проклятие, которое нарастает. Ступени проклятия лист не ведёт. Число ячеек в сверенной карточке не стояло, поэтому лист их не выдумывает.`, short: "Черновик" }],
    info: "Божественная магия. Число ячеек в сверенной карточке не стояло, поэтому конструктор их не назначает.",
  }),
  klass({
    id: "sorcerer",
    name: "Чародей",
    hint: "6 хитов · Харизма · спонтанный",
    hp: 6,
    key: ["cha"],
    perception: "trained",
    fort: "trained",
    ref: "trained",
    will: "expert",
    skillsFixed: [],
    extraSkills: 2,
    attacks: simple,
    armor: { unarmored: "trained", light: "untrained", medium: "untrained", heavy: "untrained" },
    choices: [{
      id: "bloodline",
      title: "Наследие крови",
      options: [
        { id: "arcane", name: "Арканное", info: `${DRAFT}Традиция арканная. Заговоры берите из арканного списка.` },
        { id: "divine", name: "Божественное", info: `${DRAFT}Традиция божественная.` },
        { id: "occult", name: "Оккультное", info: `${DRAFT}Традиция оккультная.` },
        { id: "primal", name: "Первозданное", info: `${DRAFT}Традиция первозданная.` },
      ],
    }],
    features: [{ name: "Кровь", info: `${DRAFT}Наследие даёт заговор и фокус. Фокус в очки сам не кладётся.`, short: "Черновик" }],
    info: "Мало хитов, спонтанная магия. Традиция выбирается ниже, но список заклинаний в этом черновике всё ещё общий.",
  }),
  klass({
    id: "swashbuckler",
    name: "Сорвиголова",
    hint: "10 хитов · Ловкость · стиль",
    hp: 10,
    key: ["dex"],
    perception: "expert",
    fort: "trained",
    ref: "expert",
    will: "trained",
    skillsFixed: ["acrobatics"],
    extraSkills: 4,
    attacks: martial,
    armor: { unarmored: "trained", light: "trained", medium: "untrained", heavy: "untrained" },
    features: [{ name: "Стиль", info: `${DRAFT}Удачный финт, обман или акробатика дают точность к следующему удару. Лист точность сам не включает.`, short: "Черновик" }],
    info: "Ловкость, воинское оружие, лёгкие доспехи. Стиль — заметка.",
  }),
];
