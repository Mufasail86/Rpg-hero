import { BACKGROUNDS, SKILLS as SKILLS2 } from "../data/pf2e";
import { sheetDnd } from "../dnd/build";
import { derive, effectsFrom } from "../pf2e/build";
import { abilityMod, rankBonus, skillRows } from "../rules";
import { type Ability, type Character, fmt } from "../types";

export type CheckMode = "normal" | "adv" | "dis";

export interface SkillAction {
  id: string;
  name: string;
  brief: string;
  detail: string;
  minRank: "untrained" | "trained";
  featId?: string;
  featName?: string;
}

export interface SkillCard {
  when: string;
  roll: string;
  outcome: string;
  actions: SkillAction[];
}

export interface SkillLine {
  id: string;
  name: string;
  modifier: number;
  rank: string;
  rankLabel: string;
  formula: string;
  trained: boolean;
  pinned: boolean;
  statusNote: string;
  card: SkillCard;
}

const RANK_LABEL: Record<string, string> = {
  untrained: "не обучен",
  trained: "обучен",
  expert: "эксперт",
  master: "мастер",
  legendary: "легенда",
  proficient: "владеет",
  expertise: "компетентность",
};

const recall = (topic: string): SkillAction => ({
  id: "recall",
  name: "Вспомнить знание",
  brief: "Одно действие. СЛ задаёт мастер.",
  detail: `Вспоминаете про ${topic}. Успех — один полезный факт. На 10 выше СЛ — ещё подробность. Провал — ничего. Критический провал — ложный факт. Необычное и более редкое без обучения не вспоминают.`,
  minRank: "untrained",
});

const PF_CARDS: Record<string, SkillCard> = {
  acrobatics: {
    when: "Равновесие, кувырок мимо врага, не упасть.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех — получилось. На 10 выше СЛ ступень выше, кость 1 ступень ниже.",
    actions: [
      { id: "balance", name: "Баланс", brief: "Узкая или скользкая опора. СЛ задаёт поверхность.", detail: "Успех — идёте. Провал — падаете ничком.", minRank: "untrained" },
      { id: "tumble", name: "Кувырок сквозь врага", brief: "Против СЛ Реакции цели.", detail: "Успех — проходите её клетку. Провал — движение на этом кончается.", minRank: "untrained" },
    ],
  },
  arcana: {
    when: "Магия, конструкты, арканная традиция.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех даёт факт, не заклинание.",
    actions: [recall("магию и конструктов")],
  },
  athletics: {
    when: "Лазание, плавание, прыжок, захват, толчок.",
    roll: "к20 + этот модификатор. СЛ задаёт мастер или защита цели.",
    outcome: "Успех делает приём. Критический провал захвата или сбивания часто роняет вас.",
    actions: [
      { id: "grapple", name: "Захват", brief: "Одно действие с признаком атаки. СЛ Стойкости.", detail: "Успех — цель схвачена до конца вашего следующего хода. Критический успех — скована. Критический провал — вы падаете ничком.", minRank: "untrained" },
      { id: "trip", name: "Сбить с ног", brief: "Одно действие с признаком атаки. СЛ Реакции.", detail: "Успех — цель ничком. Критический успех добавляет урон. Критический провал — ничком падаете вы.", minRank: "untrained" },
    ],
  },
  crafting: {
    when: "Починить, опознать вещь, создать по формуле.",
    roll: "к20 + этот модификатор.",
    outcome: "Большинство формул требуют обучения.",
    actions: [
      { id: "repair", name: "Починить", brief: "10 минут. Нужны обучение и инструменты.", detail: "Успех восстанавливает предмет по правилам починки. Без обучения действие не начинается.", minRank: "trained" },
    ],
  },
  deception: {
    when: "Ложь и финт.",
    roll: "к20 + этот модификатор. Собеседник часто противопоставляет Восприятие.",
    outcome: "Успех верят или цель застигнута. Провал — ложь заметна.",
    actions: [
      { id: "lie", name: "Ложь", brief: "Против Восприятия слушателя.", detail: "Успех — версия принята, пока её не проверят. Критический провал выдаёт обман.", minRank: "untrained" },
      { id: "feint", name: "Финт", brief: "Одно действие. Нужно обучение. СЛ Восприятия.", detail: "Успех — цель застигнута против вашей следующей атаки в этот ход. Критический успех держится до конца вашего следующего хода.", minRank: "trained" },
    ],
  },
  diplomacy: {
    when: "Просьба, первое впечатление, слухи.",
    roll: "к20 + этот модификатор. Обычно против СЛ Воли.",
    outcome: "Успех сдвигает отношение на ступень, не делает врага слугой.",
    actions: [
      { id: "impression", name: "Произвести впечатление", brief: "Минута разговора. СЛ Воли.", detail: "Успех улучшает отношение на одну ступень в этой сцене. Критический успех — на две.", minRank: "untrained" },
    ],
  },
  intimidation: {
    when: "Испугать взглядом или угрозой.",
    roll: "к20 + этот модификатор. СЛ Воли цели.",
    outcome: "Испуг снижает проверки и СЛ. Сами характеристики он не режет.",
    actions: [
      {
        id: "demoralize",
        name: "Деморализовать",
        brief: "Одно действие. СЛ Воли.",
        detail: "Успех — испуг 1. Критический успех — испуг 2. Потом цель 10 минут не поддаётся вашему деморализующему действию, даже если бросок удался.",
        minRank: "untrained",
      },
    ],
  },
  medicine: {
    when: "Перевязать, стабилизировать, остановить кровь.",
    roll: "к20 + этот модификатор. СЛ лечения выбираете до броска.",
    outcome: "Провал лечения ран не лечит. Критический провал наносит 1к8 урона.",
    actions: [
      {
        id: "treat-wounds",
        name: "Лечение ран",
        brief: "10 минут. Нужны обучение и инструменты лекаря.",
        detail: "СЛ выбираете до броска и не выше ранга: 15 обученный (2к8 / крит 4к8), 20 эксперт (2к8+10 / 4к8+10), 30 мастер (2к8+30 / 4к8+30), 40 легенда (2к8+50 / 4к8+50). Провал — без лечения. Критический провал — 1к8 урона. Пациент час не лечится этим действием.",
        minRank: "trained",
      },
      {
        id: "battle-medicine",
        name: "Боевая медицина",
        brief: "Одно действие. Нужна черта и обучение.",
        detail: "Та же шкала лечения, что у лечения ран. Иммунитет к этому лекарю длится день, не час. Это другой таймер.",
        minRank: "trained",
        featId: "battle-medicine",
        featName: "Боевая медицина",
      },
      {
        id: "first-aid",
        name: "Первая помощь",
        brief: "Два действия. СЛ 15.",
        detail: "Стабилизировать умирающего или остановить кровотечение. Стабилизация не возвращает хиты.",
        minRank: "untrained",
      },
    ],
  },
  nature: {
    when: "Звери, растения, погода, первозданная традиция.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех — факт или узнанный след, не заклинание.",
    actions: [recall("зверей, растения и погоду")],
  },
  occultism: {
    when: "Проклятия, духи, оккультная традиция.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех объясняет угрозу. Провал ничего не даёт.",
    actions: [recall("духов, проклятия и оккультное")],
  },
  performance: {
    when: "Песня, речь, музыка, чтобы удержать внимание.",
    roll: "к20 + этот модификатор. СЛ зависит от публики.",
    outcome: "Успех собирает внимание. Заработок за день называет мастер.",
    actions: [
      { id: "perform", name: "Выступить", brief: "От одного действия до минуты.", detail: "Успех удерживает внимание. Критический провал портит номер.", minRank: "untrained" },
    ],
  },
  religion: {
    when: "Вера, нежить, божественная традиция.",
    roll: "к20 + этот модификатор.",
    outcome: "Это знание, не само благочестие и не заклинание.",
    actions: [recall("веру и нежить")],
  },
  society: {
    when: "Законы, города, этикет, гербы.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех подсказывает, как не оскорбить двор и чей это знак.",
    actions: [recall("законы, города и обычаи")],
  },
  stealth: {
    when: "Спрятаться или пройти тихо. Нужно укрытие.",
    roll: "к20 + этот модификатор против Восприятия наблюдателя.",
    outcome: "Успех — вас не видно или не слышно. На свету посреди пустой комнаты прятаться некуда.",
    actions: [
      { id: "hide", name: "Спрятаться", brief: "Одно действие, если есть укрытие.", detail: "Успех против Восприятия делает вас спрятанным. Шум и свет повышают СЛ.", minRank: "untrained" },
    ],
  },
  survival: {
    when: "След, дорога, еда в дикой местности.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех ведёт по следу или не даёт заблудиться.",
    actions: [
      { id: "track", name: "Выследить", brief: "СЛ зависит от следа и погоды.", detail: "Успех показывает, куда ушли. Провал — след потерян до новой зацепки.", minRank: "untrained" },
    ],
  },
  thievery: {
    when: "Кража, замок, ловушка. Почти всегда нужны обучение и инструменты.",
    roll: "к20 + этот модификатор. СЛ задаёт замок или устройство, не общая пятнадцатая.",
    outcome: "Большой бонус без обучения эти действия не открывает.",
    actions: [
      { id: "steal", name: "Кража", brief: "Нужно обучение. Против Восприятия.", detail: "Успех — предмет у вас, и цель не заметила. Провал — заметила.", minRank: "trained" },
      { id: "lock", name: "Взлом замка", brief: "Два действия. Обучение и воровские инструменты.", detail: "СЛ написана у замка. Обычный замок не обязан быть СЛ 15. Провал может заклинить механизм.", minRank: "trained" },
      { id: "device", name: "Обезвредить устройство", brief: "Обучение и инструменты. СЛ у устройства.", detail: "Успех выключает ловушку. Критический провал обычно запускает её.", minRank: "trained" },
    ],
  },
  perception: {
    when: "Заметить скрытое. В бою этим обычно бросают инициативу.",
    roll: "к20 + Восприятие. Это не навык и не Медицина.",
    outcome: "СЛ вашего Восприятия для чужой скрытности равна 10 + этот модификатор.",
    actions: [
      { id: "seek", name: "Искать", brief: "Одно действие. СЛ прячущегося или места.", detail: "Успех замечает спрятанное. Инициатива обычно берёт этот же модификатор и не складывает его со Скрытностью.", minRank: "untrained" },
    ],
  },
};

const DND_CARDS: Record<string, SkillCard> = {
  acrobatics: {
    when: "Удержать равновесие, пролезть, не упасть.",
    roll: "к20 + этот модификатор. Лазание — это Атлетика.",
    outcome: "Итог не ниже СЛ — успех. Кость 20 или 1 сама навык не решает.",
    actions: [{ id: "balance", name: "Равновесие", brief: "СЛ задаёт мастер: лёгкая 10, обычная 15, трудная 20.", detail: "Это примеры, не закон для каждой палубы. Мастер называет свою СЛ.", minRank: "untrained" }],
  },
  animal: {
    when: "Успокоить зверя или понять, чего он хочет.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех не заменяет дни дрессировки.",
    actions: [{ id: "calm", name: "Успокоить", brief: "СЛ по опасности зверя.", detail: "Успех удерживает зверя от рывка. Провал — он не слушается.", minRank: "untrained" }],
  },
  arcana: {
    when: "Вспомнить про заклинания, планы и магические знаки.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех даёт знание. Само заклинание оно не творит.",
    actions: [{ id: "recall", name: "Вспомнить", brief: "СЛ по редкости тайны.", detail: "Успех — верный факт. Провал — не помните.", minRank: "untrained" }],
  },
  athletics: {
    when: "Лезть, прыгать, плыть, выломать.",
    roll: "к20 + этот модификатор.",
    outcome: "Захват в правилах 2024 — не эта проверка: цель проходит испытание.",
    actions: [{ id: "climb", name: "Лезть или плыть", brief: "СЛ по поверхности или воде.", detail: "Успех продвигает. Провал — не сдвинулись или тонете, как скажет мастер.", minRank: "untrained" }],
  },
  deception: {
    when: "Солгать или выдать себя за другого.",
    roll: "к20 + этот модификатор. Часто против Проницательности.",
    outcome: "Успех верят сейчас. Это не очарование навсегда.",
    actions: [{ id: "lie", name: "Ложь", brief: "Состязание с Проницательностью или СЛ мастера.", detail: "Успех — версия принята. Провал — собеседник не верит.", minRank: "untrained" }],
  },
  history: {
    when: "Войны, династии, законы, гербы.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех вспоминает записанное. Тайну, которой нигде не учили, навык не открывает.",
    actions: [{ id: "recall", name: "Вспомнить", brief: "СЛ по тому, насколько знание редкое.", detail: "Успех — факт. Провал — пробел.", minRank: "untrained" }],
  },
  insight: {
    when: "Понять, лгут ли вам и чего человек боится.",
    roll: "к20 + этот модификатор.",
    outcome: "Это чутьё, не чтение мыслей.",
    actions: [{ id: "read", name: "Понять намерение", brief: "Против Обмана или СЛ мастера.", detail: "Успех видит ложь или страх. Провал — вид обычный.", minRank: "untrained" }],
  },
  intimidation: {
    when: "Добиться уступки угрозой.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех пугает сейчас. Другом цель не становится.",
    actions: [{ id: "threat", name: "Угроза", brief: "СЛ по смелости и ставке.", detail: "Успех — уступает, пока угроза рядом. Провал — отказ или вражда.", minRank: "untrained" }],
  },
  investigation: {
    when: "Понять улику, тайник, как устроен механизм.",
    roll: "к20 + этот модификатор.",
    outcome: "Внимательность замечает странность. Расследование отвечает, что это.",
    actions: [{ id: "search", name: "Разобрать улику", brief: "СЛ по тому, как хорошо спрятано.", detail: "Успех находит смысл. Провал — версия не сходится.", minRank: "untrained" }],
  },
  medicine: {
    when: "Стабилизировать при 0 хитов или узнать яд.",
    roll: "к20 + этот модификатор. Набор лекаря даёт преимущество.",
    outcome: "Успешная стабилизация не лечит. Герой остаётся при 0, без сознания, и больше не делает испытания смерти, пока его не ранят снова.",
    actions: [{ id: "stabilize", name: "Стабилизировать", brief: "Действие Помощь. СЛ 10.", detail: "Успех останавливает испытания смерти и не возвращает хиты. Временные хиты сознание не возвращают.", minRank: "untrained" }],
  },
  nature: {
    when: "Местность, растения, звери, погода — как знание.",
    roll: "к20 + этот модификатор.",
    outcome: "Природа вспоминает факт. Идти по следу — Выживание.",
    actions: [{ id: "recall", name: "Вспомнить", brief: "СЛ по редкости.", detail: "Успех узнаёт ягоду, след или примету. Провал — нет.", minRank: "untrained" }],
  },
  perception: {
    when: "Заметить засаду, шаг, скрытую дверь.",
    roll: "к20 + этот модификатор.",
    outcome: "Пассивная Внимательность = 10 + модификатор. Преимущество +5, помеха −5. Инициатива этому числу не равна.",
    actions: [{ id: "notice", name: "Заметить", brief: "Активный поиск — бросок. Пассивная работает без броска.", detail: "Скрытность прячущегося часто состязается с этой проверкой.", minRank: "untrained" }],
  },
  performance: {
    when: "Песня, речь, танец, музыка.",
    roll: "к20 + этот модификатор. Инструмент — отдельное владение.",
    outcome: "Успех держит толпу. Если подходят и навык, и инструмент, владение считают один раз и берут преимущество.",
    actions: [{ id: "perform", name: "Выступить", brief: "СЛ по публике.", detail: "Успех собирает внимание или прячет другой шум.", minRank: "untrained" }],
  },
  persuasion: {
    when: "Честно уговорить или договориться.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех не ломает волю: стража не отдаёт королевский ключ только из-за высокого броска.",
    actions: [{ id: "ask", name: "Уговорить", brief: "СЛ по просьбе.", detail: "Чем опаснее просьба, тем выше СЛ. Провал — отказ.", minRank: "untrained" }],
  },
  religion: {
    when: "Обряды, боги, символы, нежить.",
    roll: "к20 + этот модификатор.",
    outcome: "Это учёность, не замена молитве и не заклинание.",
    actions: [{ id: "recall", name: "Вспомнить", brief: "СЛ по редкости культа или твари.", detail: "Успех узнаёт обряд или слабость по слухам. Провал — не помните.", minRank: "untrained" }],
  },
  sleight: {
    when: "Карман, подмена, спрятанный жест.",
    roll: "к20 + этот модификатор. Замок — это воровские инструменты, не этот навык.",
    outcome: "Если подходят и навык, и инструмент, бонус владения один, зато есть преимущество.",
    actions: [
      { id: "pocket", name: "Карман", brief: "Против Внимательности.", detail: "Успех — предмет у вас незаметно. Провал — вас видят.", minRank: "untrained" },
      { id: "tools", name: "Замок инструментами", brief: "Нужны воровские инструменты. СЛ у замка.", detail: "СЛ 15 — только у простого замка из книги, не у всякого. Без инструментов действие не сделать.", minRank: "untrained" },
    ],
  },
  stealth: {
    when: "Спрятаться или пройти незамеченным.",
    roll: "к20 + этот модификатор против Внимательности.",
    outcome: "Нужно укрытие или плохой свет. Тяжёлый доспех может дать помеху: число при этом то же.",
    actions: [{ id: "hide", name: "Спрятаться", brief: "Состязание с Внимательностью.", detail: "Успех — вас не замечают. Провал — видят.", minRank: "untrained" }],
  },
  survival: {
    when: "След, еда, дорога, непогода.",
    roll: "к20 + этот модификатор.",
    outcome: "Успех не даёт факта из книги — это дело в поле. Факт даёт Природа.",
    actions: [{ id: "track", name: "Идти по следу", brief: "СЛ по давности и земле.", detail: "Успех ведёт дальше. Провал — след оборван.", minRank: "untrained" }],
  },
};

export function skillCard(system: Character["system"], id: string, name = ""): SkillCard {
  const table = system === "pf2e" ? PF_CARDS : DND_CARDS;
  return (
    table[id] ?? {
      when: name ? `Проверка «${name}».` : "Проверка навыка.",
      roll: "к20 + этот модификатор. К кости прибавляют только его.",
      outcome: system === "pf2e" ? "Ступень смотрят по итогу. Кость 20 поднимает её, кость 1 снижает." : "Итог не ниже СЛ — успех. Кость 20 или 1 сама навык не решает.",
      actions: [
        {
          id: "check",
          name: "Проверка",
          brief: "СЛ называет мастер.",
          detail: "Пока СЛ нет, приложение не объявляет успех.",
          minRank: "untrained",
        },
      ],
    }
  );
}

export function actionGate(rank: string, action: SkillAction, hasFeat: boolean): string | null {
  if (action.minRank === "trained" && rank === "untrained") return "Нужно обучение. Число на листе требование не снимает.";
  if (action.featId && !hasFeat) return `Нужна черта «${action.featName ?? action.featId}».`;
  return null;
}

export function keepDie(mode: CheckMode, first: number, second: number): number {
  if (mode === "adv") return Math.max(first, second);
  if (mode === "dis") return Math.min(first, second);
  return first;
}

export function resolveCheck(system: Character["system"], natural: number, modifier: number, dc: number | null): { total: number; verdict: string } {
  const face = Math.max(1, Math.min(20, Math.trunc(natural)));
  const total = face + modifier;
  if (dc == null) return { total, verdict: "" };
  if (system === "pf2e") {
    let step = total >= dc + 10 ? 3 : total >= dc ? 2 : total > dc - 10 ? 1 : 0;
    if (face === 20) step = Math.min(3, step + 1);
    if (face === 1) step = Math.max(0, step - 1);
    return { total, verdict: ["критический провал", "провал", "успех", "критический успех"][step] };
  }
  const bone = face === 20 || face === 1 ? ` Кость ${face} сама навык не решает.` : "";
  return { total, verdict: `${total >= dc ? "успех" : "провал"}.${bone}` };
}

export function characterHasFeat(character: Character, id: string): boolean {
  if (character.feats.some((feat) => feat.id === id)) return true;
  if (character.progress?.choices.some((choice) => choice.pick === id)) return true;
  if (character.progress?.dailyFeats?.includes(id)) return true;
  return BACKGROUNDS.find((item) => item.id === character.backgroundId)?.feat === id;
}

function lineOf(id: string, name: string, modifier: number, rank: string, formula: string, pinned: boolean, statusNote: string, system: Character["system"]): SkillLine {
  return {
    id,
    name,
    modifier,
    rank,
    rankLabel: RANK_LABEL[rank] ?? rank,
    formula: formula || `${name} ${fmt(modifier)}`,
    trained: rank !== "untrained",
    pinned,
    statusNote,
    card: skillCard(system, id, name),
  };
}

function pfStatus(character: Character, ability: Ability): number {
  const values = character.conditionValues ?? {};
  const status = Math.max(values.frightened ?? 0, values.sickened ?? 0);
  const clumsy = ability === "dex" ? values.clumsy ?? 0 : 0;
  const enfeebled = ability === "str" ? values.enfeebled ?? 0 : 0;
  return Math.max(status, clumsy, enfeebled);
}

export function skillSnapshot(character: Character): SkillLine[] {
  if (character.system === "dnd5e") return dndLines(character);
  return pfLines(character);
}

function dndLines(character: Character): SkillLine[] {
  const derived = sheetDnd(character);
  const rows = skillRows(character);
  const exhaustion = character.conditionValues?.exhaustion ?? 0;
  return rows.map((row) => {
    const stat = derived?.skills[row.id];
    const modifier = stat ? stat.value : row.mod - exhaustion * 2;
    const rank = stat?.rank ?? row.rank;
    const note = exhaustion > 0 ? "Истощение уже в числе. Второй раз не вычитайте." : "";
    const formula = stat?.formula ?? `${row.name} ${fmt(modifier)}`;
    const line = lineOf(row.id, row.name, modifier, rank, formula, false, note, "dnd5e");
    if (row.id === "perception") line.card = skillCard("dnd5e", "perception");
    return line;
  });
}

function pfLines(character: Character): SkillLine[] {
  const derived = character.progress
    ? derive({
        progress: character.progress,
        items: character.items,
        conditions: character.conditionValues,
        level: character.level,
        toggles: character.progress.toggles,
        shieldRaised: character.shieldRaised,
        customEffects: effectsFrom(character),
      })
    : null;
  const scared = Math.max(character.conditionValues?.frightened ?? 0, character.conditionValues?.sickened ?? 0);
  const lines: SkillLine[] = [];
  const seen = new Set<string>();
  const push = (id: string, name: string, ability: Ability, rank: string, raw: number, formula: string, pinned: boolean) => {
    if (seen.has(id)) return;
    seen.add(id);
    const penalty = derived ? 0 : pfStatus(character, ability);
    const modifier = raw - penalty;
    const note = penalty > 0 || (derived && scared > 0) ? "Штраф состояния уже в числе. Второй раз не вычитайте." : "";
    lines.push(lineOf(id, name, modifier, rank, formula, pinned, note, "pf2e"));
  };

  const perceptionRank = derived ? "trained" : character.perceptionRank || "trained";
  const perceptionValue = derived?.perception.value ?? abilityMod(character, "wis") + rankBonus(perceptionRank, character.level);
  const perceptionFormula = derived?.perception.formula ?? `Восприятие ${fmt(perceptionValue)}`;
  push("perception", "Восприятие", "wis", derived ? perceptionRankFrom(character) : perceptionRank, perceptionValue, perceptionFormula, true);

  for (const skill of SKILLS2) {
    const stat = derived?.skills[skill.id];
    const rank = stat?.rank ?? character.skillRanks[skill.id] ?? "untrained";
    const raw = stat?.value ?? abilityMod(character, skill.ability) + rankBonus(rank, character.level);
    push(skill.id, skill.name, skill.ability, rank, raw, stat?.formula ?? "", false);
  }
  for (const extra of character.extraSkills) {
    const stat = derived?.skills[extra.id];
    const rank = stat?.rank ?? character.skillRanks[extra.id] ?? "untrained";
    const raw = stat?.value ?? abilityMod(character, extra.ability) + rankBonus(rank, character.level);
    push(extra.id, extra.name, extra.ability, rank, raw, stat?.formula ?? "", false);
  }
  return lines;
}

function perceptionRankFrom(character: Character): string {
  return character.perceptionRank || "trained";
}

export function passivePerception(line: SkillLine | undefined): number | null {
  if (!line || line.id !== "perception") return null;
  return 10 + line.modifier;
}
