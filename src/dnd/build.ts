import { fullSlots, GENERAL_FEATS, halfSlots, ITEMS, ORIGIN_FEATS, pactSlots, SKILLS, STYLE_FEATS } from "../data/dnd5e";
import {
  ABILITY_NAME,
  type Ability,
  type BuildChoice,
  type Character,
  type DndProgress,
  type FeatInst,
  type FeatureInst,
  type ItemInst,
  type StructuredEffect,
  fmt,
  mod,
} from "../types";

const ABILITIES: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];

export interface Issue {
  kind: "build" | "limit";
  message: string;
}

export interface Stat {
  value: number;
  formula: string;
  aside: string[];
}

export interface DndDerived {
  level: number;
  pb: number;
  abilities: Record<Ability, { score: number; mod: number; formula: string }>;
  hp: Stat;
  ac: Stat;
  speed: Stat;
  initiative: Stat;
  saves: Record<Ability, Stat & { proficient: boolean }>;
  skills: Record<string, Stat & { ability: Ability; rank: string; name: string }>;
  attacks: { name: string; attack: Stat; damage: string; equipped: boolean }[];
  attacksPerAction: number;
  resources: { id: string; name: string; max: number; info: string }[];
  slots: { rank: number; max: number }[];
  crit: string;
  issues: Issue[];
}

interface Slot {
  id: string;
  level: number;
  source: string;
  label: string;
}

const BACKGROUND_SKILLS: Record<string, string[]> = {
  acolyte: ["insight", "religion"],
  criminal: ["sleight", "stealth"],
  sage: ["arcana", "history"],
  soldier: ["athletics", "intimidation"],
};

const ASI_LEVELS: Record<string, number[]> = {
  fighter: [4, 6, 8, 12, 14, 16],
  rogue: [4, 8, 10, 12, 16],
};

const CLASS_SKILLS = 2;

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

export function slotsForProgress(progress: DndProgress, level: number): Slot[] {
  const slots: Slot[] = [];
  const push = (id: string, at: number, source: string, label: string) => {
    if (at <= level) slots.push({ id, level: at, source, label });
  };
  push("origin-feat", 1, "feat", "Черта происхождения");
  push("skill-species", 1, "skill", "Навык народа");
  for (let i = 0; i < CLASS_SKILLS; i += 1) push(`skill-class-${i}`, 1, "skill", "Навык класса");
  if (progress.classId === "fighter") push("style-1", 1, "style", "Боевой стиль");
  if (progress.classId === "fighter" && progress.subclassId === "champion") push("style-7", 7, "style", "Второй боевой стиль чемпиона");
  if (progress.classId === "fighter") {
    const mastery = masteryCount(level);
    for (let i = 0; i < mastery; i += 1) {
      const at = i < 3 ? 1 : i === 3 ? 4 : i === 4 ? 10 : 16;
      push(`mastery-${i}`, at, "mastery", "Мастерство оружия");
    }
  }
  for (const at of ASI_LEVELS[progress.classId] ?? [4, 8, 12, 16]) push(`asi-${at}`, at, "asi", "Повышение характеристик или черта");
  push("epic-19", 19, "epic", "Эпический дар");
  return slots;
}

export function deriveProgress(progress: DndProgress, items: ItemInst[], conditions: Record<string, number>, flags: string[], level: number, effects: StructuredEffect[] = []): DndDerived {
  const issues: Issue[] = [];
  const scores = { ...progress.base };
  const skills = new Map<string, "untrained" | "proficient" | "expertise">();
  const styles: string[] = [];
  const feats = new Set<string>();
  if (progress.backgroundId === "soldier") feats.add("savage");
  for (const id of BACKGROUND_SKILLS[progress.backgroundId] ?? []) skills.set(id, "proficient");
  if (!BACKGROUND_SKILLS[progress.backgroundId]) {
    issues.push({ kind: "limit", message: "Навыки этого происхождения справочник не знает, они не добавлены сами." });
  }
  const slots = slotsForProgress(progress, level);
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
      issues.push({ kind: "build", message: `Лишний выбор «${describeDndChoice(choice)}» на уровне ${choice.level}: для него нет слота.` });
    }
  }
  if (level >= 3 && !progress.subclassId) issues.push({ kind: "build", message: "С 3 уровня нужен подкласс." });

  for (const choice of [...byId.values()].sort((a, b) => a.level - b.level)) {
    const slot = slots.find((item) => item.id === choice.id);
    if (!slot) continue;
    if (choice.source === "skill") {
      if (!SKILLS.some((skill) => skill.id === choice.pick)) issues.push({ kind: "build", message: "Неизвестный навык." });
      else if (skills.get(choice.pick) === "proficient" || skills.get(choice.pick) === "expertise") {
        issues.push({ kind: "build", message: `${skillName(choice.pick)} уже есть. Повторный выбор его не удваивает.` });
      } else skills.set(choice.pick, "proficient");
    }
    if (choice.source === "style") {
      styles.push(choice.pick);
      if (!["defense", "dueling", "archery"].includes(choice.pick)) {
        issues.push({ kind: "limit", message: `Боевой стиль «${STYLE_NAMES[choice.pick] ?? "без русского имени"}» записан, но в постоянные числа его нет.` });
      }
    }
    if (choice.source === "asi" || choice.source === "feat") applyAsi(choice, scores, feats, issues, false);
    if (choice.source === "epic") applyAsi(choice, scores, feats, issues, true);
  }
  for (const ability of ABILITIES) scores[ability] = Math.max(1, Math.min(30, scores[ability]));
  return deriveNumbers({
    level,
    classId: progress.classId,
    subclassId: progress.subclassId,
    abilities: scores,
    skills,
    styles,
    feats,
    speed: progress.speed,
    items,
    conditions,
    flags,
    toggles: new Set(progress.toggles),
    unarmored: progress.classId === "barbarian" ? "barbarian" : progress.classId === "monk" ? "monk" : "none",
    issues,
    averageHp: true,
    effects,
  });
}

function applyAsi(choice: BuildChoice, scores: Record<Ability, number>, feats: Set<string>, issues: Issue[], epic: boolean) {
  const pick = choice.pick;
  if (pick.startsWith("feat:")) {
    const id = pick.slice(5);
    if (id === "grappler") {
      const score = Math.max(scores.str, scores.dex);
      if (choice.level < 4 || score < 13) {
        issues.push({ kind: "build", message: "Борец требует 4 уровень и Силу или Ловкость 13. Повышение от черты не применено." });
        return;
      }
      const ability = (choice.detail?.ability === "dex" ? "dex" : "str") as Ability;
      if (scores[ability] >= 20 && !epic) issues.push({ kind: "build", message: "Борец не поднимает характеристику выше 20." });
      else scores[ability] += 1;
    }
    feats.add(id);
    if (!["tough", "alert", "savage", "grappler"].includes(id)) {
      issues.push({ kind: "limit", message: `Черта «${featLabel(id)}» записана, но её эффект приложение не прибавляет к числам.` });
    }
    return;
  }
  if (pick.startsWith("boon:")) {
    const ability = choice.detail?.ability as Ability | undefined;
    if (!ability || !ABILITIES.includes(ability)) issues.push({ kind: "build", message: "Эпический дар должен назвать характеристику для +1." });
    else scores[ability] = Math.min(30, scores[ability] + 1);
    issues.push({ kind: "limit", message: "Особый эффект эпического дара, кроме +1 к характеристике, в постоянные числа не входит." });
    return;
  }
  const parts = pick.split(",").filter(Boolean);
  if (!parts.length) {
    issues.push({ kind: "build", message: `Пустое повышение на уровне ${choice.level}.` });
    return;
  }
  const seen = new Set<string>();
  for (const part of parts) {
    const [ability, raw] = part.split("+");
    const delta = Number(raw);
    if (!ABILITIES.includes(ability as Ability) || (delta !== 1 && delta !== 2)) {
      issues.push({ kind: "build", message: "Непонятное повышение." });
      continue;
    }
    if (seen.has(ability)) issues.push({ kind: "build", message: "В одном повышении характеристика указана дважды." });
    seen.add(ability);
    const next = scores[ability as Ability] + delta;
    if (!epic && next > 20) {
      issues.push({ kind: "build", message: `${ABILITY_NAME[ability as Ability]} нельзя поднять выше 20 до эпического дара.` });
      scores[ability as Ability] = 20;
    } else scores[ability as Ability] = next;
  }
}

interface NumberInput {
  level: number;
  classId: string;
  subclassId: string;
  abilities: Record<Ability, number>;
  skills: Map<string, "untrained" | "proficient" | "expertise">;
  styles: string[];
  feats: Set<string>;
  speed: number;
  items: ItemInst[];
  conditions: Record<string, number>;
  flags: string[];
  toggles: Set<string>;
  unarmored: "none" | "barbarian" | "monk";
  issues: Issue[];
  averageHp: boolean;
  hpRolls?: number[];
  hpBonus?: number;
  effects?: StructuredEffect[];
}

function deriveNumbers(input: NumberInput): DndDerived {
  const level = Math.max(1, Math.min(20, input.level));
  const pb = proficiencyBonus(level);
  const issues = input.issues;
  const exhaustion = Math.max(0, input.conditions.exhaustion ?? 0);
  const penalty = exhaustion * 2;
  const scores = input.abilities;
  const str = mod(scores.str);
  const dex = mod(scores.dex);
  const con = mod(scores.con);
  const wis = mod(scores.wis);
  const tough = input.feats.has("tough");
  const alert = input.feats.has("alert");
  let hp = 0;
  const die = hitDie(input.classId);
  const average = Math.floor(die / 2) + 1;
  for (let i = 0; i < level; i += 1) {
    const roll = i === 0 ? die : input.averageHp ? average : Math.max(1, input.hpRolls?.[i] ?? average);
    hp += Math.max(1, roll + con);
  }
  if (tough) hp += level * 2;
  hp += input.hpBonus ?? 0;
  const hpParts = [`(кость ${die} + Телосложение ${fmt(con)})`];
  if (level > 1) hpParts.push(`(${average} + Телосложение ${fmt(con)}) × ${level - 1}`);
  if (tough) hpParts.push(`Живучесть ${level * 2}`);

  const armor = input.items.find((item) => item.kind === "armor" && item.equipped);
  const shield = input.items.find((item) => item.kind === "shield" && item.equipped);
  const defense = input.styles.includes("defense") && Boolean(armor);
  const shieldAc = shield ? (shield.shield?.acBonus ?? 2) + (shield.magicBonus ?? 0) : 0;
  let ac = 10;
  const acParts: string[] = [];
  const acAside: string[] = [];
  if (armor?.armor) {
    const cap = armor.armor.dexCap;
    const dexPart = cap == null ? dex : Math.min(dex, cap);
    const base = armor.armor.ac ?? 10;
    const magic = armor.magicBonus ?? 0;
    ac = base + dexPart + magic + (defense ? 1 : 0) + shieldAc;
    acParts.push(`${armor.name} ${base}`, `Ловкость ${fmt(dexPart)}${cap != null && dex > cap ? ` (предел ${fmt(cap)})` : ""}`);
    if (magic) acParts.push(`магия ${fmt(magic)}`);
    if (defense) acParts.push("оборона +1");
    if (shieldAc) acParts.push(`щит ${fmt(shieldAc)}`);
    if (armor.armor.stealth) acAside.push("Доспех даёт помеху на Скрытность. Модификатор навыка из-за этого не уменьшается.");
  } else if (input.unarmored === "barbarian") {
    ac = 10 + dex + con + shieldAc;
    acParts.push("10", `Ловкость ${fmt(dex)}`, `Телосложение ${fmt(con)}`);
    if (shieldAc) acParts.push(`щит ${fmt(shieldAc)}`);
  } else if (input.unarmored === "monk" && !shield) {
    ac = 10 + dex + wis;
    acParts.push("10", `Ловкость ${fmt(dex)}`, `Мудрость ${fmt(wis)}`);
  } else {
    ac = 10 + dex + shieldAc;
    acParts.push("10", `Ловкость ${fmt(dex)}`);
    if (shieldAc) acParts.push(`щит ${fmt(shieldAc)}`);
    if (input.unarmored === "monk" && shield) acAside.push("Щит отменяет защиту монаха без доспеха.");
  }

  let speed = input.speed - exhaustion * 5;
  const speedParts = [`база ${input.speed}`];
  if (exhaustion) speedParts.push(`истощение −${exhaustion * 5}`);
  if (speed < 0) speed = 0;

  const init = dex + (alert ? pb : 0) - penalty;
  const initParts = [`Ловкость ${fmt(dex)}`];
  if (alert) initParts.push(`бдительный ${fmt(pb)}`);
  if (penalty) initParts.push(`истощение −${penalty}`);
  const initAside: string[] = [];
  if (input.classId === "fighter" && input.subclassId === "champion" && level >= 3) {
    initAside.push("Замечательный атлет: преимущество на инициативу. К числу оно не прибавляется.");
  }

  const saveProfs = savesOf(input.classId);
  const saves = Object.fromEntries(ABILITIES.map((ability) => {
    const proficient = saveProfs.includes(ability);
    const value = mod(scores[ability]) + (proficient ? pb : 0) - penalty;
    const parts = [`${ABILITY_NAME[ability]} ${fmt(mod(scores[ability]))}`];
    if (proficient) parts.push(`мастерство ${fmt(pb)}`);
    else parts.push("без владения");
    if (penalty) parts.push(`истощение −${penalty}`);
    return [ability, { value, formula: line(ABILITY_NAME[ability], value, parts), aside: [] as string[], proficient }];
  })) as unknown as DndDerived["saves"];

  const skills: DndDerived["skills"] = {};
  for (const skill of SKILLS) {
    const rank = input.skills.get(skill.id) ?? "untrained";
    const prof = rank === "expertise" ? pb * 2 : rank === "proficient" ? pb : 0;
    let value = mod(scores[skill.ability]) + prof - penalty;
    const parts = [`${ABILITY_NAME[skill.ability]} ${fmt(mod(scores[skill.ability]))}`];
    if (rank === "expertise") parts.push(`экспертиза ${fmt(prof)}`);
    else if (rank === "proficient") parts.push(`мастерство ${fmt(pb)}`);
    else parts.push("не владеет");
    if (penalty) parts.push(`истощение −${penalty}`);
    const aside: string[] = [];
    if (skill.id === "athletics" && input.subclassId === "champion" && level >= 3) aside.push("Замечательный атлет: преимущество на Атлетику. Число то же.");
    if (skill.id === "stealth" && armor?.armor?.stealth) aside.push("Помеха от доспеха. Число то же.");
    if (input.flags.includes("poisoned") || input.flags.includes("frightened")) aside.push("Отравление или испуг дают помеху на проверки. Модификатор не режется.");
    skills[skill.id] = { value, formula: line(skill.name, value, parts), aside, ability: skill.ability, rank, name: skill.name };
  }

  const dueling = input.styles.includes("dueling") && duelingReady(input.items);
  const attacks = input.items.filter((item) => item.kind === "weapon" && item.weapon).map((item) => {
    const weapon = item.weapon!;
    const abilityMod = weapon.ranged && !weapon.thrown ? dex : weapon.attr === "dex" ? dex : weapon.attr === "finesse" ? Math.max(str, dex) : str;
    const abilityName = weapon.ranged && !weapon.thrown ? "Ловкость" : weapon.attr === "finesse" && dex > str ? "Ловкость" : weapon.attr === "dex" ? "Ловкость" : "Сила";
    const proficient = weaponProficient(input.classId, weapon.category);
    const magic = item.magicBonus ?? 0;
    const archery = input.styles.includes("archery") && weapon.ranged ? 2 : 0;
    let attack = abilityMod + (proficient ? pb : 0) + magic + archery - penalty;
    const parts = [`${abilityName} ${fmt(abilityMod)}`];
    if (proficient) parts.push(`мастерство ${fmt(pb)}`);
    else parts.push("без владения");
    if (magic) parts.push(`магия ${fmt(magic)}`);
    if (archery) parts.push("стрельба +2");
    if (penalty) parts.push(`истощение −${penalty}`);
    const damageBonus = abilityMod + magic + (dueling && !weapon.ranged && !weapon.twoHanded && (weapon.hands ?? 1) === 1 ? 2 : 0);
    const rage = input.toggles.has("rage") && input.classId === "barbarian" && !weapon.ranged ? rageDamage(level) : 0;
    const damage = `${weapon.damage}${fmt(damageBonus + rage)}`;
    const aside: string[] = [];
    if (input.feats.has("savage")) aside.push("Дикий натиск не меняет записанный урон: раз за ход можно взять лучший из двух бросков костей оружия.");
    if (!item.equipped) aside.push("Оружие не в руках. Бонус показан так, как если его взять.");
    return {
      name: item.name,
      equipped: item.equipped,
      attack: { value: attack, formula: line(item.name, attack, parts), aside },
      damage,
    };
  });

  const adjusted = applyStructured(hp, hpParts, ac, acParts, speed, speedParts, issues, input.effects ?? []);
  hp = adjusted.hp;
  ac = adjusted.ac;
  speed = adjusted.speed;

  if (input.subclassId && input.subclassId !== "champion" && level >= 3) {
    issues.push({ kind: "limit", message: "Особенности этого подкласса в постоянные числа не входят." });
  }
  if (input.classId === "fighter" && level >= 18 && input.subclassId === "champion") {
    issues.push({ kind: "limit", message: "Стойкость чемпиона возвращает хиты раненому в начале хода и помогает спасброскам от смерти. Максимум хитов она не увеличивает." });
  }
  if (input.classId === "fighter" && level >= 10 && input.subclassId === "champion") {
    issues.push({ kind: "limit", message: "Герой войны сам выдаёт вдохновение в бою. На постоянные модификаторы это не влияет." });
  }
  if (input.classId === "fighter" && level >= 2) {
    issues.push({ kind: "limit", message: "Тактический ум тратит Второе дыхание на проверку, а не на хиты. Постоянный модификатор навыка от этого не растёт." });
  }
  if (masteryCount(level) > 0 && input.classId === "fighter") {
    issues.push({ kind: "limit", message: "Свойства мастерства оружия не входят в постоянный модификатор атаки." });
  }
  if (["barbarian", "paladin", "ranger", "rogue"].includes(input.classId)) {
    issues.push({ kind: "limit", message: "Слоты мастерства оружия этого класса не разложены. На постоянный модификатор атаки свойства всё равно не влияют." });
  }
  if (!["fighter", "barbarian", "monk", "rogue", "cleric", "wizard", "bard", "druid", "paladin", "ranger", "sorcerer", "warlock"].includes(input.classId) && input.classId !== "custom") {
    issues.push({ kind: "limit", message: "Для этого класса автоматически считаются хиты, мастерство, спасброски и навыки. Особенности подкласса сверьте вручную." });
  }

  const resources = resourcesOf(input.classId, level, input.subclassId);
  const slots = spellSlots(input.classId, level);

  return {
    level,
    pb,
    abilities: Object.fromEntries(ABILITIES.map((ability) => [ability, {
      score: scores[ability],
      mod: mod(scores[ability]),
      formula: `${ABILITY_NAME[ability]} ${scores[ability]} (${fmt(mod(scores[ability]))})`,
    }])) as DndDerived["abilities"],
    hp: { value: hp, formula: line("ПЗ", hp, hpParts), aside: [] },
    ac: { value: ac, formula: line("КБ", ac, acParts), aside: acAside },
    speed: { value: speed, formula: line("Скорость", speed, speedParts).replace("+", ""), aside: [] },
    initiative: { value: init, formula: line("Инициатива", init, initParts), aside: initAside },
    saves,
    skills,
    attacks,
    attacksPerAction: attacksPerAction(input.classId, level),
    resources,
    slots,
    crit: input.classId === "fighter" && input.subclassId === "champion" ? (level >= 15 ? "18–20" : level >= 3 ? "19–20" : "20") : "20",
    issues,
  };
}

export function deriveStored(character: Character): DndDerived | null {
  if (character.system !== "dnd5e") return null;
  const skills = new Map<string, "untrained" | "proficient" | "expertise">();
  for (const [id, rank] of Object.entries(character.skillRanks)) {
    if (rank === "proficient" || rank === "expertise" || rank === "untrained") skills.set(id, rank);
  }
  const feats = new Set(character.feats.map((feat) => feat.id));
  if (character.tough) feats.add("tough");
  const styles = character.fightingStyle ? [character.fightingStyle] : [];
  const subclassId = character.subclassName.includes("Чемпион") ? "champion" : character.subclassName ? "other" : "";
  return deriveNumbers({
    level: character.level,
    classId: character.classId,
    subclassId,
    abilities: { ...character.abilities },
    skills,
    styles,
    feats,
    speed: character.speed,
    items: character.items,
    conditions: character.conditionValues,
    flags: character.conditions,
    toggles: new Set(character.conditions),
    unarmored: character.unarmored,
    issues: [],
    averageHp: false,
    hpRolls: character.hpRolls,
    hpBonus: character.hpBonus,
    effects: effectsFrom(character),
  });
}

export function sheetDnd(character: Character, level = character.level): DndDerived | null {
  if (character.system !== "dnd5e") return null;
  if (!character.dnd) return level === character.level ? deriveStored(character) : null;
  return deriveProgress(character.dnd, character.items, character.conditionValues, character.conditions, level, effectsFrom(character));
}

export function snapshotDnd(character: Character): Character {
  if (!character.dnd || character.system !== "dnd5e") return character;
  const derived = deriveProgress(character.dnd, character.items, character.conditionValues, character.conditions, character.level);
  const abilities = { ...character.abilities };
  for (const ability of ABILITIES) abilities[ability] = derived.abilities[ability].score;
  const skillRanks = { ...character.skillRanks };
  for (const [id, skill] of Object.entries(derived.skills)) skillRanks[id] = skill.rank;
  const saves = { ...character.saves };
  for (const ability of ABILITIES) saves[ability] = derived.saves[ability].proficient ? "proficient" : "untrained";
  return {
    ...character,
    formatVersion: 2,
    abilities,
    skillRanks,
    saves,
    speed: derived.speed.value,
    fightingStyle: character.dnd.choices.find((choice) => choice.source === "style")?.pick ?? character.fightingStyle,
    tough: character.dnd.choices.some((choice) => choice.pick === "feat:tough"),
    hpCurrent: Math.min(character.hpCurrent, derived.hp.value),
  };
}

function masteryCount(level: number): number {
  if (level >= 16) return 6;
  if (level >= 10) return 5;
  if (level >= 4) return 4;
  return 3;
}

function hitDie(classId: string): number {
  if (classId === "barbarian") return 12;
  if (classId === "fighter" || classId === "paladin" || classId === "ranger") return 10;
  if (classId === "sorcerer" || classId === "wizard") return 6;
  return 8;
}

function savesOf(classId: string): Ability[] {
  const table: Record<string, Ability[]> = {
    barbarian: ["str", "con"],
    bard: ["dex", "cha"],
    cleric: ["wis", "cha"],
    druid: ["int", "wis"],
    fighter: ["str", "con"],
    monk: ["str", "dex"],
    paladin: ["wis", "cha"],
    ranger: ["str", "dex"],
    rogue: ["dex", "int"],
    sorcerer: ["con", "cha"],
    warlock: ["wis", "cha"],
    wizard: ["int", "wis"],
  };
  return table[classId] ?? ["str", "con"];
}

function attacksPerAction(classId: string, level: number): number {
  if (classId === "fighter") {
    if (level >= 20) return 4;
    if (level >= 11) return 3;
    if (level >= 5) return 2;
  }
  if (["barbarian", "monk", "paladin", "ranger"].includes(classId) && level >= 5) return 2;
  return 1;
}

function rageDamage(level: number): number {
  if (level >= 16) return 4;
  if (level >= 9) return 3;
  return 2;
}

function resourcesOf(classId: string, level: number, subclassId: string): DndDerived["resources"] {
  const list: DndDerived["resources"] = [];
  if (classId === "fighter") {
    const wind = level >= 10 ? 4 : level >= 4 ? 3 : 2;
    list.push({ id: "wind", name: "Второе дыхание", max: wind, info: "Бонусное действие: 1d10 + уровень воина хитов. Короткий отдых возвращает одно." });
    if (level >= 2) list.push({ id: "surge", name: "Всплеск действий", max: level >= 17 ? 2 : 1, info: "Ещё одно действие в этот ход, кроме магии. Не чаще одного раза за ход." });
    if (level >= 9) list.push({ id: "indomitable", name: "Несгибаемость", max: level >= 17 ? 3 : level >= 13 ? 2 : 1, info: "Переброс проваленного спасброска с бонусом, равным уровню воина." });
  }
  if (classId === "barbarian") list.push({ id: "rage", name: "Ярость", max: level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2, info: "Бонусное действие. Сопротивление физическому урону и бонус к урону, пока ярость включена на листе." });
  if (subclassId === "champion" && level >= 10) list.push({ id: "heroic", name: "Героическое вдохновение", max: 1, info: "Чемпион может выдать его себе в начале хода, если его нет." });
  return list;
}

function spellSlots(classId: string, level: number): { rank: number; max: number }[] {
  if (classId === "warlock") {
    const pact = pactSlots(level);
    return [{ rank: pact.rank, max: pact.n }];
  }
  const table = classId === "paladin" || classId === "ranger" ? halfSlots(level) : ["bard", "cleric", "druid", "sorcerer", "wizard"].includes(classId) ? fullSlots(level) : [];
  return table.map((max, index) => ({ rank: index + 1, max }));
}

function weaponProficient(classId: string, category: string): boolean {
  if (category === "simple") return true;
  if (category === "martial") return ["barbarian", "fighter", "paladin", "ranger"].includes(classId);
  return category === "unarmed";
}

function duelingReady(items: ItemInst[]): boolean {
  const held = items.filter((item) => item.kind === "weapon" && item.equipped);
  if (held.length !== 1) return false;
  const weapon = held[0].weapon;
  if (!weapon || weapon.ranged || weapon.twoHanded || weapon.hands === 2) return false;
  return true;
}

function skillName(id: string): string {
  return SKILLS.find((skill) => skill.id === id)?.name ?? "неизвестный навык";
}

const STYLE_NAMES: Record<string, string> = {
  defense: "Оборона",
  dueling: "Дуэль",
  archery: "Стрельба",
  gwf: "Двуручное оружие",
  twf: "Парное оружие",
  protection: "Защита",
};

const EXTRA_FEAT_NAMES: Record<string, string> = {
  tough: "Живучесть",
  alert: "Бдительный",
  savage: "Дикий натиск",
  grappler: "Борец",
};

function featLabel(id: string): string {
  return ORIGIN_FEATS.find((feat) => feat.id === id)?.name
    ?? GENERAL_FEATS.find((feat) => feat.id === id)?.name
    ?? STYLE_FEATS.find((feat) => feat.id === id)?.name
    ?? EXTRA_FEAT_NAMES[id]
    ?? "черта";
}

/** Русская подпись выбора. Код выбора на экран не выводится. */
export function describeDndChoice(choice: { pick: string; source: string; detail?: Record<string, string> }): string {
  const pick = choice.pick;
  if (choice.source === "skill") return skillName(pick);
  if (choice.source === "style") return STYLE_NAMES[pick] ?? "боевой стиль без русского имени";
  if (choice.source === "mastery") return ITEMS.find((item) => item.id === pick)?.name ?? "оружие";
  if (pick.startsWith("feat:")) {
    const name = featLabel(pick.slice(5));
    const ability = choice.detail?.ability;
    if (ability && ABILITIES.includes(ability as Ability)) return `${name}, ${ABILITY_NAME[ability as Ability]}`;
    return name;
  }
  if (pick.startsWith("boon:") || choice.source === "epic") {
    const ability = choice.detail?.ability;
    if (ability && ABILITIES.includes(ability as Ability)) return `эпический дар, +1 к ${ABILITY_NAME[ability as Ability]}`;
    return "эпический дар";
  }
  const bits = pick.split(",").filter(Boolean).map((part) => {
    const [ability, raw] = part.split("+");
    if (!ABILITIES.includes(ability as Ability) || !raw) return "";
    return `${ABILITY_NAME[ability as Ability]} +${raw}`;
  }).filter(Boolean);
  return bits.join(", ") || "повышение";
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

function applyStructured(
  hp: number,
  hpParts: string[],
  ac: number,
  acParts: string[],
  speed: number,
  speedParts: string[],
  issues: Issue[],
  effects: StructuredEffect[],
) {
  for (const effect of effects) {
    if (!effect.implemented) {
      issues.push({ kind: "limit", message: `Своя запись «${effect.label}» не прибавлена к числам: эффект не включён.` });
      continue;
    }
    const value = Number(effect.value) || 0;
    if (!value) continue;
    const piece = `${effect.label} ${fmt(value)}`;
    if (effect.target === "ac") {
      ac += value;
      acParts.push(piece);
    } else if (effect.target === "speed") {
      speed += value;
      speedParts.push(piece);
    } else {
      hp += value;
      hpParts.push(piece);
    }
  }
  return { hp, ac, speed: Math.max(0, speed) };
}

function line(name: string, value: number, parts: string[]): string {
  return `${name} ${fmt(value)} = ${parts.join(" + ").replaceAll("+ −", "− ").replaceAll("+ -", "− ")}`;
}
