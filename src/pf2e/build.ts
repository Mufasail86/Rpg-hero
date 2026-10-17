import { FEAT_BY_ID, FEAT_INDEX, pathGroup, pathOption, type PathOption } from "../data/pf-index";
import { curseMax, curseMods, doctrineOptions, monkSaveOptions, resolveRanks } from "./progression";
import { ANCESTRIES, BACKGROUNDS, CLASSES, SKILLS } from "../data/pf2e";
import { CLASS_FEAT_LEVELS, SKILL_FEAT_LEVELS } from "../data/roster";
import {
  ABILITIES,
  ABILITY_NAME,
  type Ability,
  type BuildChoice,
  type Character,
  type FeatInst,
  type FeatureInst,
  type ItemInst,
  type Pf2eProgress,
  type StructuredEffect,
  fmt,
  mod,
} from "../types";

export type Rank = "untrained" | "trained" | "expert" | "master" | "legendary";

const RANK_ORDER: Rank[] = ["untrained", "trained", "expert", "master", "legendary"];
const RANK_EXTRA: Record<Rank, number> = { untrained: 0, trained: 2, expert: 4, master: 6, legendary: 8 };
const RANK_WORD: Record<Rank, string> = {
  untrained: "необучен",
  trained: "обучен",
  expert: "эксперт",
  master: "мастер",
  legendary: "легенда",
};

export interface Issue {
  kind: "build" | "limit";
  message: string;
}

export interface Stat {
  value: number;
  formula: string;
  /** Условные куски, которые не вошли в обычное число. */
  aside: string[];
}

export interface SkillStat extends Stat {
  rank: Rank;
  ability: Ability;
}

export interface Derived {
  level: number;
  abilities: Record<Ability, { score: number; mod: number; partial: boolean; formula: string }>;
  hp: Stat;
  ac: Stat;
  speed: Stat;
  perception: Stat & { rank: Rank };
  initiative: Stat;
  saves: Record<"fort" | "ref" | "will", SkillStat>;
  skills: Record<string, SkillStat>;
  classDc: (Stat & { rank: Rank }) | null;
  spell: (Stat & { rank: Rank }) | null;
  attacks: { name: string; group: string; category: string; rank: Rank; attack: Stat; damage: string; equipped: boolean }[];
  load: { bulk: number; limit: number; max: number; encumbered: boolean };
  issues: Issue[];
  feats: { id: string; name: string; modeled: boolean }[];
  actions: { id: string; name: string; cost: string; traits: string; effect: string }[];
}

interface Slot {
  id: string;
  level: number;
  source: string;
  label: string;
}

interface FeatDef {
  name: string;
  kind: "ancestry" | "class" | "skill" | "general" | "archetype" | "mythic";
  level: number;
  modeled: boolean;
  skill?: string;
  knowledge?: boolean;
  repeatable?: boolean;
  classes?: string[];
  ancestries?: string[];
}

const FEATS: Record<string, FeatDef> = {
  "cooperative-nature": { name: "Жилка к сотрудничеству", kind: "ancestry", level: 1, modeled: false },
  "haughty-obstinacy": { name: "Спесивое упрямство", kind: "ancestry", level: 1, modeled: false },
  "unconventional-weaponry": { name: "Необычное оружие", kind: "ancestry", level: 1, modeled: false },
  "incredible-improvisation": { name: "Невероятная импровизация", kind: "ancestry", level: 9, modeled: false },
  "heroic-presence": { name: "Героическое присутствие", kind: "ancestry", level: 17, modeled: false },
  survey: { name: "Обзор дичи", kind: "skill", level: 1, modeled: false, skill: "survival" },
  knockdown: { name: "Нокдаун", kind: "class", level: 4, modeled: true },
  "sudden-charge": { name: "Внезапный рывок", kind: "class", level: 1, modeled: false },
  "exacting-strike": { name: "Точный удар", kind: "class", level: 1, modeled: false },
  "double-slice": { name: "Двойной взмах", kind: "class", level: 1, modeled: false },
  "vicious-swing": { name: "Жестокий замах", kind: "class", level: 1, modeled: false },
  "snagging-strike": { name: "Цепкий удар", kind: "class", level: 1, modeled: false },
  "combat-grab": { name: "Боевой захват", kind: "class", level: 2, modeled: false },
  "dueling-parry": { name: "Дуэльное парирование", kind: "class", level: 2, modeled: true },
  "intimidating-strike": { name: "Устрашающий удар", kind: "class", level: 2, modeled: false },
  "aggressive-block": { name: "Жёсткий блок", kind: "class", level: 2, modeled: false },
  "lightning-swap": { name: "Молниеносная смена", kind: "class", level: 2, modeled: false },
  "brutish-shove": { name: "Грубый толчок", kind: "class", level: 2, modeled: false },
  toughness: { name: "Живучесть", kind: "general", level: 1, modeled: true },
  fleet: { name: "Быстроногий", kind: "general", level: 1, modeled: true },
  diehard: { name: "Несгибаемый", kind: "general", level: 1, modeled: false },
  "breath-control": { name: "Контроль дыхания", kind: "general", level: 1, modeled: false },
  "canny-acumen": { name: "Дальновидность", kind: "general", level: 1, modeled: true },
  "shield-block": { name: "Блок щитом", kind: "general", level: 1, modeled: false },
  assurance: { name: "Уверенность", kind: "skill", level: 1, modeled: false, repeatable: true },
  hefty: { name: "Тяжёлая ноша", kind: "skill", level: 1, modeled: true, skill: "athletics" },
  "experienced-smuggler": { name: "Опытный контрабандист", kind: "skill", level: 1, modeled: false, skill: "stealth" },
  "cat-fall": { name: "Мягкое падение", kind: "skill", level: 1, modeled: false, skill: "acrobatics" },
  dubious: { name: "Сомнительные знания", kind: "skill", level: 1, modeled: false, knowledge: true },
  underwater: { name: "Подводный мародёр", kind: "skill", level: 1, modeled: false, skill: "athletics" },
  "continual-recovery": { name: "Непрерывное лечение", kind: "skill", level: 2, modeled: false, skill: "medicine" },
  "battle-medicine": { name: "Боевая медицина", kind: "skill", level: 1, modeled: true, skill: "medicine" },
  pickpocket: { name: "Карманник", kind: "skill", level: 1, modeled: false, skill: "thievery" },
  "medic-dedication": { name: "Посвящение медика", kind: "archetype", level: 2, modeled: true },
  "doctors-visitation": { name: "Визит доктора", kind: "archetype", level: 4, modeled: true },
  "treat-condition": { name: "Лечение состояния", kind: "archetype", level: 4, modeled: false },
  "rogue-dedication": { name: "Посвящение плута", kind: "archetype", level: 2, modeled: true },
  "skill-mastery": { name: "Мастерство навыка", kind: "archetype", level: 8, modeled: true, repeatable: true },
  "basic-trickery": { name: "Простые уловки", kind: "archetype", level: 4, modeled: false },
  "sneak-attacker": { name: "Внезапная атака", kind: "archetype", level: 4, modeled: false },
  "uncanny-dodge": { name: "Чутьё на засаду", kind: "archetype", level: 10, modeled: false },
  evasiveness: { name: "Увёртливость", kind: "archetype", level: 12, modeled: false },
  "tactical-entry": { name: "Тактический вход", kind: "archetype", level: 12, modeled: false },
};

const KNOWLEDGE = new Set(["arcana", "crafting", "medicine", "nature", "occultism", "religion", "society"]);

const GROUPS: Record<string, string> = {
  longsword: "sword",
  shortsword: "sword",
  rapier: "sword",
  greatsword: "sword",
  shortbow: "bow",
  longbow: "bow",
  crossbow: "crossbow",
};

export interface DeriveInput {
  progress: Pf2eProgress;
  items: ItemInst[];
  conditions?: Record<string, number>;
  level: number;
  toggles?: string[];
  shieldRaised?: boolean;
  customEffects?: StructuredEffect[];
}

export function derive(input: DeriveInput): Derived {
  const level = Math.max(1, Math.min(20, input.level));
  const progress = input.progress;
  const toggles = new Set(input.toggles ?? progress.toggles);
  const issues: Issue[] = [];
  const scores = abilityScores(progress, level, issues);
  const ranks = new Map<string, Rank>();
  const loreNames = new Map<string, string>();
  const feats: { id: string; name: string; modeled: boolean }[] = [];
  const taken = new Set<string>();

  const slots = slotsFor(progress, level);
  const byId = new Map<string, BuildChoice>();
  for (const choice of progress.choices) {
    if (choice.level > level) continue;
    if (byId.has(choice.id)) issues.push({ kind: "build", message: "Один и тот же выбор записан дважды." });
    byId.set(choice.id, choice);
  }
  for (const slot of slots) {
    if (!byId.has(slot.id)) issues.push({ kind: "build", message: `Не закрыт выбор: ${slot.label} (уровень ${slot.level}).` });
  }
  for (const choice of byId.values()) {
    if (!slots.some((slot) => slot.id === choice.id)) {
      issues.push({ kind: "build", message: `Лишний выбор «${choiceCaption(choice)}» на уровне ${choice.level}: для него нет положенного слота.` });
    }
  }

  const background = backgroundOf(progress.backgroundId);
  if (background) {
    train(ranks, background.skill);
    const loreId = `lore:${progress.backgroundId}`;
    train(ranks, loreId);
    loreNames.set(loreId, background.lore);
    grantFeat(background.feat, feats, taken, issues, ranks);
  }
  const classRow = CLASSES.find((item) => item.id === progress.classId);
  for (const id of classRow?.skillsFixed ?? []) train(ranks, id);
  const pathPick = progress.choices.find((choice) => choice.level <= level && (choice.source === "instinct" || choice.source === "style" || choice.source === "mystery"));
  const path = pathOption(pathPick?.source ?? "", pathPick?.pick);
  if (pathPick && !path) issues.push({ kind: "build", message: "Неизвестный выбор инстинкта, стиля или тайны." });

  for (const slot of slots.filter((slot) => slot.source === "class-skill" || slot.source === "heritage-skill")) {
    const choice = byId.get(slot.id);
    if (!choice) continue;
    if (!isSkillId(choice.pick) && !choice.pick.startsWith("lore:")) {
      issues.push({ kind: "build", message: `${slot.label}: неизвестный навык.` });
      continue;
    }
    if (slot.source === "class-skill" && slot.id.endsWith("primary") && progress.classId === "fighter" && choice.pick !== "athletics" && choice.pick !== "acrobatics") {
      issues.push({ kind: "build", message: "Воин на старте берёт Атлетику или Акробатику." });
    }
    if ((ranks.get(choice.pick) ?? "untrained") !== "untrained") {
      issues.push({ kind: "build", message: `${skillName(choice.pick, loreNames)} уже обучен, повторно этот слот его не повышает.` });
    }
    train(ranks, choice.pick);
  }
  if (path?.skill) train(ranks, path.skill);

  const archetypeFeats: { id: string; level: number }[] = [];

  for (let step = 1; step <= level; step += 1) {
    for (const choice of [...byId.values()].filter((choice) => choice.level === step && (choice.source === "class-feat" || choice.source === "free-archetype" || choice.source === "general-feat" || choice.source === "ancestry-feat" || choice.source === "skill-feat"))) {
      applyFeatChoice(choice, progress, ranks, loreNames, feats, taken, issues, archetypeFeats, scores);
    }
    if (step >= 2 && hasFeat(byId, "medic-dedication", step) && (ranks.get("medicine") ?? "untrained") !== "untrained") {
      ranks.set("medicine", atLeast(ranks.get("medicine") ?? "untrained", "expert"));
    }
    if (step >= 5 && progress.heritageId === "skilled") {
      const skill = byId.get("heritage-skill")?.pick;
      if (skill) ranks.set(skill, atLeast(ranks.get(skill) ?? "untrained", "expert"));
    }
    for (const choice of [...byId.values()].filter((choice) => choice.level === step && choice.source === "skill-increase")) {
      const current = ranks.get(choice.pick) ?? "untrained";
      const next = stepUp(current, step);
      if ("error" in next) issues.push({ kind: "build", message: `Повышение навыка ${skillName(choice.pick, loreNames)} на ${step} уровне: ${next.error}.` });
      else ranks.set(choice.pick, next.rank);
    }
    for (const choice of [...byId.values()].filter((choice) => choice.level === step && choice.pick === "skill-mastery")) {
      applySkillMastery(choice, ranks, loreNames, feats, taken, issues, step);
    }
  }

  if (progress.versatileHeritageId) {
    issues.push({
      kind: "limit",
      message: "Универсальное наследие записано вместе с народом. Его эффект приложение к числам не прибавляет.",
    });
  }

  const mysteryId = progress.choices.find((choice) => choice.source === "mystery" && choice.level <= level)?.pick ?? "";
  const curseValue = progress.classId === "oracle" ? Math.min(curseMax(level), Math.max(0, progress.cursebound ?? 0)) : 0;
  const curse = curseMods(mysteryId, curseValue, level);
  for (const note of curse.notes) issues.push({ kind: "limit", message: note });

  for (const feat of feats) {
    if (!feat.modeled) issues.push({ kind: "limit", message: `«${feat.name}» записана, но её эффект приложение не применяет к числам.` });
  }
  for (const daily of progress.dailyFeats) {
    const def = FEATS[daily];
    if (!def || !def.modeled) issues.push({ kind: "limit", message: `Боевая гибкость: «${def?.name ?? daily}» на сегодня не меняет расчёт, только карточку.` });
  }

  const con = mod(scores.con.score);
  const str = mod(scores.str.score);
  const dex = mod(scores.dex.score);
  const wis = mod(scores.wis.score);
  const key = mod(scores[progress.keyAbility].score);
  const toughness = taken.has("toughness");
  const fleet = taken.has("fleet");
  const drained = input.conditions?.drained ?? 0;
  const ancestry = ANCESTRIES.find((item) => item.id === progress.ancestryId);
  const cls = CLASSES.find((item) => item.id === progress.classId);
  const ancestryHp = ancestry?.hp ?? 8;
  const classHp = cls?.hp ?? 8;
  const hpValue = ancestryHp + (classHp + con) * level + (toughness ? level : 0) - drained * level;
  const hpParts = [
    `народ ${ancestryHp}`,
    `(${classHp} класса + Телосложение ${fmt(con)}) × ${level}`,
  ];
  if (toughness) hpParts.push(`Живучесть ${fmt(level)}`);
  if (drained) hpParts.push(`истощение ${fmt(-drained * level)}`);

  const armor = equippedArmor(input.items);
  const armorPenalty = Boolean(armor?.armor && armor.armor.strReq && scores.str.score < armor.armor.strReq);
  const speedPenalty = armorPenalty ? armor?.armor?.speedPenalty ?? 0 : 0;
  const bulk = bulkOf(input.items);
  const hefty = taken.has("hefty") ? 2 : 0;
  const encLimit = 5 + str + hefty;
  const encumbered = bulk > encLimit;
  let speed = (ancestry?.speed ?? 25) + (fleet ? 5 : 0) - speedPenalty - (encumbered ? 10 : 0) - curse.speedPenalty;
  const speedParts = [`база ${ancestry?.speed ?? 25}`];
  if (fleet) speedParts.push("Быстроногий +5");
  if (speedPenalty) speedParts.push(`доспех −${speedPenalty}`);
  if (encumbered) speedParts.push("перегрузка −10");
  if (curse.speedPenalty) speedParts.push(`проклятие −${curse.speedPenalty}`);

  const canny = cannyDefense(byId, level);
  const ranksNow = resolveRanks(progress, level, armor?.armor?.category ?? "unarmored", canny);
  for (const note of ranksNow.notes) issues.push({ kind: "limit", message: note });
  const saves = { fort: ranksNow.fort, ref: ranksNow.ref, will: ranksNow.will, perception: ranksNow.perception };
  const perceptionRank = saves.perception;
  const armorRank = ranksNow.armor;
  const dexCap = armor?.armor?.dexCap;
  const dexToAc = dexCap == null ? dex : Math.min(dex, dexCap);
  const acParts: string[] = ["10", `Ловкость ${fmt(dexToAc)}${dexCap != null && dex > dexCap ? ` (предел ${fmt(dexCap)})` : ""}`, `уровень ${level}`, `${RANK_WORD[armorRank]} ${fmt(RANK_EXTRA[armorRank])}`];
  let ac = 10 + dexToAc + rankBonus(armorRank, level);
  const armorItem = (armor?.armor?.bonus ?? 0) + (armor?.runes?.potency ?? 0);
  if (armorItem) {
    ac += armorItem;
    acParts.push(`${armor?.name ?? "доспех"} ${fmt(armorItem)}`);
  }
  const aside: string[] = [];
  const parryOk = toggles.has("dueling-parry") && taken.has("dueling-parry") && parryReady(input.items);
  const equippedShield = input.items.find((item) => item.kind === "shield" && inHands(item));
  const shieldBonus = input.shieldRaised ? equippedShield?.shield?.acBonus ?? 2 : 0;
  if (taken.has("dueling-parry") && !parryOk) {
    aside.push("Дуэльное парирование +2 обстоятельственных к КБ не входит в обычный класс брони. Оно действует, только когда включено и в руках одно одноручное оружие ближнего боя, вторая рука свободна и щит не поднят.");
  }
  if (parryOk || shieldBonus) {
    const bonus = Math.max(parryOk ? 2 : 0, shieldBonus);
    ac += bonus;
    if (parryOk && shieldBonus) acParts.push(`парирование или щит ${fmt(bonus)} (один обстоятельственный)`);
    else if (parryOk) acParts.push("дуэльное парирование +2");
    else acParts.push(`поднятый щит ${fmt(shieldBonus)}`);
  }
  const clumsyAc = Math.max(input.conditions?.clumsy ?? 0, curse.clumsy);
  if (clumsyAc) {
    ac -= clumsyAc;
    acParts.push(`неуклюжий −${clumsyAc}`);
  }

  const statusPenalty = Math.max(input.conditions?.frightened ?? 0, input.conditions?.sickened ?? 0);
  const checkPenalty = armorPenalty ? armor?.armor?.checkPenalty ?? 0 : 0;

  const skills: Record<string, SkillStat> = {};
  const skillIds = new Set<string>([...SKILLS.map((skill) => skill.id), ...ranks.keys()]);
  for (const id of skillIds) {
    const ability = skillAbility(id);
    const rank = ranks.get(id) ?? "untrained";
    let value = mod(scores[ability].score) + rankBonus(rank, level);
    const parts = [`${ABILITY_NAME[ability]} ${fmt(mod(scores[ability].score))}`, `уровень ${level}`, `${RANK_WORD[rank]} ${fmt(RANK_EXTRA[rank])}`];
    if (rank === "untrained") {
      value = mod(scores[ability].score);
      parts.splice(1, 2, "необучен +0");
    }
    if (checkPenalty && (ability === "str" || ability === "dex") && rank !== "untrained") {
      value -= checkPenalty;
      parts.push(`штраф доспеха −${checkPenalty}`);
    }
    const clumsy = ability === "dex" ? Math.max(input.conditions?.clumsy ?? 0, curse.clumsy) : 0;
    const enfeebled = ability === "str" ? Math.max(input.conditions?.enfeebled ?? 0, curse.enfeebled) : 0;
    const localStatus = Math.max(statusPenalty, clumsy, enfeebled);
    if (localStatus) {
      value -= localStatus;
      parts.push(`штраф состояния −${localStatus}`);
    }
    skills[id] = { value, rank, ability, formula: line(skillName(id, loreNames), value, parts), aside: [] };
  }

  const resilient = armor?.runes?.resilient ?? 0;
  const saveStats = {
    fort: saveStat("Стойкость", "con", saves.fort, scores, level, statusPenalty, input.conditions?.drained ?? 0, curse.fortPenalty, resilient),
    ref: saveStat("Рефлексы", "dex", saves.ref, scores, level, Math.max(statusPenalty, clumsyAc), 0, 0, resilient),
    will: saveStat("Воля", "wis", saves.will, scores, level, statusPenalty, Math.max(input.conditions?.stupefied ?? 0, curse.stupefied), curse.willPenalty, resilient),
  };
  if (progress.classId === "fighter" && level >= 3) saveStats.will.aside.push("Храбрость: успех против страха становится критическим успехом, значение испуга снижается на 1.");
  if (canny === "will" && level >= 17) saveStats.will.aside.push("Дальновидность поднимает волю до мастера на 17 уровне. Храбрость сама даёт только эксперта.");
  if (progress.classId === "fighter" && level >= 9) saveStats.fort.aside.push("Закалка в бою: успех стойкости становится критическим успехом.");
  if (progress.classId === "fighter" && level >= 15) saveStats.ref.aside.push("Крепкие рефлексы: успех становится критическим успехом.");

  const perceptionValue = wis + rankBonus(perceptionRank, level) - statusPenalty - curse.perceptionPenalty;
  const perceptionParts = [`Мудрость ${fmt(wis)}`, `уровень ${level}`, `${RANK_WORD[perceptionRank]} ${fmt(RANK_EXTRA[perceptionRank])}`];
  if (statusPenalty) perceptionParts.push(`штраф состояния −${statusPenalty}`);
  if (curse.perceptionPenalty) perceptionParts.push(`проклятие −${curse.perceptionPenalty}`);
  const initBonus = progress.classId === "fighter" && level >= 7 ? 2 : 0;
  const initParts = [`Восприятие ${fmt(perceptionValue)}`];
  if (initBonus) initParts.push("обзор поля боя +2");

  const classRank: Rank = ranksNow.classDc;
  const classDc = cls ? 10 + key + rankBonus(classRank, level) - statusPenalty : null;

  const rage = rageDamage(progress, level, toggles, path, issues);
  const attacks = input.items.filter((item) => item.kind === "weapon").map((item) => {
    const category = item.weapon?.category ?? "martial";
    const group = item.weapon?.group ?? GROUPS[item.catalogId ?? ""] ?? "other";
    const bomb = /bomb|бомб/i.test(`${item.weapon?.traits ?? ""} ${item.weapon?.group ?? ""} ${item.name}`);
    const rank = ranksNow.weaponRank(category, group, bomb);
    const ability = item.weapon?.attr === "dex" ? dex : item.weapon?.attr === "finesse" ? Math.max(str, dex) : str;
    const abilityName = item.weapon?.attr === "dex" ? "Ловкость" : item.weapon?.attr === "finesse" && dex > str ? "Ловкость" : "Сила";
    const potency = item.runes?.potency ?? 0;
    const rangedCurse = item.weapon?.ranged ? curse.rangedPenalty : 0;
    let attack = ability + rankBonus(rank, level) + potency - statusPenalty - rangedCurse;
    const parts = [`${abilityName} ${fmt(ability)}`, `уровень ${level}`, `${RANK_WORD[rank]} ${fmt(RANK_EXTRA[rank])}`];
    if (potency) parts.push(`руна мощи ${fmt(potency)}`);
    if (statusPenalty) parts.push(`штраф состояния −${statusPenalty}`);
    if (rangedCurse) parts.push(`встречный ветер −${rangedCurse}`);
    const spec = ranksNow.specialization(rank);
    const striking = item.runes?.striking ?? 0;
    const dice = strikeDice(item.weapon?.damage ?? "1d4", striking);
    const property = item.runes?.property ?? [];
    const ragePart = item.weapon?.ranged ? 0 : rage;
    const damageMod = (item.weapon?.attr === "dex" ? 0 : str) + spec + ragePart;
    return {
      name: item.name,
      group,
      category,
      rank,
      equipped: item.equipped,
      attack: { value: attack, formula: line(item.name, attack, parts), aside: [...(item.equipped ? [] : ["Оружие не в руках и не надето: бонус показан так, как если его взять."]), ...(property.length ? [`Свойства: ${property.map((rune) => rune.name).join(", ")}. Их карточка в число удара не входит.`] : [])] },
      damage: `${dice}${damageMod ? ` ${fmt(damageMod)}` : ""}${ragePart ? ` (ярость ${fmt(ragePart)})` : ""}${spec ? ` (специализация ${fmt(spec)})` : ""}`,
    };
  });

  const adjusted = applyCustomEffects({
    ac,
    acParts,
    speed,
    speedParts,
    hp: hpValue,
    hpParts,
    issues,
    effects: input.customEffects ?? [],
    circumstance: Math.max(parryOk ? 2 : 0, shieldBonus),
    item: armorItem,
  });

  const actions = actionsFor(taken, progress.classId);

  return {
    level,
    abilities: Object.fromEntries(ABILITIES.map((ability) => {
      const state = scores[ability];
      return [ability, {
        score: state.score,
        mod: mod(state.score),
        partial: state.partial,
        formula: `${ABILITY_NAME[ability]} ${state.score} (${fmt(mod(state.score))})${state.partial ? ". Есть незакрытое частичное повышение: модификатор вырастет со следующим повышением этой характеристики." : ""}`,
      }];
    })) as Derived["abilities"],
    hp: { value: adjusted.hp, formula: line("ПЗ", adjusted.hp, adjusted.hpParts), aside: [] },
    ac: { value: adjusted.ac, formula: line("КБ", adjusted.ac, adjusted.acParts), aside },
    speed: { value: adjusted.speed, formula: line("Скорость", adjusted.speed, adjusted.speedParts).replace("+", ""), aside: [] },
    perception: { value: perceptionValue, rank: perceptionRank, formula: line("Восприятие", perceptionValue, perceptionParts), aside: [] },
    initiative: { value: perceptionValue + initBonus, formula: line("Инициатива", perceptionValue + initBonus, initParts), aside: initBonus ? ["+2 обстоятельственных только к инициативе, не ко всем проверкам Восприятия."] : [] },
    saves: saveStats,
    skills,
    classDc: classDc == null ? null : { value: classDc, rank: classRank, formula: line("Классовая СЛ", classDc, [`10`, `${ABILITY_NAME[progress.keyAbility]} ${fmt(key)}`, `уровень ${level}`, `${RANK_WORD[classRank]} ${fmt(RANK_EXTRA[classRank])}`]), aside: [] },
    spell: ranksNow.spell === "untrained" ? null : {
      value: 10 + key + rankBonus(ranksNow.spell, level) - statusPenalty,
      rank: ranksNow.spell,
      formula: line("СЛ заклинаний", 10 + key + rankBonus(ranksNow.spell, level) - statusPenalty, [`10`, `${ABILITY_NAME[progress.keyAbility]} ${fmt(key)}`, `уровень ${level}`, `${RANK_WORD[ranksNow.spell]} ${fmt(RANK_EXTRA[ranksNow.spell])}`]),
      aside: [],
    },
    attacks,
    load: { bulk, limit: encLimit, max: 10 + str + hefty, encumbered },
    issues: adjusted.issues,
    feats,
    actions,
  };
}

export function effectsFrom(character: { feats: FeatInst[]; features: FeatureInst[] }): StructuredEffect[] {
  const list: StructuredEffect[] = [];
  for (const feat of character.feats) {
    if (!feat.custom) continue;
    if (!feat.effects?.length) list.push({ label: feat.name, target: "hp", type: "untyped", value: 0, implemented: false });
    else for (const effect of feat.effects) list.push({ ...effect, label: effect.label || feat.name });
  }
  for (const feature of character.features) {
    if (!feature.custom) continue;
    if (!feature.effects?.length) list.push({ label: feature.name, target: "hp", type: "untyped", value: 0, implemented: false });
    else for (const effect of feature.effects) list.push({ ...effect, label: effect.label || feature.name });
  }
  return list;
}

export function trainedSkills(derived: Derived): string[] {
  return Object.entries(derived.skills).filter(([, skill]) => skill.rank !== "untrained").map(([id]) => id);
}

function line(name: string, value: number, parts: string[]): string {
  return `${name} ${fmt(value)} = ${parts.join(" + ").replaceAll("+ −", "− ").replaceAll("+ -", "− ")}`;
}

function rankBonus(rank: Rank, level: number): number {
  if (rank === "untrained") return 0;
  return level + RANK_EXTRA[rank];
}

function atLeast(current: Rank, target: Rank): Rank {
  return RANK_ORDER.indexOf(current) >= RANK_ORDER.indexOf(target) ? current : target;
}

function stepUp(current: Rank, level: number): { rank: Rank } | { error: string } {
  const index = RANK_ORDER.indexOf(current);
  if (index >= RANK_ORDER.length - 1) return { error: "навык уже легендарный, повышать некуда" };
  const next = RANK_ORDER[index + 1];
  if (next === "master" && level < 7) return { error: "до мастера повышают с 7 уровня" };
  if (next === "legendary" && level < 15) return { error: "до легенды повышают с 15 уровня" };
  return { rank: next };
}

function train(ranks: Map<string, Rank>, id: string) {
  if ((ranks.get(id) ?? "untrained") === "untrained") ranks.set(id, "trained");
}

interface ScoreState {
  score: number;
  partial: boolean;
}

function abilityScores(progress: Pf2eProgress, level: number, issues: Issue[]): Record<Ability, ScoreState> {
  const scores = Object.fromEntries(ABILITIES.map((ability) => [ability, { score: 10, partial: false }])) as Record<Ability, ScoreState>;
  const ancestry = ANCESTRIES.find((item) => item.id === progress.ancestryId);
  for (const ability of ancestry?.boosts ?? []) boost(scores[ability]);
  if (ancestry?.flaw) scores[ancestry.flaw].score = Math.max(8, scores[ancestry.flaw].score - 2);
  const pools: { source: string; level: number; count: number }[] = [
    { source: "ancestry-boost", level: 1, count: ancestry?.freeBoosts ?? 0 },
    { source: "background-boost", level: 1, count: 2 },
    { source: "class-boost", level: 1, count: 1 },
  ];
  for (const boostLevel of [1, 5, 10, 15, 20]) {
    if (boostLevel <= level) pools.push({ source: "free-boost", level: boostLevel, count: 4 });
  }
  const background = backgroundOf(progress.backgroundId);
  for (const pool of pools) {
    if (pool.level > level) continue;
    const picks = progress.choices.filter((choice) => choice.source === pool.source && choice.level === pool.level);
    if (picks.length < pool.count) issues.push({ kind: "build", message: `На уровне ${pool.level} не хватает повышений (${poolLabel(pool.source)}): нужно ${pool.count}.` });
    if (picks.length > pool.count) issues.push({ kind: "build", message: `На уровне ${pool.level} лишние повышения (${poolLabel(pool.source)}).` });
    const seen = new Set<string>();
    for (const choice of picks) {
      if (!ABILITIES.includes(choice.pick as Ability)) {
        issues.push({ kind: "build", message: "Одно повышение указано не на характеристику." });
        continue;
      }
      if (seen.has(choice.pick)) {
        issues.push({ kind: "build", message: `На уровне ${pool.level} характеристика ${ABILITY_NAME[choice.pick as Ability]} повышена в одном наборе дважды.` });
        continue;
      }
      seen.add(choice.pick);
      if (pool.source === "class-boost" && choice.pick !== progress.keyAbility) {
        issues.push({ kind: "build", message: "Классовое повышение уходит в ключевую характеристику." });
      }
      boost(scores[choice.pick as Ability]);
    }
    if (pool.source === "background-boost" && background && picks.length) {
      const allowed = new Set(background.abilities);
      if (!picks.some((choice) => allowed.has(choice.pick as Ability))) {
        issues.push({ kind: "build", message: "Одно повышение происхождения должно быть из его пары характеристик." });
      }
    }
  }
  return scores;
}

function boost(state: ScoreState) {
  if (state.score >= 18) {
    if (state.partial) {
      state.score += 2;
      state.partial = false;
    } else state.partial = true;
  } else state.score += 2;
}

const EVEN_TO_20 = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const ODD_GENERAL = [3, 7, 11, 15, 19];
const ANCESTRY_FEATS = [1, 5, 9, 13, 17];
const ODD_INCREASE = [3, 5, 7, 9, 11, 13, 15, 17, 19];
const EVERY_LEVEL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function classFeatLevels(classId: string): number[] {
  if (["bard", "cleric", "druid", "oracle", "sorcerer", "witch", "wizard"].includes(classId)) return EVEN_TO_20;
  if (["alchemist", "barbarian", "champion", "fighter", "investigator", "monk", "ranger", "rogue", "swashbuckler"].includes(classId)) {
    return [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
  }
  return CLASS_FEAT_LEVELS[classId] ?? [];
}

function skillFeatLevels(classId: string): number[] {
  if (classId === "rogue") return EVERY_LEVEL;
  if (classId === "investigator") return EVERY_LEVEL.filter((at) => at >= 2);
  if (classId === "swashbuckler") return [2, 3, 4, 6, 7, 8, 10, 12, 14, 15, 16, 18, 20];
  const listed = SKILL_FEAT_LEVELS[classId];
  if (listed && listed.length > 0) return listed;
  return EVEN_TO_20;
}

function skillIncreaseLevels(classId: string): number[] {
  if (classId === "rogue" || classId === "investigator") return EVERY_LEVEL.filter((at) => at >= 2);
  return ODD_INCREASE;
}

function slotsFor(progress: Pf2eProgress, level: number): Slot[] {
  const slots: Slot[] = [];
  const push = (id: string, at: number, source: string, label: string) => {
    if (at <= level) slots.push({ id, level: at, source, label });
  };
  const ancestry = ANCESTRIES.find((item) => item.id === progress.ancestryId);
  for (let i = 0; i < (ancestry?.freeBoosts ?? 0); i += 1) push(`boost-1-ancestry-${i}`, 1, "ancestry-boost", "Свободное повышение народа");
  push("boost-1-background-0", 1, "background-boost", "Повышение происхождения");
  push("boost-1-background-1", 1, "background-boost", "Свободное повышение происхождения");
  push("boost-1-class", 1, "class-boost", "Классовое повышение");
  for (const boostLevel of [1, 5, 10, 15, 20]) {
    for (let i = 0; i < 4; i += 1) push(`boost-${boostLevel}-free-${i}`, boostLevel, "free-boost", "Свободное повышение");
  }
  const scores = abilityScores(progress, 1, []);
  const extra = (CLASSES.find((item) => item.id === progress.classId)?.extraSkills ?? 0) + Math.max(0, mod(scores.int.score));
  if (progress.classId === "fighter") push("class-skill-primary", 1, "class-skill", "Навык класса: Атлетика или Акробатика");
  for (let i = 0; i < extra; i += 1) push(`class-skill-extra-${i}`, 1, "class-skill", "Дополнительный навык класса");
  if (progress.heritageId === "skilled") push("heritage-skill", 1, "heritage-skill", "Навык умелого наследия");
  if (progress.classId === "barbarian") push("class-path", 1, "instinct", "Инстинкт");
  if (progress.classId === "swashbuckler") push("class-path", 1, "style", "Стиль");
  if (progress.classId === "oracle") push("class-path", 1, "mystery", "Тайна");
  const fury = progress.choices.some((choice) => choice.source === "instinct" && choice.pick === "fury-instinct" && choice.level <= level);
  if (fury) push("fury-feat", 1, "class-feat", "Черта класса от инстинкта ярости");
  for (const at of classFeatLevels(progress.classId)) push(`class-feat-${at}`, at, "class-feat", "Черта класса");
  if (progress.classId === "fighter") push("weapon-group", 5, "weapon-group", "Группа оружия мастера");
  if (progress.classId === "cleric") push("doctrine", 1, "doctrine", "Доктрина");
  if (progress.classId === "monk") {
    push("monk-save-7", 7, "monk-save", "Путь к совершенству");
    push("monk-save-11", 11, "monk-save", "Второй путь к совершенству");
    push("monk-save-15", 15, "monk-save", "Третий путь к совершенству");
  }
  for (const at of skillFeatLevels(progress.classId)) push(`skill-feat-${at}`, at, "skill-feat", "Черта навыка");
  for (const at of ODD_GENERAL) push(`general-feat-${at}`, at, "general-feat", "Общая черта");
  for (const at of ANCESTRY_FEATS) push(`ancestry-feat-${at}`, at, "ancestry-feat", "Черта народа");
  for (const at of skillIncreaseLevels(progress.classId)) push(`skill-increase-${at}`, at, "skill-increase", "Повышение навыка");
  if (progress.freeArchetype) {
    for (const at of EVEN_TO_20) push(`free-archetype-${at}`, at, "free-archetype", "Свободный архетип");
  }
  return slots;
}

function backgroundOf(id: string): { abilities: Ability[]; skill: string; lore: string; feat: string } | null {
  const found = BACKGROUNDS.find((item) => item.id === id);
  if (!found) return null;
  return { abilities: found.abilities, skill: found.skill, lore: found.lore, feat: found.feat };
}

function isSkillId(id: string): boolean {
  return SKILLS.some((skill) => skill.id === id) || id.startsWith("lore:");
}

function skillName(id: string, lore: Map<string, string>): string {
  return SKILLS.find((skill) => skill.id === id)?.name ?? lore.get(id) ?? (id.startsWith("lore:") ? "знание" : "неизвестный навык");
}

const POOL_LABEL: Record<string, string> = {
  "ancestry-boost": "повышения народа",
  "background-boost": "повышения происхождения",
  "class-boost": "классовое повышение",
  "free-boost": "свободные повышения",
};

function poolLabel(source: string): string {
  return POOL_LABEL[source] ?? "повышения";
}

const DETAIL_NAME: Record<string, string> = {
  fort: "Стойкость",
  ref: "Рефлексы",
  will: "Воля",
  perception: "Восприятие",
};

function detailWord(value: string): string {
  if (DETAIL_NAME[value]) return DETAIL_NAME[value];
  if (ABILITIES.includes(value as Ability)) return ABILITY_NAME[value as Ability];
  const skill = SKILLS.find((item) => item.id === value);
  if (skill) return skill.name;
  if (FEATS[value]) return FEATS[value].name;
  if (value.startsWith("lore:")) return "знание";
  return "";
}

/** Русская подпись выбора. Код выбора на экран не выводится. */
export function choiceCaption(choice: { pick: string; source: string; detail?: Record<string, string> }): string {
  const named = FEATS[choice.pick]?.name
    ?? FEAT_BY_ID.get(choice.pick)?.name
    ?? pathOption(choice.source, choice.pick)?.name
    ?? optionsForSlot(choice.source).find((option) => option.pick === choice.pick)?.name
    ?? (choice.pick.startsWith("lore:") ? "знание" : "выбор");
  if (!choice.detail) return named;
  const bits = Object.values(choice.detail).map(detailWord).filter((word) => word.length > 0);
  return bits.length ? `${named} (${bits.join(", ")})` : named;
}

function skillAbility(id: string): Ability {
  return SKILLS.find((skill) => skill.id === id)?.ability ?? (id.startsWith("lore:") ? "int" : "str");
}

function grantFeat(id: string, feats: { id: string; name: string; modeled: boolean }[], taken: Set<string>, issues: Issue[], ranks: Map<string, Rank>) {
  if (!id || taken.has(id)) return;
  const def = FEATS[id];
  if (!def) {
    issues.push({ kind: "limit", message: "Черта есть в листе, но справочник приложения её не знает." });
    taken.add(id);
    feats.push({ id, name: "черта без имени", modeled: false });
    return;
  }
  if (def.skill && (ranks.get(def.skill) ?? "untrained") === "untrained") {
    issues.push({ kind: "build", message: `«${def.name}» требует обученный навык ${skillName(def.skill, new Map())}.` });
  }
  taken.add(id);
  feats.push({ id, name: def.name, modeled: def.modeled });
}

function hasFeat(byId: Map<string, BuildChoice>, pick: string, level: number): boolean {
  return [...byId.values()].some((choice) => choice.pick === pick && choice.level <= level);
}

function medicOk(ranks: Map<string, Rank>, taken: Set<string>, issues: Issue[], report: boolean): boolean {
  const trained = (ranks.get("medicine") ?? "untrained") !== "untrained";
  const battle = taken.has("battle-medicine");
  if (report && !trained) issues.push({ kind: "build", message: "Посвящение медика: нужна обученная Медицина." });
  if (report && !battle) issues.push({ kind: "build", message: "Посвящение медика: нужна черта «Боевая медицина»." });
  return trained && battle;
}

function applyFeatChoice(
  choice: BuildChoice,
  progress: Pf2eProgress,
  ranks: Map<string, Rank>,
  loreNames: Map<string, string>,
  feats: { id: string; name: string; modeled: boolean }[],
  taken: Set<string>,
  issues: Issue[],
  archetypeFeats: { id: string; level: number }[],
  scores: Record<Ability, ScoreState>,
) {
  const def = resolveFeat(choice.pick);
  if (choice.source === "weapon-group") return;
  if (!def) {
    issues.push({ kind: "build", message: `Неизвестная черта на уровне ${choice.level}.` });
    return;
  }
  if (def.level > choice.level) issues.push({ kind: "build", message: `«${def.name}» уровня ${def.level}, слот только ${choice.level}.` });
  const kindOk =
    (choice.source === "ancestry-feat" && def.kind === "ancestry") ||
    (choice.source === "class-feat" && (def.kind === "class" || def.kind === "archetype")) ||
    (choice.source === "skill-feat" && def.kind === "skill") ||
    (choice.source === "general-feat" && def.kind === "general") ||
    (choice.source === "free-archetype" && def.kind === "archetype");
  if (!kindOk) issues.push({ kind: "build", message: `«${def.name}» не подходит этому слоту.` });
  if (choice.source === "class-feat" && def.kind === "class" && def.classes && def.classes.length > 0 && !def.classes.includes(progress.classId)) {
    issues.push({ kind: "build", message: `«${def.name}» — черта другого класса.` });
  }
  if (choice.source === "ancestry-feat" && def.ancestries && def.ancestries.length > 0 && !def.ancestries.includes(progress.ancestryId)) {
    issues.push({ kind: "build", message: `«${def.name}» — черта другого народа.` });
  }
  if (taken.has(choice.pick) && !def.repeatable) issues.push({ kind: "build", message: `«${def.name}» уже есть, повторно её не берут.` });
  if (def.skill && (ranks.get(def.skill) ?? "untrained") === "untrained") {
    issues.push({ kind: "build", message: `«${def.name}» требует обученность: ${skillName(def.skill, loreNames)}.` });
  }
  if (def.knowledge) {
    const knows = [...ranks.entries()].some(([id, rank]) => rank !== "untrained" && (KNOWLEDGE.has(id) || id.startsWith("lore:")));
    if (!knows) issues.push({ kind: "build", message: `«${def.name}» требует обученный навык знания.` });
  }
  if (choice.pick === "assurance") {
    const skill = choice.detail?.skill ?? "";
    if ((ranks.get(skill) ?? "untrained") === "untrained") issues.push({ kind: "build", message: "Уверенность берётся в навыке, которым вы обучены." });
    if (feats.some((feat) => feat.id === "assurance" && choice.detail?.skill && feat.name.includes(skill))) {
      /* повтор по навыку ловится ниже через ключ */
    }
    const key = `assurance:${skill}`;
    if (taken.has(key)) issues.push({ kind: "build", message: `Уверенность в навыке ${skillName(skill, loreNames)} уже взята.` });
    taken.add(key);
  }
  if (choice.pick === "canny-acumen" && !["fort", "ref", "will", "perception"].includes(choice.detail?.defense ?? "")) {
    issues.push({ kind: "build", message: "Дальновидность: выберите стойкость, рефлексы, волю или восприятие." });
  }
  if (choice.pick === "continual-recovery" && RANK_ORDER.indexOf(ranks.get("medicine") ?? "untrained") < RANK_ORDER.indexOf("expert")) {
    issues.push({ kind: "build", message: "Непрерывное лечение требует эксперта Медицины." });
  }
  if (def.kind === "archetype" && choice.pick.endsWith("dedication")) {
    const open = openDedication(archetypeFeats);
    if (open) issues.push({ kind: "build", message: `Новое посвящение «${def.name}» раньше двух других черт архетипа «${open}».` });
    if (choice.pick === "medic-dedication") medicOk(ranks, taken, issues, true);
    if (choice.pick === "rogue-dedication") {
      if (mod(scores.dex.score) < 2) issues.push({ kind: "build", message: "Посвящение плута требует Ловкость +2." });
      const primary = choice.detail?.primary ?? "";
      const extra = choice.detail?.extra ?? "";
      const both = (ranks.get("stealth") ?? "untrained") !== "untrained" && (ranks.get("thievery") ?? "untrained") !== "untrained";
      if (!both && primary !== "stealth" && primary !== "thievery") issues.push({ kind: "build", message: "Посвящение плута: выберите Скрытность или Воровство." });
      for (const skill of [primary, extra]) {
        if (!skill || !isSkillId(skill)) issues.push({ kind: "build", message: "Посвящение плута: укажите два навыка, которые оно обучает." });
        else if ((ranks.get(skill) ?? "untrained") !== "untrained") issues.push({ kind: "build", message: `Посвящение плута не может обучить ${skillName(skill, loreNames)}: навык уже есть. Это не два лишних навыка сверх правила.` });
        else train(ranks, skill);
      }
      const feat = choice.detail?.feat ?? "";
      if (feat) grantFeat(feat, feats, taken, issues, ranks);
    }
  }
  if (choice.pick === "doctors-visitation" || choice.pick === "treat-condition") {
    if (!taken.has("medic-dedication")) issues.push({ kind: "build", message: `«${def.name}» требует посвящение медика.` });
  }
  if (choice.pick === "skill-mastery" && !taken.has("rogue-dedication")) {
    issues.push({ kind: "build", message: "Мастерство навыка требует посвящение плута." });
  }
  if (["basic-trickery", "sneak-attacker", "uncanny-dodge", "evasiveness", "tactical-entry"].includes(choice.pick) && !taken.has("rogue-dedication")) {
    issues.push({ kind: "build", message: `«${def.name}» требует посвящение плута.` });
  }
  if (!taken.has(choice.pick) || def.repeatable) {
    if (choice.pick !== "assurance") taken.add(choice.pick);
    feats.push({ id: choice.pick, name: def.name, modeled: def.modeled });
  }
  if (def.kind === "archetype") archetypeFeats.push({ id: choice.pick, level: choice.level });
}

function openDedication(feats: { id: string; level: number }[]): string | null {
  let current = "";
  let follow = 0;
  for (const feat of feats) {
    if (feat.id.endsWith("dedication")) {
      if (current && follow < 2) return current;
      current = feat.id;
      follow = 0;
    } else if (current) follow += 1;
  }
  return current && follow < 2 ? current : null;
}

function applySkillMastery(
  choice: BuildChoice,
  ranks: Map<string, Rank>,
  loreNames: Map<string, string>,
  feats: { id: string; name: string; modeled: boolean }[],
  taken: Set<string>,
  issues: Issue[],
  level: number,
) {
  if (!taken.has("rogue-dedication") && choice.pick === "skill-mastery") {
    /* сообщение уже поставлено при черте */
  }
  const used = feats.filter((feat) => feat.id === "skill-mastery").length;
  if (used > 5) {
    issues.push({ kind: "build", message: "Мастерство навыка берётся не больше пяти раз." });
    return;
  }
  const toMaster = choice.detail?.toMaster ?? "";
  const toExpert = choice.detail?.toExpert ?? "";
  const before = new Set([...ranks.entries()].filter(([, rank]) => rank !== "untrained").map(([id]) => id));
  if ((ranks.get(toMaster) ?? "untrained") !== "expert") {
    issues.push({ kind: "build", message: `Мастерство навыка: ${skillName(toMaster, loreNames) || "первый навык"} должен быть экспертом, чтобы стать мастером. Черта не выдаёт новый навык.` });
  } else if (level < 7) issues.push({ kind: "build", message: "Мастерство навыка не поднимает до мастера раньше 7 уровня." });
  else ranks.set(toMaster, "master");
  if ((ranks.get(toExpert) ?? "untrained") !== "trained") {
    issues.push({ kind: "build", message: `Мастерство навыка: ${skillName(toExpert, loreNames) || "второй навык"} должен быть обученным, чтобы стать экспертом. Черта не выдаёт два дополнительных навыка.` });
  } else ranks.set(toExpert, "expert");
  const after = new Set([...ranks.entries()].filter(([, rank]) => rank !== "untrained").map(([id]) => id));
  for (const id of after) {
    if (!before.has(id)) issues.push({ kind: "build", message: "Мастерство навыка плута не должно добавлять новый обученный навык." });
  }
  const feat = choice.detail?.feat ?? "";
  if (!feat) issues.push({ kind: "build", message: "Мастерство навыка даёт связанную черту навыка. Выберите её." });
  else grantFeat(feat, feats, taken, issues, ranks);
}

function cannyDefense(byId: Map<string, BuildChoice>, level: number): string {
  const choice = [...byId.values()].find((item) => item.pick === "canny-acumen" && item.level <= level);
  return choice?.detail?.defense ?? "";
}

function strikeDice(dice: string, extra: number): string {
  if (extra <= 0) return dice;
  return dice.replace(/^(\d+)d(\d+)/, (_, count: string, faces: string) => `${Number(count) + extra}d${faces}`);
}

function equippedArmor(items: ItemInst[]): ItemInst | undefined {
  return items.find((item) => item.kind === "armor" && item.equipped);
}

function inHands(item: ItemInst): boolean {
  if (item.kind !== "weapon" && item.kind !== "shield") return false;
  if (item.placement === "stowed" || item.placement === "worn") return false;
  if (item.placement === "held") return true;
  return item.equipped;
}

function parryReady(items: ItemInst[]): boolean {
  const hands = items.filter(inHands);
  if (hands.some((item) => item.kind === "shield")) return false;
  const weapons = hands.filter((item) => item.kind === "weapon");
  if (weapons.length !== 1) return false;
  const weapon = weapons[0];
  if (weapon.weapon?.ranged || weapon.weapon?.twoHanded || weapon.weapon?.hands === 2) return false;
  return true;
}

function bulkOf(items: ItemInst[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.qty * item.weight, 0) * 10) / 10;
}

function saveStat(name: string, ability: Ability, rank: Rank, scores: Record<Ability, ScoreState>, level: number, penalty: number, extra: number, flat = 0, itemBonus = 0): SkillStat {
  const abilityMod = mod(scores[ability].score);
  const totalPenalty = Math.max(penalty, extra) + flat;
  const value = abilityMod + rankBonus(rank, level) - totalPenalty + itemBonus;
  const parts = [`${ABILITY_NAME[ability]} ${fmt(abilityMod)}`, `уровень ${level}`, `${RANK_WORD[rank]} ${fmt(RANK_EXTRA[rank])}`];
  if (Math.max(penalty, extra)) parts.push(`штраф −${Math.max(penalty, extra)}`);
  if (flat) parts.push(`проклятие −${flat}`);
  if (itemBonus) parts.push(`руна устойчивости +${itemBonus}`);
  return { value, rank, ability, formula: line(name, value, parts), aside: [] };
}

function applyCustomEffects(input: {
  ac: number;
  acParts: string[];
  speed: number;
  speedParts: string[];
  hp: number;
  hpParts: string[];
  issues: Issue[];
  effects: StructuredEffect[];
  circumstance: number;
  item: number;
}) {
  let { ac, speed, hp, circumstance, item } = input;
  const acParts = [...input.acParts];
  const speedParts = [...input.speedParts];
  const hpParts = [...input.hpParts];
  const issues = input.issues;
  let status = 0;
  for (const effect of input.effects) {
    if (!effect.implemented) {
      issues.push({ kind: "limit", message: `«${effect.label}»: свой эффект не реализован, в число не входит. Описание не разбиралось.` });
      continue;
    }
    if (effect.target === "ac" && effect.type === "untyped") {
      ac += effect.value;
      acParts.push(`${effect.label} ${fmt(effect.value)}`);
    } else if (effect.target === "ac" && effect.type === "item" && effect.value > item) {
      ac += effect.value - item;
      item = effect.value;
      acParts.push(`${effect.label} ${fmt(effect.value)}`);
    } else if (effect.target === "ac" && effect.type === "circumstance" && effect.value > circumstance) {
      ac += effect.value - circumstance;
      circumstance = effect.value;
      acParts.push(`${effect.label} ${fmt(effect.value)}`);
    } else if (effect.target === "ac" && effect.type === "status" && effect.value > status) {
      ac += effect.value - status;
      status = effect.value;
      acParts.push(`${effect.label} ${fmt(effect.value)}`);
    } else if (effect.target === "ac" && (effect.type === "item" || effect.type === "circumstance" || effect.type === "status")) {
      acParts.push(`${effect.label} ${fmt(effect.value)} не превысил бонус того же типа`);
    } else if (effect.target === "speed" && effect.type === "untyped") {
      speed += effect.value;
      speedParts.push(`${effect.label} ${fmt(effect.value)}`);
    } else if (effect.target === "hp" && effect.type === "untyped") {
      hp += effect.value;
      hpParts.push(`${effect.label} ${fmt(effect.value)}`);
    } else {
      issues.push({ kind: "limit", message: `«${effect.label}»: этот тип бонуса к показателю приложение не складывает, число не изменено.` });
    }
  }
  return { ac, acParts, speed, speedParts, hp, hpParts, issues };
}

function actionsFor(taken: Set<string>, classId: string): Derived["actions"] {
  const actions: Derived["actions"] = [
    {
      id: "strike",
      name: "Удар",
      cost: "1 действие",
      traits: "атака",
      effect: "Одна атака оружием. Следующие удары в раунде получают штраф −5, затем −10. Модификатор показан до броска. Справка действие не тратит.",
    },
  ];
  if (classId === "fighter") {
    actions.push({
      id: "reactive-strike",
      name: "Внеочередная атака",
      cost: "реакция",
      traits: "воин",
      effect: "Существо в вашей досягаемости двигается или манипулирует предметом — вы бьёте. Тратит реакцию и повышает штраф повторной атаки. Досягаемость и триггер приложение не проверяет.",
    });
  }
  if (taken.has("knockdown")) {
    actions.push({
      id: "knockdown",
      name: "Нокдаун",
      cost: "2 действия",
      traits: "воин, усилие",
      effect: "Удар, и при попадании попытка сбить с ног. Черта «усилие»: только один такой приём за раунд.",
    });
  }
  if (taken.has("battle-medicine")) {
    actions.push({
      id: "battle-medicine",
      name: "Боевая медицина",
      cost: "1 действие",
      traits: "лечение, манипуляция, навык",
      effect: "Проверка Медицины как Лечение ран. Цель получает иммунитет к вашей Боевой медицине на 1 день. Справка не тратит иммунитет.",
    });
  }
  if (taken.has("doctors-visitation")) {
    actions.push({
      id: "doctors-visitation-1",
      name: "Визит доктора",
      cost: "1 действие",
      traits: "архетип, усилие",
      effect: "Шаг на Скорость, затем Боевая медицина или Лечение яда. За раунд только одно действие с чертой «усилие».",
    });
    actions.push({
      id: "doctors-visitation-2",
      name: "Визит доктора",
      cost: "2 действия",
      traits: "архетип, усилие",
      effect: "Шаг на Скорость, затем Первая помощь или Лечение состояния, если черта есть. Та же черта «усилие»: второй визит в этот раунд нельзя.",
    });
  }
  if (taken.has("dueling-parry")) {
    actions.push({
      id: "dueling-parry",
      name: "Дуэльное парирование",
      cost: "1 действие",
      traits: "воин",
      effect: "+2 обстоятельственных к КБ до начала вашего следующего хода. Не прибавляется к обычному КБ, пока действие не включено на листе.",
    });
  }
  return actions;
}

export function buildIssues(input: DeriveInput): Issue[] {
  return derive(input).issues;
}

export function slotsForProgress(progress: Pf2eProgress, level: number): { id: string; level: number; source: string; label: string }[] {
  return slotsFor(progress, level);
}

function resolveFeat(id: string): FeatDef | null {
  const known = FEATS[id];
  const indexed = FEAT_BY_ID.get(id);
  if (known) return { ...known, classes: indexed?.classes, ancestries: indexed?.ancestries };
  if (!indexed) return null;
  return { name: indexed.name, kind: indexed.kind, level: indexed.level, modeled: false, classes: indexed.classes, ancestries: indexed.ancestries };
}

function rageDamage(progress: Pf2eProgress, level: number, toggles: Set<string>, path: PathOption | undefined, issues: Issue[]): number {
  if (progress.classId !== "barbarian" || !toggles.has("rage")) return 0;
  if (!path || path.rage.length === 0) {
    issues.push({
      kind: "limit",
      message: path
        ? `Инстинкт «${path.name}» не даёт безусловного числа урона ярости. К удару ничего не прибавлено.`
        : "Ярость включена, но инстинкт не даёт числа. Базовое действие ярости в этой выгрузке отдельным полем не лежит.",
    });
    return 0;
  }
  const steps = path.rage.filter((step) => step.minLevel <= level);
  if (!steps.length) {
    issues.push({ kind: "limit", message: `Инстинкт «${path.name}» на этом уровне не поднимает урон ярости. К удару ничего не прибавлено.` });
    return 0;
  }
  return steps[steps.length - 1].value;
}

export function optionsForSlot(source: string, ctx?: { classId?: string; ancestryId?: string; level?: number }): { pick: string; name: string }[] {
  if (source === "ancestry-boost" || source === "background-boost" || source === "class-boost" || source === "free-boost") {
    return ABILITIES.map((ability) => ({ pick: ability, name: ABILITY_NAME[ability] }));
  }
  if (source === "class-skill" || source === "heritage-skill" || source === "skill-increase") {
    return SKILLS.map((skill) => ({ pick: skill.id, name: skill.name }));
  }
  if (source === "monk-save") return monkSaveOptions();
  if (source === "doctrine") return doctrineOptions();
  if (source === "weapon-group") {
    return [
      { pick: "sword", name: "Мечи" },
      { pick: "bow", name: "Луки" },
      { pick: "brawling", name: "Драка" },
      { pick: "axe", name: "Топоры" },
      { pick: "spear", name: "Копья" },
      { pick: "hammer", name: "Молоты" },
    ];
  }
  if (source === "instinct" || source === "style" || source === "mystery") {
    return pathGroup(source)?.options.map((option) => ({ pick: option.id, name: option.name })) ?? [];
  }
  const kind = source === "class-feat" ? "class" : source === "skill-feat" ? "skill" : source === "general-feat" ? "general" : source === "ancestry-feat" ? "ancestry" : source === "free-archetype" ? "archetype" : "";
  const modeled = Object.entries(FEATS).filter(([, def]) => {
    const kindOk = source === "class-feat" ? def.kind === "class" || def.kind === "archetype" : def.kind === kind;
    if (!kindOk) return false;
    if (ctx?.level != null && def.level > ctx.level) return false;
    return true;
  });
  const seen = new Set(modeled.map(([id]) => id));
  const list = modeled
    .filter(([id, def]) => {
      if (source !== "class-feat" || def.kind !== "class" || !ctx?.classId) return true;
      const classes = FEAT_BY_ID.get(id)?.classes ?? [];
      return classes.length === 0 || classes.includes(ctx.classId);
    })
    .map(([id, def]) => ({ pick: id, name: def.name }));
  for (const feat of FEAT_INDEX) {
    if (seen.has(feat.id)) continue;
    const dedication = feat.kind === "archetype" || feat.id.endsWith("-dedication");
    const kindOk = source === "free-archetype" ? dedication : source === "class-feat" ? feat.kind === "class" && !dedication : feat.kind === kind;
    if (!kindOk) continue;
    if (ctx?.level != null && feat.level > ctx.level) continue;
    if (source === "class-feat" && ctx?.classId && feat.classes.length > 0 && !feat.classes.includes(ctx.classId)) continue;
    if (source === "ancestry-feat" && feat.ancestries.length === 0) continue;
    if (source === "ancestry-feat" && ctx?.ancestryId && !feat.ancestries.includes(ctx.ancestryId)) continue;
    seen.add(feat.id);
    list.push({ pick: feat.id, name: feat.name });
  }
  return list.sort((left, right) => left.name.localeCompare(right.name, "ru"));
}

export function snapshot(character: Character): Character {
  if (!character.progress || character.system !== "pf2e") return character;
  const derived = derive({
    progress: character.progress,
    items: character.items,
    conditions: character.conditionValues,
    level: character.level,
    toggles: character.progress.toggles,
    shieldRaised: character.shieldRaised,
    customEffects: effectsFrom(character),
  });
  const abilities = { ...character.abilities };
  for (const ability of ABILITIES) abilities[ability] = derived.abilities[ability].score;
  const skillRanks = { ...character.skillRanks };
  for (const [id, skill] of Object.entries(derived.skills)) skillRanks[id] = skill.rank;
  const max = derived.hp.value;
  return {
    ...character,
    formatVersion: 2,
    abilities,
    skillRanks,
    speed: derived.speed.value,
    perceptionRank: derived.perception.rank,
    classDcRank: derived.classDc?.rank ?? character.classDcRank,
    spellRank: derived.spell?.rank ?? "untrained",
    saves: {
      ...character.saves,
      fort: derived.saves.fort.rank,
      ref: derived.saves.ref.rank,
      will: derived.saves.will.rank,
    },
    hpCurrent: Math.min(character.hpCurrent, max),
  };
}
