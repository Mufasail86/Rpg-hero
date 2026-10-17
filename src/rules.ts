import { dndCoinPounds, pfCoinBulk } from "./play/wallet";
import { ABILITIES, ABILITY_NAME, type Ability, type Character, type ItemInst, mod } from "./types";
import { SKILLS as SKILLS5, skillById as skill5, XP_THRESHOLDS, fullSlots, halfSlots, pactSlots } from "./data/dnd5e";
import { SKILLS as SKILLS2, skillById as skill2, RANK_NAME } from "./data/pf2e";
import { derive } from "./pf2e/build";
import slotsTable from "./data/generated/pf-slots.json";
import { spellSlotFacts } from "./pf2e/progression";

export const POINT_BUY_BUDGET = 27;
export const PF_STANDARD = [18, 14, 14, 12, 10, 10];

export function pointBuySpent(scores: Record<Ability, number>): number {
  return ABILITIES.reduce((sum, id) => {
    const score = scores[id];
    if (score < 8 || score > 15) return sum + 100;
    const cost = [0, 1, 2, 3, 4, 5, 7, 9][score - 8];
    return sum + cost;
  }, 0);
}

export function roll4d6(rng: () => number = Math.random): { total: number; dice: number[] } {
  const dice = [0, 1, 2, 3].map(() => 1 + Math.floor(rng() * 6));
  const drop = Math.min(...dice);
  let dropped = false;
  const kept = dice.filter((face) => {
    if (!dropped && face === drop) {
      dropped = true;
      return false;
    }
    return true;
  });
  return { total: kept.reduce((a, b) => a + b, 0), dice };
}

export function sameMultiset(values: number[], pool: number[]): boolean {
  const a = [...values].sort((x, y) => x - y);
  const b = [...pool].sort((x, y) => x - y);
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

export function rankBonus(rank: string, level: number): number {
  if (rank === "trained") return level + 2;
  if (rank === "expert") return level + 4;
  if (rank === "master") return level + 6;
  if (rank === "legendary") return level + 8;
  return 0;
}

export function hpMax(c: Character): number {
  const con = mod(c.abilities.con);
  if (c.system === "pf2e") {
    const tough = c.feats.some((f) => f.id === "toughness") ? c.level : 0;
    return Math.max(1, c.ancestryHp + (c.classHp + con) * c.level + c.hpBonus + tough);
  }
  let total = 0;
  for (let i = 0; i < c.level; i++) {
    const roll = c.hpRolls[i] ?? c.hitDie;
    total += Math.max(1, roll + con);
  }
  if (c.tough) total += c.level;
  return Math.max(1, total + c.hpBonus);
}

export function abilityMod(c: Character, id: Ability): number {
  return mod(c.abilities[id]);
}

function equippedArmor(c: Character): ItemInst | undefined {
  return c.items.find((item) => item.equipped && item.kind === "armor");
}

function shieldBonus(c: Character): number {
  const shield = c.items.some((item) => item.equipped && item.kind === "shield");
  if (!shield) return 0;
  if (c.system === "pf2e") return c.shieldRaised ? 2 : 0;
  return 2;
}

export function armorClass(c: Character): { value: number; text: string } {
  const dex = abilityMod(c, "dex");
  const armor = equippedArmor(c);
  if (c.system === "dnd5e") {
    const shield = shieldBonus(c);
    if (!armor) {
      if (c.unarmored === "barbarian") {
        const value = 10 + dex + abilityMod(c, "con") + shield;
        return { value, text: `10 + Лов ${fmt(dex)} + Тел ${fmt(abilityMod(c, "con"))}${shield ? " + щит 2" : ""}` };
      }
      if (c.unarmored === "monk") {
        const value = 10 + dex + abilityMod(c, "wis");
        return { value, text: `10 + Лов ${fmt(dex)} + Мдр ${fmt(abilityMod(c, "wis"))}. Щит и доспех эту формулу ломают.` };
      }
      return { value: 10 + dex + shield, text: `10 + Лов ${fmt(dex)}${shield ? " + щит 2" : ""}` };
    }
    const cap = armor.armor?.dexCap;
    const dexPart = cap == null ? dex : Math.min(dex, cap);
    let value = (armor.armor?.ac ?? 10) + dexPart;
    const style = c.fightingStyle === "defense" ? 1 : 0;
    value += style + shield;
    return {
      value,
      text: `${armor.name}: база ${armor.armor?.ac ?? "?"} + Лов ${fmt(dexPart)}${style ? " + стиль 1" : ""}${shield ? " + щит 2" : ""}`,
    };
  }
  const category = armor?.armor?.category ?? "unarmored";
  const cap = armor?.armor?.dexCap ?? null;
  const dexPart = cap == null ? dex : Math.min(dex, cap);
  const rank = c.armorRanks[category] ?? "untrained";
  const prof = rankBonus(rank, c.level);
  const item = armor?.armor?.bonus ?? 0;
  const shield = shieldBonus(c);
  const value = 10 + dexPart + prof + item + shield;
  return {
    value,
    text: `10 + Лов ${fmt(dexPart)} + владение ${fmt(prof)} (${RANK_NAME[rank] ?? "не обучен"})${item ? ` + предмет ${item}` : ""}${shield ? " + щит 2" : ""}`,
  };
}

export function speedOf(c: Character): { value: number; text: string } {
  let value = c.speed;
  const notes: string[] = [`база ${c.speed} футов`];
  if (c.system === "pf2e") {
    const armor = equippedArmor(c);
    const req = armor?.armor?.strReq;
    if (req && c.abilities.str < req) {
      value -= 5;
      notes.push("доспех тяжеловат для Силы, −5 футов");
    }
    if (c.conditions.includes("encumbered")) {
      value -= 10;
      notes.push("перегруз, −10 футов");
    }
  }
  return { value: Math.max(0, value), text: notes.join("; ") };
}

export function initiativeOf(c: Character): { value: number; text: string } {
  if (c.system === "pf2e") {
    const value = abilityMod(c, "wis") + rankBonus(c.perceptionRank, c.level);
    return { value, text: `Восприятие ${fmt(value)}. В бою обычно бросают именно его.` };
  }
  const pb = proficiencyBonus(c.level);
  const alert = c.feats.some((f) => f.id === "alert");
  const value = abilityMod(c, "dex") + (alert ? pb : 0);
  return { value, text: alert ? `Лов ${fmt(abilityMod(c, "dex"))} + бдительность ${fmt(pb)}` : `Ловкость ${fmt(abilityMod(c, "dex"))}` };
}

export interface SkillRow {
  id: string;
  name: string;
  ability: Ability;
  mod: number;
  rank: string;
  info: string;
}

export function skillRows(c: Character): SkillRow[] {
  if (c.system === "dnd5e") {
    const pb = proficiencyBonus(c.level);
    const rows = SKILLS5.map((skill) => {
      const rank = c.skillRanks[skill.id] ?? "untrained";
      const prof = rank === "expertise" ? pb * 2 : rank === "proficient" ? pb : 0;
      return {
        id: skill.id,
        name: skill.name,
        ability: skill.ability,
        mod: abilityMod(c, skill.ability) + prof,
        rank,
        info: skill.info,
      };
    });
    for (const extra of c.extraSkills) {
      const rank = c.skillRanks[extra.id] ?? "untrained";
      const prof = rank === "expertise" ? pb * 2 : rank === "proficient" ? pb : 0;
      rows.push({
        id: extra.id,
        name: extra.name,
        ability: extra.ability,
        mod: abilityMod(c, extra.ability) + prof,
        rank,
        info: extra.info,
      });
    }
    return rows;
  }
  const rows = SKILLS2.map((skill) => {
    const rank = c.skillRanks[skill.id] ?? "untrained";
    return {
      id: skill.id,
      name: skill.name,
      ability: skill.ability,
      mod: abilityMod(c, skill.ability) + rankBonus(rank, c.level),
      rank,
      info: skill.info,
    };
  });
  for (const extra of c.extraSkills) {
    const rank = c.skillRanks[extra.id] ?? "untrained";
    rows.push({
      id: extra.id,
      name: extra.name,
      ability: extra.ability,
      mod: abilityMod(c, extra.ability) + rankBonus(rank, c.level),
      rank,
      info: extra.info,
    });
  }
  return rows;
}

export function saveMod(c: Character, key: string, ability: Ability): number {
  const rank = c.saves[key] ?? "untrained";
  if (c.system === "dnd5e") {
    const pb = proficiencyBonus(c.level);
    return abilityMod(c, ability) + (rank === "proficient" ? pb : 0);
  }
  return abilityMod(c, ability) + rankBonus(rank, c.level);
}

export function spellNumbers(c: Character): { attack: number; dc: number; text: string } | null {
  if (!c.spellcasting) return null;
  const ability = abilityMod(c, c.spellcasting.ability);
  if (c.system === "dnd5e") {
    const pb = proficiencyBonus(c.level);
    return {
      attack: pb + ability,
      dc: 8 + pb + ability,
      text: `бонус мастерства ${fmt(pb)} и ${ABILITY_NAME[c.spellcasting.ability]} ${fmt(ability)}`,
    };
  }
  if (c.progress) {
    const derived = derive({
      progress: c.progress,
      items: c.items,
      conditions: c.conditionValues,
      level: c.level,
      toggles: c.progress.toggles,
      shieldRaised: c.shieldRaised,
    });
    if (derived.spell) {
      return { attack: derived.spell.value - 10, dc: derived.spell.value, text: derived.spell.formula };
    }
  }
  const prof = rankBonus(c.spellRank, c.level);
  return {
    attack: ability + prof,
    dc: 10 + ability + prof,
    text: `${ABILITY_NAME[c.spellcasting.ability]} ${fmt(ability)} + владение ${fmt(prof)}`,
  };
}

export function classDc(c: Character): number | null {
  if (c.system !== "pf2e") return null;
  return 10 + abilityMod(c, c.keyAbility) + rankBonus(c.classDcRank, c.level);
}

export function loadOf(c: Character): { current: number; cap: number; enc?: number; unit: string; text: string } {
  if (c.system === "dnd5e") {
    const items = c.items.reduce((sum, item) => sum + item.weight * item.qty, 0);
    const money = dndCoinPounds(c.coins);
    const cap = c.abilities.str * 15;
    return {
      current: items + money.pounds,
      cap,
      unit: "фунтов",
      text: `Вещи ${items} фунтов. Монеты: ${money.pounds} фунтов и ещё ${money.leftover} штук. 50 монет = 1 фунт, остаток фунтом не считается. Предел ${cap} — Сила × 15.`,
    };
  }
  const items = c.items.reduce((sum, item) => sum + item.weight * item.qty, 0);
  const bulk = pfCoinBulk(c.coins);
  const str = abilityMod(c, "str");
  const extra = c.feats.some((f) => f.id === "hefty") ? 2 : 0;
  const enc = 5 + str + extra;
  const cap = 10 + str + extra;
  return {
    current: items + bulk,
    cap,
    enc,
    unit: "объема",
    text: `Вещи ${items} объёма, монеты ${bulk}. 1000 монет = 1 объём, 999 ещё ничего не весят. Перегруз после ${enc}, максимум ${cap}.`,
  };
}

export function attackFor(c: Character, item: ItemInst): { attack: number; damage: string; text: string } | null {
  if (item.kind !== "weapon" || !item.weapon) return null;
  const weapon = item.weapon;
  const str = abilityMod(c, "str");
  const dex = abilityMod(c, "dex");
  if (c.system === "dnd5e") {
    const pb = proficiencyBonus(c.level);
    const proficient = weaponProficient(c, weapon.category, weapon);
    const attr = weapon.ranged && !weapon.thrown ? dex : weapon.attr === "dex" ? dex : weapon.attr === "finesse" ? Math.max(str, dex) : str;
    const attack = attr + (proficient ? pb : 0) + (c.fightingStyle === "archery" && weapon.ranged ? 2 : 0);
    const dmgMod = attr;
    return {
      attack,
      damage: `${weapon.damage}${fmt(dmgMod)}`,
      text: proficient ? "владеете" : "без владения бонус мастерства не прибавляется",
    };
  }
  const rank = c.weaponRanks[weapon.category] ?? "untrained";
  const prof = rankBonus(rank, c.level);
  const attackAttr = weapon.ranged ? dex : weapon.finesse ? Math.max(str, dex) : str;
  const damageAttr = weapon.ranged && !weapon.thrown ? 0 : c.thiefDamage && weapon.finesse ? Math.max(str, dex) : str;
  return {
    attack: attackAttr + prof,
    damage: `${weapon.damage}${damageAttr ? fmt(damageAttr) : ""}`,
    text: `${RANK_NAME[rank] ?? "не обучен"}`,
  };
}

function weaponProficient(c: Character, category: string, weapon: NonNullable<ItemInst["weapon"]>): boolean {
  if (category === "unarmed") return c.weaponRules.unarmed || c.weaponRules.simple;
  if (category === "simple") return c.weaponRules.simple;
  if (category === "martial") {
    if (c.weaponRules.martial) return true;
    if (c.weaponRules.martialFinesseOrLight && (weapon.finesse || weapon.light)) return true;
    if (c.weaponRules.martialLight && weapon.light) return true;
  }
  return false;
}

export function xpToNext(c: Character): number | null {
  if (c.system === "pf2e") return c.level >= 20 ? null : 1000;
  if (c.level >= 20) return null;
  return XP_THRESHOLDS[c.level];
}

export function canLevel(c: Character): boolean {
  const need = xpToNext(c);
  if (need == null) return false;
  return c.xp >= need;
}

export function refreshSlots(c: Character): Character {
  const next = { ...c, slots: slotsFor(c), spellcasting: c.spellcasting ? { ...c.spellcasting } : null };
  if (next.spellcasting) {
    next.spellcasting.prepareLimit = prepareLimit(next);
    next.spellcasting.knownLimit = knownLimit(next);
    next.spellcasting.cantripLimit = cantripLimit(next);
  }
  return next;
}

interface SlotTable {
  cantrips: number;
  ranks: number[][];
  tenthNote: string;
  font?: boolean;
  curriculum?: boolean;
}

const SLOT_TABLES = slotsTable.classes as Record<string, SlotTable>;

export function pfSlotRow(classId: string, level: number): number[] | null {
  const table = SLOT_TABLES[classId];
  if (!table) return null;
  const index = Math.min(20, Math.max(1, level)) - 1;
  return table.ranks[index] ?? null;
}

function wizardSchool(c: Character): string | null {
  const choice = c.progress?.choices.find((item) => item.source === "school" || item.id === "school" || item.id === "class-school");
  return choice?.pick ?? null;
}

function pfSpellSlots(c: Character): Character["slots"] {
  const table = SLOT_TABLES[c.classId];
  const row = pfSlotRow(c.classId, c.level);
  if (!table || !row) {
    const facts = spellSlotFacts(c.classId);
    if (c.level === 1 && facts.rank1) return [{ rank: 1, max: facts.rank1, used: 0, note: "1 круг" }];
    return [];
  }
  const school = c.classId === "wizard" ? wizardSchool(c) : null;
  const curriculum = table.curriculum && school != null && school !== "unified";
  const slots: Character["slots"] = [];
  row.forEach((max, index) => {
    if (!max) return;
    const extra = curriculum ? 1 : 0;
    const note = index === 9
      ? (extra ? `${table.tenthNote}, включая учебную ячейку школы` : table.tenthNote)
      : (extra ? "включая учебную ячейку школы" : undefined);
    slots.push({ rank: index + 1, max: max + extra, used: 0, note });
  });
  if (table.font) {
    const font = c.level >= 15 ? 6 : c.level >= 5 ? 5 : 4;
    const highest = [...row.keys()].reverse().find((index) => row[index] > 0);
    if (highest != null) slots.push({ rank: highest + 1, max: font, used: 0, note: "шрифт" });
  }
  if (table.curriculum && school == null) {
    slots.push({ rank: 0, max: 0, used: 0, note: "школа не выбрана, учебные ячейки не добавлены" });
  }
  if (school === "unified") {
    slots.push({ rank: 0, max: 0, used: 0, note: "единая теория не даёт учебных ячеек" });
  }
  return slots;
}

export function slotsFor(c: Character): Character["slots"] {
  if (!c.spellcasting) return [];
  if (c.system === "pf2e") return pfSpellSlots(c);
  if (c.spellcasting.kind === "pact") {
    const pact = pactSlots(c.level);
    return [{ rank: pact.rank, max: pact.n, used: 0, note: "пакт" }];
  }
  const table = c.classId === "paladin" || c.classId === "ranger" ? halfSlots(c.level) : fullSlots(c.level);
  return table.map((max, index) => ({ rank: index + 1, max, used: 0 }));
}

function prepareLimit(c: Character): number {
  if (!c.spellcasting) return 0;
  const ability = abilityMod(c, c.spellcasting.ability);
  if (c.system === "pf2e") return c.spellcasting.kind === "prepared" || c.spellcasting.kind === "book" ? Math.max(1, slotsFor(c)[0]?.max ?? 1) : 99;
  if (c.spellcasting.kind === "known" || c.spellcasting.kind === "pact") return 99;
  if (c.classId === "paladin" || c.classId === "ranger") return Math.max(1, ability + Math.floor(c.level / 2));
  return Math.max(1, ability + c.level);
}

function knownLimit(c: Character): number {
  if (!c.spellcasting) return 0;
  if (c.system === "pf2e") {
    const row = pfSlotRow(c.classId, c.level);
    if (row && (c.classId === "bard" || c.classId === "oracle" || c.classId === "sorcerer")) {
      const slots = row.reduce((sum, max) => sum + max, 0);
      return c.level >= 19 ? slots + 1 : slots;
    }
    if (c.classId === "wizard") return 8 + c.level * 2;
    return 99;
  }
  if (c.spellcasting.kind === "book") return 4 + c.level * 2;
  if (c.spellcasting.kind === "known") return 1 + c.level;
  if (c.spellcasting.kind === "pact") return 1 + c.level;
  return 99;
}

function cantripLimit(c: Character): number {
  if (!c.spellcasting) return 0;
  if (c.system === "pf2e") {
    const table = SLOT_TABLES[c.classId];
    if (!table) return 0;
    if (c.classId === "wizard" && wizardSchool(c) && wizardSchool(c) !== "unified") return table.cantrips + 1;
    return table.cantrips;
  }
  if (c.classId === "custom") return 4 + Math.floor((Math.max(1, c.level) - 1) / 4);
  const base = c.classId === "sorcerer" ? 4 : c.classId === "wizard" || c.classId === "cleric" ? 3 : c.classId === "bard" || c.classId === "druid" || c.classId === "warlock" ? 2 : 0;
  const extra = c.features.some((f) => f.name === "Дополнительный заговор") ? 1 : 0;
  return base + extra + Math.floor((Math.max(1, c.level) - 1) / 4);
}

export function applyLevelUp(c: Character, roll: number | "average", boosts: Ability[] = []): Character {
  if (!canLevel(c)) return c;
  const next: Character = {
    ...c,
    level: c.level + 1,
    xp: c.system === "pf2e" ? c.xp - 1000 : c.xp,
    hpRolls: [...c.hpRolls],
    abilities: { ...c.abilities },
    resources: c.resources.map((r) => ({ ...r })),
    updatedAt: Date.now(),
  };
  if (c.system === "dnd5e") {
    const average = Math.floor(c.hitDie / 2) + 1;
    next.hpRolls.push(roll === "average" ? average : roll);
    next.hitDice = { ...c.hitDice, max: next.level };
  }
  if (c.system === "pf2e" && [5, 10, 15, 20].includes(next.level)) {
    for (const ability of boosts) {
      const score = next.abilities[ability];
      next.abilities[ability] = score >= 18 ? score + 1 : score + 2;
    }
  }
  const updated = refreshSlots(next);
  const before = hpMax(c);
  const after = hpMax(updated);
  updated.hpCurrent = Math.min(after, c.hpCurrent + Math.max(0, after - before));
  const lay = updated.resources.find((r) => r.id === "lay");
  if (lay) lay.max = 5 * updated.level;
  const inspiration = updated.resources.find((r) => r.id === "bardic");
  if (inspiration) inspiration.max = Math.max(1, abilityMod(updated, "cha"));
  return updated;
}

export function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function skillInfo(system: Character["system"], id: string): string {
  return (system === "dnd5e" ? skill5(id)?.info : skill2(id)?.info) ?? "Навык персонажа.";
}

export function rankLabel(system: Character["system"], rank: string): string {
  if (system === "dnd5e") {
    if (rank === "expertise") return "экспертиза";
    if (rank === "proficient") return "владение";
    return "нет владения";
  }
  return RANK_NAME[rank] ?? "не обучен";
}
