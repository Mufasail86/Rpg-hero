import type { Ability } from "../types";
import heritages from "./generated/pf-heritages.json";
import paths from "./generated/pf-paths.json";

function lines(id: string): Heritage[] {
  const rows = (heritages as Record<string, { id: string; name: string; info: string }[]>)[id] ?? [];
  return rows.map((row) => ({ id: row.id, name: row.name, info: row.info }));
}

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
  people("catfolk", "Котолюд", 8, "Средний", 25, "Сумеречное зрение", ["dex", "cha"], "wis", lines("catfolk")),
  people("hobgoblin", "Хобгоблин", 8, "Средний", 25, "Тёмное зрение", ["con", "int"], "wis", lines("hobgoblin")),
  people("kholo", "Холо", 8, "Средний", 25, "Сумеречное зрение", ["str", "int"], "wis", lines("kholo")),
  people("kobold", "Кобольд", 6, "Малый", 25, "Тёмное зрение", ["dex", "cha"], "con", lines("kobold")),
  people("tripkee", "Трипки", 6, "Малый", 25, "Сумеречное зрение", ["dex", "wis"], "str", lines("tripkee")),
  people("ratfolk", "Крысолюд", 6, "Малый", 25, "Сумеречное зрение", ["dex", "int"], "str", lines("ratfolk")),
  people("tengu", "Тэнгу", 6, "Средний", 25, "Сумеречное зрение", ["dex"], undefined, lines("tengu")),
  people("lizardfolk", "Людоящер", 8, "Средний", 25, "Обычное зрение", ["str", "wis"], "int", lines("lizardfolk")),
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
    features: [{ name: "Ярость", info: `${DRAFT}Действие: больше урона и временные хиты, хуже действия, которым нужна сосредоточенность. Кнопка на листе включает ярость. К удару прибавляется только число из выбранного инстинкта.`, short: "Черновик" }],
    info: "Больше всех хитов среди этих классов. Воинское оружие и средние доспехи. Инстинкт выбирается ниже. Дополнительный урон входит в удар, когда ярость включена и у инстинкта есть безусловное число в полях.",
  }),
  klass({
    id: "champion",
    name: "Поборник",
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
    name: "Следователь",
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
    spell: { tradition: "divine", cantrips: 0, slots: 3, prepared: false },
    features: [{ name: "Проклятие", info: "Тайна задаёт проклятие. На развитии ступень от 0 до предела: до 11 уровня это 2, с 11 — 3, с 17 — 4. Числа ступеней берутся из текста тайны. Ячейки выше 1 круга в выгрузке не лежат: на 1 уровне их три, на 19 есть одна ячейка 10 круга.", short: "Ступени из текста" }],
    info: "Божественная спонтанная магия. На 1 уровне три ячейки 1 круга. Таблица ячеек дальше в выгрузке не лежит, лист её не дописывает. Тайна ниже обучает навыку. Ступень проклятия на развитии входит в те числа, которые в тексте тайны есть.",
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
    spell: { tradition: "arcane", cantrips: 0, slots: 3, prepared: false },
    features: [{ name: "Кровь", info: "Наследие задаёт традицию. На 1 уровне в тексте три ячейки 1 круга. Число заговоров в этой фразе не стояло. Фокус в очки сам не кладётся.", short: "Ячейки 1 круга" }],
    info: "Мало хитов, спонтанная магия. На 1 уровне три ячейки 1 круга. Таблица ячеек дальше в выгрузке не лежит. Традиция выбирается ниже.",
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
    info: "Ловкость, воинское оружие, лёгкие доспехи. Стиль ниже обучает навыку из поля. Точность к удару лист сам не включает.",
  }),
];

const PATH_ROWS = paths as { classId: string; source: string; title: string; options: { id: string; name: string; info: string }[] }[];
const FEAT_AT_1 = new Set(["alchemist", "barbarian", "champion", "investigator", "monk", "swashbuckler"]);
for (const job of MORE_CLASSES) {
  if (FEAT_AT_1.has(job.id)) job.featLevel1 = true;
  const path = PATH_ROWS.find((row) => row.classId === job.id);
  if (!path) continue;
  job.choices = [
    ...job.choices,
    {
      id: path.source,
      title: path.title,
      options: path.options.map((option) => ({ id: option.id, name: option.name, info: option.info })),
    },
  ];
}
