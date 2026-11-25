import { DiceRoll } from "@dice-roller/rpg-dice-roller";
import { tutorialSpells, spellDamage, type SaveKey, type TutorialSpell } from "../data/tutorial-spells";
import { sheetDnd } from "../dnd/build";
import { emptyDndCombat, spendAttack, secondWind, newRound as dndRound } from "../dnd/combat";
import { derive, effectsFrom } from "../pf2e/build";
import { emptyCombat, strike, mapPenalty, newRound as pfRound } from "../pf2e/combat";
import { initiativeOf, saveMod, skillRows, spellNumbers } from "../rules";
import { resolveCheck, characterHasFeat } from "../skills/guide";
import { fmt, mod, type Character, type CombatState, type DndCombat } from "../types";
import { portraitSrc } from "../ui/art";
import { trainingStats, criticalFormula, damageFormula, weaponGrip, type TrainingDifficulty, type TrainingStats, type TrainingWeapon } from "./training";
import { battleMap, coneCells, findPath, gridDistance, lineOfSight, pathCost, sameCell, walkable, type Cell } from "./tactical-map";
import { sightAt, DEFAULT_ENVIRONMENT, type Environment } from "./tactical-vision";

export type EffectId = "prone" | "frightened" | "poisoned" | "grabbed" | "restrained" | "shield" | "magic-shield" | "cold" | "bless" | "fortune" | "hidden" | "dodge" | "fleeing" | "enfeebled";
export interface TacticalEffect { id: EffectId; value: number; source: string; dc?: number; expires?: { actor: string; turn: number; phase: "start" | "end" } }
export const EFFECTS: Record<EffectId, string> = { prone: "Лежит", frightened: "Испуг", poisoned: "Отравлен", grabbed: "Схвачен", restrained: "Скован", shield: "Щит поднят", "magic-shield": "Магический щит", cold: "Замедлен холодом", bless: "Благословение", fortune: "Верный удар", hidden: "Прячется", dodge: "Уклонение", fleeing: "Бежит в страхе", enfeebled: "Ослаблен" };
export const SAVES: Record<SaveKey, string> = { str: "Сила", dex: "Ловкость", con: "Телосложение", int: "Интеллект", wis: "Мудрость", cha: "Харизма", fort: "Стойкость", ref: "Рефлексы", will: "Воля" };
export interface TacticalActor {
  id: string; name: string; team: "party" | "enemy"; pos: Cell; hp: number; maxHp: number; ac: number;
  attack: number; damage: string; speed: number; initiative: number; saves: Record<string, number>;
  portrait: string; effects: TacticalEffect[]; pf: CombatState; dnd: DndCombat; move: number;
  turns: number; diagonals: number; disengaged: boolean; concentration?: string; shieldSpent?: boolean;
  fortuneSpent?: boolean; slotSpent: boolean; slots: Record<string, number>; opportunity: boolean;
  shieldHp?: number; shieldMax?: number; escapeLocked?: boolean;
  preparedSlots?: Record<string, number>; font?: number;
  caster?: boolean; dummy?: boolean; demoralizedBy: string[];
  extraActionAvailable?: boolean; surgeUsed?: boolean;
  grip?: 1 | 2;
  activeWeapon?: 0 | 1; weaponSwapUsed?: boolean;
  lightAttacks?: number; lightExtraUsed?: boolean; sneakAttackTurn?: string;
}
export interface TacticalSetup { map: "arena" | "tavern"; scenario: "dummy" | "duel" | "ambush"; difficulty: TrainingDifficulty; environment?: Environment; ally?: "none" | "fighter" | "target"; grip?: 1 | 2 }
export interface BattleVisual { kind: "move" | "arrow" | "strike" | "fire" | "cold" | "lightning" | "force" | "heal" | "ward" | "fear"; from: Cell; to: Cell; actor?: string; hit?: boolean; cells?: Cell[]; amount?: number }
export interface BattleEvent { title: string; detail: string; kind: "roll" | "move" | "damage" | "spell" | "turn" | "effect"; total?: number; formula?: string }
export interface TacticalState { version: 1; setup: TacticalSetup; actors: TacticalActor[]; order: string[]; cursor: number; round: number; status: "active" | "won" | "lost"; log: BattleEvent[]; hint: string; autoReactions: boolean; visuals?: BattleVisual[] }
export type TacticalIntent =
  | { type: "move"; to: Cell; step?: boolean }
  | { type: "attack"; target: string; weapon: number; extra?: boolean }
  | { type: "swap"; weapon: 0 | 1 }
  | { type: "grip"; hands: 1 | 2 }
  | { type: "spell"; spell: string; targets: string[]; point?: Cell }
  | { type: "action"; action: "defend" | "dash" | "disengage" | "stand" | "hide" | "demoralize" | "trip" | "grapple" | "shove" | "escape" | "interact"; target?: string }
  | { type: "end" }
  | { type: "save"; target: string; save: SaveKey; dc: number }
  | { type: "roll"; formula: string }
  | { type: "effect"; target: string; effect: EffectId; value: number }
  | FeatureIntent;
export type FeatureIntent = { type: "feature"; feature: "wind" | "surge" } | { type: "skill"; skill: string; dc: number; visual?: boolean };
export type BattleRoller = (formula: string, label: string) => number;
export class RollRequired extends Error { constructor(public formula: string, public label: string, public min: number, public max: number) { super(label); } }

export function rollBounds(formula: string): { min: number; max: number } {
  if (formula.length > 60 || !/^[\ddкК+\-*/().\s]+$/.test(formula)) throw new Error("Формула: например, 1к20+5 или 2к6. Только обычные кости и арифметика.");
  const normalized = formula.replace(/[кК]/g, "d");
  const parts = normalized.match(/\d+d\d+/g) ?? [];
  if (parts.length > 12 || parts.some(part => { const [n, d] = part.split("d").map(Number); return n > 100 || d > 1000 || n < 1 || d < 1; })) throw new Error("Слишком большой бросок: до 100 костей в группе, до к1000.");
  const roll = new DiceRoll(normalized);
  if (!Number.isFinite(roll.minTotal) || !Number.isFinite(roll.maxTotal)) throw new Error("Неверная формула.");
  return { min: roll.minTotal, max: roll.maxTotal };
}

export function battleRoller(manual: boolean, values: number[], automatic: number[] = []): BattleRoller {
  let cursor = 0;
  return (formula, label) => {
    const { min, max } = rollBounds(formula);
    const at = cursor++;
    if (manual && values[at] == null) throw new RollRequired(formula, label, min, max);
    const value = manual ? values[at] : automatic[at] ?? Number(new DiceRoll(formula.replace(/[кК]/g, "d")).total);
    if (!Number.isFinite(value) || value < min || value > max || !Number.isInteger(value)) throw new Error(`Результат должен быть целым числом от ${min} до ${max}.`);
    return value;
  };
}

export const currentActor = (state: TacticalState) => state.actors.find(actor => actor.id === state.order[state.cursor])!;
export const heroActor = (state: TacticalState) => state.actors.find(actor => actor.id === "hero")!;
const RUNE_DC = 14;
export function runeHint(system: Character["system"]) {
  return system === "pf2e"
    ? `Учебная руна: вход вызывает разряд. Рефлексы СЛ ${RUNE_DC}, 1к6 урона: 0 / половина / полный / двойной по ступени.`
    : `Учебная руна: вход вызывает разряд. Спасбросок Ловкости СЛ ${RUNE_DC}, 1к6 урона (половина при успехе).`;
}

export function lightPair(hero: Character, stats: TrainingStats) {
  return hero.system === "dnd5e" && !stats.shield && stats.weapons.length === 2 &&
    stats.weapons.every(weapon => weapon.light && !weapon.unarmed && !weapon.ranged && weapon.hands === 1);
}

export function lightExtraBlock(hero: Character, actor: TacticalActor, stats: TrainingStats, index: number): string {
  if (!lightPair(hero, stats) || !stats.weapons[index]) return "Нужны два разных лёгких оружия в руках.";
  if (actor.lightExtraUsed) return "Дополнительная атака лёгким оружием уже сделана в этом ходу.";
  if (!((actor.lightAttacks ?? 0) & (index === 0 ? 2 : 1))) return "Сначала атакуйте другим лёгким оружием основным действием.";
  if (!stats.weapons[index].nick && !actor.dnd.bonus) return "Нужно свободное бонусное действие.";
  return "";
}

export function lightExtraDamage(hero: Character, weapon: TrainingWeapon): string | null {
  const formula = damageFormula(weapon.damage);
  const style = hero.fightingStyle === "twf" || hero.dnd?.choices.some(row => row.level <= hero.level && row.source === "style" && row.pick === "twf");
  const omitted = style ? 0 : Math.max(0, weapon.abilityBonus ?? 0);
  if (!formula || !omitted) return formula;
  const flat = formula.match(/([+-]\d+)$/);
  if (!flat) return `${formula}-${omitted}`;
  const remainder = Number(flat[0]) - omitted;
  return formula.slice(0, -flat[0].length) + (remainder > 0 ? `+${remainder}` : remainder < 0 ? String(remainder) : "");
}

export function tacticalStats(hero: Character, active: number): TrainingStats {
  const spare = hero.items.find(item => item.uid === "training-spare");
  if (!spare || spare.equipped || active === 0) return trainingStats(hero);
  const primary = hero.items.find(item => item.kind === "weapon" && item.equipped);
  const stats = trainingStats({ ...hero, items: hero.items.map(item => item === primary ? { ...item, equipped: false } : item === spare ? { ...item, equipped: true } : item) });
  if (!primary) return stats;
  const original = trainingStats(hero);
  return { ...stats, weapons: [original.weapons[0], stats.weapons[0]] };
}
const effect = (actor: TacticalActor, id: EffectId) => Math.max(0, ...actor.effects.filter(row => row.id === id).map(row => row.value));
function requireRule(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function addLog(state: TacticalState, title: string, detail: string, kind: BattleEvent["kind"] = "effect", extra?: Partial<BattleEvent>) { state.log.push({ title, detail, kind, ...extra }); state.log = state.log.slice(-150); }
function cue(state: TacticalState, visual: BattleVisual) { (state.visuals ??= []).push(structuredClone(visual)); }
function spellVisual(id: string): BattleVisual["kind"] { return /fire|flame|burning/.test(id) ? "fire" : /frost/.test(id) ? "cold" : /electric/.test(id) ? "lightning" : /heal|cure/.test(id) ? "heal" : /fear/.test(id) ? "fear" : /shield|bless|sure/.test(id) ? "ward" : "force"; }
export function actorSight(state: TacticalState, hero: Character, from: TacticalActor, to: Cell) {
  return sightAt(battleMap(state.setup.map), from.pos, to, hero, state.setup.environment ?? DEFAULT_ENVIRONMENT, heroActor(state).pos, from.id === "hero");
}
function addEffect(actor: TacticalActor, row: TacticalEffect) { actor.effects = [...actor.effects.filter(old => old.id !== row.id || old.source !== row.source), row]; }
function untilNext(actor: TacticalActor): TacticalEffect["expires"] { return { actor: actor.id, turn: actor.turns + 1, phase: "start" }; }
function removeConcentration(state: TacticalState, source: TacticalActor) {
  if (!source.concentration) return;
  for (const actor of state.actors) actor.effects = actor.effects.filter(row => !(row.source === source.id && row.id === "bless"));
  addLog(state, "Концентрация закончилась", `${source.name}: ${source.concentration}.`); source.concentration = undefined;
}

function heroData(hero: Character): TacticalActor {
  const stats = trainingStats(hero), nums = spellNumbers(hero);
  const dnd = hero.system === "dnd5e" ? sheetDnd(hero) : null;
  const pf = hero.system === "pf2e" && hero.progress ? derive({ progress: hero.progress, items: hero.items, level: hero.level, customEffects: effectsFrom(hero) }) : null;
  const saves: Record<string, number> = {};
  for (const key of ["str", "dex", "con", "int", "wis", "cha"] as const) saves[key] = dnd?.saves[key].value ?? saveMod(hero, key, key);
  for (const [key, ability] of [["fort", "con"], ["ref", "dex"], ["will", "wis"]] as const) saves[key] = pf?.saves[key].value ?? saveMod(hero, key, ability);
  const slots: Record<string, number> = {};
  for (const slot of hero.slots.filter(row => row.rank > 0 && row.note !== "шрифт")) slots[slot.rank] = (slots[slot.rank] ?? 0) + slot.max;
  return { id: "hero", name: hero.name, team: "party", pos: { x: 2, y: 6 }, hp: stats.hp, maxHp: stats.hp, ac: stats.ac, attack: stats.weapons[0]?.attack ?? nums?.attack ?? 0, damage: stats.weapons[0]?.damage ?? "1d4", speed: stats.speed, initiative: dnd?.initiative.value ?? pf?.initiative.value ?? initiativeOf(hero).value, saves, portrait: hero.photo || portraitSrc(hero.ancestryId, hero.classId) || "art/dwarf-portrait.jpg", effects: [], pf: emptyCombat(), dnd: emptyDndCombat(), move: stats.speed, turns: 0, diagonals: 0, disengaged: false, slotSpent: false, slots, opportunity: hero.system === "dnd5e" || characterHasFeat(hero, "reactive-strike") || hero.classId === "fighter", demoralizedBy: [] };
}

export function startTactical(hero: Character, setup: TacticalSetup, roller: BattleRoller): TacticalState {
  requireRule(hero.rules?.edition !== "dnd-2014" && hero.rules?.edition !== "pf-legacy", "Этот учебный стол использует D&D 2024 и Pathfinder Remaster. Выберите учебного героя подходящей редакции.");
  const player = heroData(hero); player.dnd = emptyDndCombat(hero.system === "dnd5e" ? sheetDnd(hero)?.resources : []); const power = setup.difficulty === "hard" ? 2 : setup.difficulty === "easy" ? -2 : 0;
  if (setup.grip === 2) {
    const stats = trainingStats(hero);
    requireRule(hero.system === "pf2e" && stats.weapons[0]?.twoHandDie && !stats.shield, "Для двуручного хвата нужно подходящее оружие и свободная рука.");
    player.grip = 2;
  }
  if (hero.system === "pf2e" && ["prepared", "book"].includes(hero.spellcasting?.kind ?? "")) {
    player.preparedSlots = {};
    for (const id of hero.preparedIds) if (hero.spells.find(spell => spell.id === id)?.level === 1) player.preparedSlots[id] = (player.preparedSlots[id] ?? 0) + 1;
  }
  player.font = hero.slots.filter(slot => slot.note === "шрифт" && slot.rank === 1).reduce((sum, slot) => sum + slot.max, 0);
  const shield = hero.items.find(item => item.kind === "shield" && item.equipped)?.shield;
  player.shieldHp = shield?.hp ?? 20; player.shieldMax = player.shieldHp;
  if (trainingStats(hero).weapons[0]?.ranged) player.opportunity = false;
  const npc = (id: string, name: string, pos: Cell, team: TacticalActor["team"], caster = false): TacticalActor => ({ ...structuredClone(player), id, name, pos, team, portrait: team === "party" ? "art/elf-portrait.jpg" : caster ? "art/goblin-portrait.jpg" : "art/orc-portrait.jpg", hp: Math.max(8, Math.round(player.maxHp * (setup.difficulty === "hard" ? 1 : 0.7))), maxHp: Math.max(8, Math.round(player.maxHp * (setup.difficulty === "hard" ? 1 : 0.7))), ac: Math.max(10, player.attack + 9 + power), attack: player.ac - 11 + power, damage: `1d6+${Math.floor(hero.level / 3)}`, speed: 25, initiative: 2 + power, saves: Object.fromEntries(Object.keys(SAVES).map(key => [key, Math.max(1, player.attack - 3 + power)])), slots: {}, caster, opportunity: team === "enemy" && !caster && setup.scenario !== "dummy" });
  const ally = npc("ally", "Союзник Лис", { x: 2, y: 3 }, "party");
  if (setup.ally !== "fighter") ally.hp = Math.max(1, Math.floor(ally.maxHp / 2));
  ally.opportunity = false;
  const guard = npc("guard", setup.scenario === "dummy" ? "Манекен" : "Учебный страж", setup.scenario === "duel" ? { x: 7, y: 6 } : { x: 8, y: 3 }, "enemy"); guard.dummy = setup.scenario === "dummy";
  const actors = setup.ally === "none" ? [player, guard] : [player, ally, guard];
  if (setup.scenario !== "duel") { const caster = npc("caster", setup.scenario === "dummy" ? "Второй манекен" : "Учебный чародей", { x: 9, y: 6 }, "enemy", true); caster.dummy = setup.scenario === "dummy"; actors.push(caster); }
  const state: TacticalState = { version: 1, setup, actors, order: [], cursor: 0, round: 1, status: "active", log: [], hint: "Выберите действие и цель. В журнале раскрывается каждый расчёт.", autoReactions: true };
  for (const actor of actors) {
    const die = roller("1d20", `Инициатива: ${actor.name}`); actor.initiative += die;
    addLog(state, `Инициатива · ${actor.name}`, `к20 ${die} ${fmt(actor.initiative - die)} = ${actor.initiative}.`, "roll", { total: die, formula: "1d20" });
  }
  state.order = [...actors].sort((a, b) => b.initiative - a.initiative || (a.id === "hero" ? -1 : a.id.localeCompare(b.id))).map(actor => actor.id);
  beginTurn(state, currentActor(state), hero);
  advanceNpcs(state, hero, roller);
  return state;
}

function expire(state: TacticalState, actor: TacticalActor, phase: "start" | "end") {
  for (const target of state.actors) target.effects = target.effects.filter(row => !(row.expires && row.expires.actor === actor.id && row.expires.phase === phase && row.expires.turn <= actor.turns));
}
function beginTurn(state: TacticalState, actor: TacticalActor, hero: Character) {
  for (const row of state.actors) row.slotSpent = false;
  actor.turns++; expire(state, actor, "start"); actor.pf = pfRound(actor.pf).state; actor.dnd = dndRound(actor.dnd).state; actor.diagonals = 0; actor.disengaged = false; actor.slotSpent = false;
  actor.escapeLocked = false;
  actor.extraActionAvailable = false; actor.surgeUsed = false;
  actor.lightAttacks = 0; actor.lightExtraUsed = false; actor.weaponSwapUsed = false;
  actor.move = Math.max(0, actor.speed - effect(actor, "cold"));
  if (actor.hp > 0) addLog(state, `Ход · ${actor.name}`, hero.system === "pf2e" ? "Три действия и реакция обновились. Здоровье и ячейки не восстановились." : "Действие, бонусное действие, реакция и движение обновились. Здоровье и ячейки не восстановились.", "turn");
}
function finishTurn(state: TacticalState, hero: Character, actor: TacticalActor) {
  expire(state, actor, "end");
  if (hero.system === "pf2e") for (const row of actor.effects.filter(row => row.id === "frightened")) row.value--;
  actor.effects = actor.effects.filter(row => row.value > 0);
  state.cursor++;
  if (state.cursor >= state.order.length) { state.cursor = 0; state.round++; }
  beginTurn(state, currentActor(state), hero);
}

function spend(actor: TacticalActor, hero: Character, cost: number, bonus = false, attacking = false, magic = false) {
  requireRule(actor.hp > 0, "Персонаж без сознания и не может действовать.");
  if (hero.system === "pf2e") { requireRule(actor.pf.actions >= cost, `Нужно действий: ${cost}; осталось ${actor.pf.actions}.`); actor.pf.actions -= cost; }
  else if (bonus) { requireRule(actor.dnd.bonus, "Бонусное действие уже потрачено."); actor.dnd.bonus = false; }
  else if (attacking) {
    const cap = actor.id === "hero" ? trainingStats(hero).perAction : 1;
    if (!actor.dnd.action && actor.extraActionAvailable) { actor.extraActionAvailable = false; actor.dnd = { ...actor.dnd, action: true, attacks: 0 }; }
    requireRule(actor.dnd.action, "Атаки этого хода закончены или основное действие уже потрачено."); actor.dnd = spendAttack(actor.dnd, cap).state;
  } else if (actor.dnd.action && actor.dnd.attacks === 0) actor.dnd.action = false;
  else if (!magic && actor.extraActionAvailable) actor.extraActionAvailable = false;
  else throw new Error(magic && actor.extraActionAvailable ? "Всплеском действий нельзя взять магическое действие." : "Основное действие уже занято атакой или потрачено.");
}

function bonusFor(state: TacticalState, hero: Character, actor: TacticalActor, roller: BattleRoller, save = false, strength = false): number {
  const penalty = hero.system === "pf2e" ? Math.max(effect(actor, "frightened"), strength ? effect(actor, "enfeebled") : 0) : 0;
  let bonus = -penalty;
  for (const bless of actor.effects.filter(row => row.id === "bless")) {
    const source = state.actors.find(row => row.id === bless.source);
    if (!source || source.hp <= 0) continue;
    if (hero.system === "dnd5e") bonus += roller("1d4", `Благословение: ${actor.name}`);
    else if (!save && gridDistance(actor.pos, source.pos, hero.system) <= 15) bonus = Math.max(bonus, 1 - penalty);
  }
  return bonus;
}

function savingThrow(state: TacticalState, hero: Character, actor: TacticalActor, key: SaveKey, dc: number, roller: BattleRoller): number {
  const first = roller("1d20", `${SAVES[key]}: ${actor.name}`);
  const dodge = hero.system === "dnd5e" && key === "dex" && effect(actor, "dodge") && !effect(actor, "grabbed");
  const natural = dodge ? Math.max(first, roller("1d20", "Уклонение: преимущество на спасбросок Ловкости")) : first;
  const bonus = (actor.saves[key] ?? 0) + bonusFor(state, hero, actor, roller, true);
  const total = natural + bonus;
  const verdict = hero.system === "pf2e" ? resolveCheck("pf2e", natural, bonus, dc).verdict : total >= dc ? "успех" : "провал";
  const degree = verdict === "критический успех" ? 3 : verdict === "успех" ? 2 : verdict === "критический провал" ? 0 : 1;
  addLog(state, `${SAVES[key]} · ${actor.name}`, `к20 ${natural} ${fmt(bonus)} = ${total} против СЛ ${dc}: ${verdict}. ${hero.system === "pf2e" ? "Разница 10 и натуральные 1/20 меняют ступень." : "Натуральная 20 не превращает обычный спасбросок в автоматический успех."}`, "roll", { total: natural, formula: "1d20" });
  return degree;
}

function hurt(state: TacticalState, hero: Character, target: TacticalActor, raw: number, roller: BattleRoller, physical = false) {
  let amount = Math.max(0, Math.floor(raw));
  if (hero.system === "pf2e" && target.id === "hero" && state.autoReactions && target.pf.reaction) {
    const magic = effect(target, "magic-shield") && !target.shieldSpent;
    const shield = physical && effect(target, "shield") && characterHasFeat(hero, "shield-block");
    if (magic || shield) {
      const hardness = magic ? 5 * Math.ceil(hero.level / 4) : hero.items.find(item => item.kind === "shield" && item.equipped)?.shield?.hardness ?? 3;
      amount = Math.max(0, amount - hardness); target.pf.reaction = false;
      if (magic) { target.shieldSpent = true; target.effects = target.effects.filter(row => row.id !== "magic-shield"); }
      else { target.shieldHp = Math.max(0, (target.shieldHp ?? 20) - amount); const bt = hero.items.find(item => item.kind === "shield" && item.equipped)?.shield?.bt ?? 10; if (target.shieldHp <= bt) target.effects = target.effects.filter(row => row.id !== "shield"); }
      addLog(state, "Реакция · блок щитом", `Поглощено до ${hardness} урона. ${magic ? "Магический щит разрушен до новой тренировки." : `Остаток урона получили вы и щит. Прочность щита ${target.shieldHp}/${target.shieldMax}. Сломанный щит больше не защищает.`}`);
    }
  }
  target.hp = Math.max(0, target.hp - amount);
  addLog(state, `${target.name} · −${amount} здоровья`, `${target.hp} из ${target.maxHp}.`, "damage");
  if (target.concentration && amount > 0 && hero.system === "dnd5e") {
    const dc = Math.max(10, Math.floor(amount / 2));
    if (target.hp === 0 || savingThrow(state, hero, target, "con", dc, roller) < 2) removeConcentration(state, target);
  }
  if (target.hp === 0) {
    removeConcentration(state, target);
    for (const actor of state.actors) actor.effects = actor.effects.filter(row => row.source !== target.id || row.id !== "grabbed");
  }
  if (heroActor(state).hp === 0) { state.status = "lost"; state.hint = "Тренировка закончилась поражением. Настоящий герой не пострадал; можно попробовать другой класс или тактику."; }
  else if (state.actors.filter(row => row.team === "enemy").every(row => row.hp === 0)) { state.status = "won"; state.hint = "Победа! Посмотрите журнал, затем сравните другую тактику, снаряжение или класс."; }
}

export function effectiveAc(actor: TacticalActor, system: Character["system"]): number {
  const shield = Math.max(effect(actor, "shield") ? 2 : 0, effect(actor, "magic-shield"));
  return actor.ac + shield - (system === "pf2e" ? effect(actor, "frightened") + (effect(actor, "prone") || effect(actor, "grabbed") || effect(actor, "restrained") ? 2 : 0) : 0);
}

function attack(state: TacticalState, hero: Character, from: TacticalActor, target: TacticalActor, roller: BattleRoller, weaponIndex = 0, reaction = false, spell?: TutorialSpell, extra = false) {
  const map = battleMap(state.setup.map), stats = tacticalStats(hero, weaponIndex);
  requireRule(hero.system !== "pf2e" || !effect(from, "restrained"), "Персонаж скован: атаки недоступны, сначала освободитесь.");
  const baseWeapon = from.id === "hero" ? stats.weapons[weaponIndex] : undefined;
  requireRule(spell || from.id !== "hero" || baseWeapon, "Выберите оружие перед боем.");
  const swapping = from.id === "hero" && !spell && !reaction && !lightPair(hero, stats) && weaponIndex !== (from.activeWeapon ?? 0);
  if (swapping) {
    requireRule(hero.system === "dnd5e", "Сначала поменяйте оружие действием «Сменить оружие».");
    requireRule(!from.weaponSwapUsed, "В этом ходу учебная смена оружия уже использована.");
    requireRule(!effect(from, "restrained"), "Вы скованы: сначала освободитесь.");
  }
  const weapon = baseWeapon && weaponGrip(baseWeapon, swapping ? 1 : from.grip);
  const ranged = spell ? true : weapon?.ranged ?? Boolean(from.caster);
  const reach = spell?.range ?? (ranged ? weapon?.range ?? 60 : weapon?.reach ?? 5);
  const distance = gridDistance(from.pos, target.pos, hero.system), sight = lineOfSight(map, from.pos, target.pos);
  requireRule(target.hp > 0 && target.team !== from.team, "Нужна живая враждебная цель.");
  requireRule(distance <= reach, `До цели ${distance} футов; дальность ${reach}.`); requireRule(sight.visible, "Стена перекрывает линию атаки.");
  requireRule(!weapon?.limited || Boolean(spell), "Особый эффект этого оружия пока не поддерживается автоматически.");
  const isPf = hero.system === "pf2e";
  const penalty = isPf && !reaction ? mapPenalty(from.pf.strikes, !spell && weapon?.agile) : 0;
  if (!reaction && !spell) {
    if (extra) {
      const blocked = lightExtraBlock(hero, from, stats, weaponIndex);
      requireRule(!blocked, blocked);
      if (!weapon?.nick) spend(from, hero, 1, true);
      from.lightExtraUsed = true;
      addLog(state, "Дополнительная атака лёгким оружием", weapon?.nick ? "Рассечение (Nick): часть действия «Атака». Бонусное действие не потрачено." : "Потрачено бонусное действие.");
    } else if (isPf) {
      const step = strike(from.pf, { agile: weapon?.agile }); requireRule(step.spent, step.note); from.pf = step.state;
    } else {
      spend(from, hero, 1, false, true);
      if (lightPair(hero, stats) && weapon?.light) from.lightAttacks = (from.lightAttacks ?? 0) | (1 << weaponIndex);
      if (swapping) {
        from.activeWeapon = weaponIndex === 1 ? 1 : 0;
        from.weaponSwapUsed = true;
        from.opportunity = !ranged;
        addLog(state, "Смена оружия", `${weapon!.name}: убрать прежнее оружие свободным взаимодействием и достать новое в составе атаки.`);
      }
    }
  }
  if (spell && isPf) from.pf.strikes++;
  const innate = spell ? spellNumbers(hero)?.attack ?? 0 : weapon?.attack ?? from.attack;
  const strength = !spell && (weapon?.strengthAttack ?? !ranged);
  let bonus = innate + penalty + bonusFor(state, hero, from, roller, false, strength);
  const seen = actorSight(state, hero, from, target.pos), seenByTarget = actorSight(state, hero, target, from.pos);
  const advantage = !isPf && ((effect(target, "prone") > 0 && distance <= 5) || effect(from, "hidden") > 0 || !seenByTarget.visible);
  const disadvantage = !isPf && (!seen.visible || Boolean(effect(from, "poisoned") || effect(from, "prone") || effect(from, "frightened") || (effect(target, "dodge") && !effect(target, "grabbed"))) || Boolean(from.effects.find(row => row.id === "grabbed" && row.source !== target.id)) || (effect(target, "prone") > 0 && distance > 5) || (ranged && state.actors.some(actor => actor.team !== from.team && actor.hp > 0 && gridDistance(actor.pos, from.pos, hero.system) <= 5)));
  const flatDc = isPf ? effect(target, "hidden") || !seen.visible ? 11 : seen.concealed ? 5 : 0 : 0;
  if (flatDc) { const flat = roller("1d20", `Видимость: чистая проверка СЛ ${flatDc}`); addLog(state, "Проверка видимости", `к20 ${flat} против СЛ ${flatDc}: ${flat >= flatDc ? "цель доступна" : "не удалось различить цель"}. Действие потрачено.`, "roll"); if (flat < flatDc) return; }
  const fortune = effect(from, "fortune") > 0;
  const first = roller("1d20", `Атака: ${from.name} → ${target.name}`);
  const second = fortune || advantage !== disadvantage ? roller("1d20", fortune || advantage ? "Преимущество: вторая кость" : "Помеха: вторая кость") : first;
  const natural = fortune || (advantage && !disadvantage) ? Math.max(first, second) : disadvantage && !advantage ? Math.min(first, second) : first;
  if (fortune) { from.effects = from.effects.filter(row => row.id !== "fortune"); from.fortuneSpent = true; }
  const wasHidden = effect(from, "hidden") > 0;
  from.effects = from.effects.filter(row => row.id !== "hidden");
  if (isPf && effect(from, "prone")) bonus -= 2;
  let ac = effectiveAc(target, hero.system) + (ranged ? sight.cover : 0) - (isPf && (wasHidden || !seenByTarget.visible) && !effect(target, "prone") && !effect(target, "grabbed") ? 2 : 0);
  const critAt = from.id === "hero" && !spell ? stats.crit : 20;
  const degree = isPf ? resolveCheck("pf2e", natural, bonus, ac).verdict : natural !== 1 && (natural >= critAt || natural + bonus >= ac) ? natural >= critAt ? "критический успех" : "успех" : "провал";
  const hit = degree === "успех" || degree === "критический успех", critical = degree === "критический успех";
  if (hit && !isPf && target.id === "hero" && state.autoReactions && target.dnd.reaction && target.slots[1] > 0 && hero.spells.some(row => row.id === "shield") && (hero.preparedIds.includes("shield") || hero.bonusSpellIds.includes("shield") || ["known", "pact"].includes(hero.spellcasting?.kind ?? "")) && !target.slotSpent) {
    target.dnd.reaction = false; target.slots[1]--; target.slotSpent = true;
    addEffect(target, { id: "magic-shield", value: 5, source: target.id, expires: untilNext(target) }); ac += 5;
    addLog(state, "Реакция · Щит", `Ячейка первого круга потрачена. КБ +5 до следующего хода; новый КБ ${ac}.`);
  }
  const actualHit = hit && (isPf || critical || natural + bonus >= ac);
  const gripLabel = !spell && weapon?.twoHandDie ? (weapon.hands === 2 ? " · две руки" : " · одна рука") : "";
  cue(state, { kind: spell ? spellVisual(spell.id) : ranged ? "arrow" : "strike", from: from.pos, to: target.pos, hit: actualHit });
  addLog(state, `${spell?.name ?? weapon?.name ?? "Атака"} · ${from.name}`, `к20 ${natural} ${fmt(bonus)} = ${natural + bonus} против КБ ${ac}${ranged && sight.cover ? `, в том числе укрытие +${sight.cover}` : ""}: ${actualHit ? critical ? "критическое попадание" : "попадание" : "промах"}${penalty ? `; штраф повторной атаки ${penalty}` : ""}${advantage !== disadvantage ? disadvantage ? "; помеха" : "; преимущество" : ""}${gripLabel}.`, "roll", { total: natural, formula: "1d20" });
  if (actualHit) {
    const formula = spell ? spellDamage(spell, hero) : extra && weapon ? lightExtraDamage(hero, weapon) : damageFormula(weapon?.damage ?? from.damage);
    requireRule(formula, "Формула урона не поддерживается.");
    const turnKey = `${state.round}:${state.cursor}`;
    const allyAtTarget = state.actors.some(row => row.id !== from.id && row.team === from.team && row.hp > 0 && gridDistance(row.pos, target.pos, hero.system) <= 5);
    const sneak = !isPf && !spell && from.id === "hero" && hero.classId === "rogue" && (weapon?.finesse || weapon?.ranged) &&
      from.sneakAttackTurn !== turnKey && (advantage && !disadvantage || allyAtTarget && !(disadvantage && !advantage));
    const weakened = isPf && !spell && !ranged ? effect(from, "enfeebled") : 0;
    const damage = formula + (weakened ? `-${weakened}` : "") + (sneak ? `+${Math.ceil(hero.level / 2)}d6` : "");
    if (sneak) {
      from.sneakAttackTurn = turnKey;
      addLog(state, "Скрытая атака плута", `${critical ? 2 * Math.ceil(hero.level / 2) : Math.ceil(hero.level / 2)}к6 дополнительно: ${advantage && !disadvantage ? "преимущество" : "союзник рядом с целью"}. Один раз за ход.`);
    }
    const rolled = roller(critical ? criticalFormula(damage, hero.system) : damage, `Урон: ${spell?.name ?? weapon?.name ?? from.name}${gripLabel}`);
    hurt(state, hero, target, Math.max(isPf ? critical ? 2 : 1 : 0, rolled), roller, !spell);
    if (spell?.effect === "cold") addEffect(target, { id: "cold", value: 10, source: from.id, expires: untilNext(from) });
  }
  return actualHit && critical;
}

function pfInteractWithWeapon(state: TacticalState, hero: Character, actor: TacticalActor, roller: BattleRoller): boolean {
  requireRule(!effect(actor, "restrained"), "Вы скованы: сначала освободитесь.");
  spend(actor, hero, 1);
  if (effect(actor, "grabbed") && roller("1d20", "Взаимодействие в захвате: чистая проверка СЛ 5") < 5) return false;
  for (const enemy of state.actors.filter(row => row.team !== actor.team && row.hp > 0 && row.opportunity && row.pf.reaction && !effect(row, "restrained"))) {
    if (gridDistance(enemy.pos, actor.pos, hero.system) > 5 || !lineOfSight(battleMap(state.setup.map), enemy.pos, actor.pos).visible) continue;
    enemy.pf.reaction = false;
    addLog(state, "Провоцированная реакция", `${enemy.name} реагирует на взаимодействие с оружием.`);
    if (attack(state, hero, enemy, actor, roller, 0, true) || actor.hp <= 0) return false;
  }
  return true;
}

function swapWeapon(state: TacticalState, hero: Character, next: 0 | 1, roller: BattleRoller) {
  const actor = heroActor(state), stats = trainingStats(hero), weapon = stats.weapons[next];
  requireRule(hero.system === "pf2e" && weapon && next !== (actor.activeWeapon ?? 0), "Выберите другое оружие из снаряжения боя.");
  requireRule(!stats.shield || weapon.hands === 1, "Для двуручного оружия рука не должна быть занята щитом.");
  if (!pfInteractWithWeapon(state, hero, actor, roller)) { addLog(state, "Смена оружия сорвана", "Действие потрачено; прежнее оружие остаётся в руке."); return; }
  actor.activeWeapon = next;
  actor.grip = 1;
  actor.opportunity = !weapon.ranged && (characterHasFeat(hero, "reactive-strike") || hero.classId === "fighter");
  addLog(state, "Смена оружия", `${weapon.name} · одно действие. Штраф повторных атак не сбрасывается.`);
}

function changeGrip(state: TacticalState, hero: Character, hands: 1 | 2, roller: BattleRoller) {
  const actor = heroActor(state), stats = trainingStats(hero), weapon = stats.weapons[actor.activeWeapon ?? 0];
  requireRule(hero.system === "pf2e" && weapon?.twoHandDie, "У выбранного оружия нет другого хвата в этой тренировке.");
  requireRule(hands !== (actor.grip ?? 1), "Этот хват уже выбран.");
  if (hands === 2) {
    requireRule(!stats.shield, "Вторая рука занята щитом. Начните тренировку без щита, чтобы взять меч двумя руками.");
    if (!pfInteractWithWeapon(state, hero, actor, roller)) {
      addLog(state, "Смена хвата сорвана", "Действие потрачено; хват не изменился.");
      return;
    }
  }
  actor.grip = hands;
  addLog(state, "Смена хвата", `${weapon.name} · ${hands === 2 ? "две руки · одно действие" : "одна рука · свободное действие"}.`);
}

export function movePreview(state: TacticalState, hero: Character, to: Cell, step = false): { path: Cell[]; feet: number; allowed: boolean; reason: string } {
  const actor = heroActor(state), map = battleMap(state.setup.map);
  const occupied = state.actors.filter(row => row.id !== actor.id && row.hp > 0).map(row => row.pos);
  const path = findPath(map, actor.pos, to, occupied), cost = pathCost(map, path, hero.system, actor.diagonals);
  const speed = Math.max(0, actor.speed - effect(actor, "cold"));
  const budget = hero.system === "pf2e" ? step ? 5 : speed : actor.move;
  const reason = state.status !== "active" ? "Бой завершён." : currentActor(state).id !== "hero" ? "Сейчас чужой ход." : !path.length || path.length === 1 ? "Нет свободного пути." : effect(actor, "grabbed") || effect(actor, "restrained") ? "Вы схвачены: сначала освободитесь." : effect(actor, "prone") ? "Сначала встаньте." : hero.system === "pf2e" && actor.pf.actions < 1 ? "Нет действия на перемещение." : step && path.some(cell => map.tiles[cell.y][cell.x] === "rubble") ? "Осторожный шаг не проходит по сложной местности." : cost.feet > budget ? `Путь ${cost.feet} футов; доступно ${budget}.` : "";
  return { path, feet: cost.feet, allowed: !reason, reason };
}

function moveActor(state: TacticalState, hero: Character, actor: TacticalActor, path: Cell[], roller: BattleRoller, safe = false) {
  const map = battleMap(state.setup.map), cost = pathCost(map, path, hero.system, actor.diagonals);
  for (const next of path.slice(1)) {
    if (!safe && !actor.disengaged) for (const enemy of state.actors.filter(row => row.team !== actor.team && row.hp > 0 && row.opportunity)) {
      if (enemy.id === "hero" && !state.autoReactions) continue;
      const ready = hero.system === "pf2e" ? enemy.pf.reaction : enemy.dnd.reaction;
      if (ready && gridDistance(enemy.pos, actor.pos, hero.system) <= 5 && (hero.system === "pf2e" || gridDistance(enemy.pos, next, hero.system) > 5)) {
        if (hero.system === "pf2e") enemy.pf.reaction = false; else enemy.dnd.reaction = false;
        addLog(state, "Провоцированная реакция", `${actor.name} движется рядом с ${enemy.name}. ${hero.system === "pf2e" ? "Осторожный шаг" : "Отход отдельным действием"} позволил бы избежать реакции.`);
        attack(state, hero, enemy, actor, roller, enemy.activeWeapon ?? 0, true);
      }
    }
    if (actor.hp <= 0) break;
    const before = { ...actor.pos }; actor.pos = next;
    cue(state, { kind: "move", actor: actor.id, from: before, to: next });
    if (map.tiles[next.y][next.x] === "rune") {
      addLog(state, "Учебная руна", "Вход вызывает разряд: спасбросок, затем урон. Эта опасность — авторское упражнение, не официальная ловушка.");
      const degree = savingThrow(state, hero, actor, hero.system === "pf2e" ? "ref" : "dex", RUNE_DC, roller);
      const damage = roller("1d6", "Урон учебной руны");
      hurt(state, hero, actor, hero.system === "pf2e" ? degree === 3 ? 0 : degree === 2 ? Math.floor(damage / 2) : degree === 0 ? damage * 2 : damage : degree >= 2 ? Math.floor(damage / 2) : damage, roller);
    }
  }
  actor.diagonals = cost.diagonals;
  if (actor.effects.some(row => row.id === "hidden") && state.actors.some(enemy => enemy.team !== actor.team && enemy.hp > 0 && lineOfSight(map, actor.pos, enemy.pos).visible && lineOfSight(map, actor.pos, enemy.pos).cover === 0)) { actor.effects = actor.effects.filter(row => row.id !== "hidden"); addLog(state, "Выход из укрытия", `${actor.name} снова виден противникам.`); }
  for (const target of state.actors) target.effects = target.effects.filter(row => !["grabbed", "restrained"].includes(row.id) || row.source !== actor.id || gridDistance(target.pos, actor.pos, hero.system) <= 5);
  addLog(state, `${actor.name} · перемещение`, `${cost.feet} футов до ${String.fromCharCode(65 + actor.pos.x)}${actor.pos.y + 1}. ${hero.system === "pf2e" ? "Диагонали чередуются: 5 и 10 футов." : "Клетка, включая диагональную, стоит 5 футов."} Завалы стоят вдвое дороже.`, "move");
}

export function spellArea(state: TacticalState, hero: Character, spell: TutorialSpell, point: Cell): Cell[] {
  const map = battleMap(state.setup.map), from = heroActor(state).pos;
  if (spell.cone) return coneCells(map, from, point, spell.cone, hero.system);
  if (spell.burst) return map.tiles.flatMap((row, y) => row.flatMap((_, x) => gridDistance({ x, y }, point, hero.system) <= spell.burst! && lineOfSight(map, point, { x, y }).visible ? [{ x, y }] : []));
  return [];
}

function cast(state: TacticalState, hero: Character, intent: Extract<TacticalIntent, { type: "spell" }>, roller: BattleRoller) {
  const actor = heroActor(state), spell = tutorialSpells(hero).find(row => row.id === intent.spell);
  requireRule(hero.system !== "pf2e" || !effect(actor, "restrained"), "Вы скованы и не можете использовать манипуляции заклинания. Сначала освободитесь.");
  requireRule(spell, "Это заклинание не подготовлено или ещё не поддерживается. Учебных мага и целителя можно выбрать до боя.");
  const self = spell.kind === "shield" || spell.kind === "fortune";
  let targets = self ? [actor] : [...new Set(intent.targets)].map(id => state.actors.find(row => row.id === id)).filter((row): row is TacticalActor => Boolean(row));
  if (hero.system === "pf2e" && spell.kind === "bless") targets = state.actors.filter(row => row.team === "party");
  const area = intent.point && (spell.cone || spell.burst) ? spellArea(state, hero, spell, intent.point) : [];
  if (area.length) targets = state.actors.filter(row => row.hp > 0 && area.some(cell => sameCell(cell, row.pos)));
  requireRule(targets.length > 0, "Выберите цель или область на карте."); requireRule(targets.length <= spell.targets, `Максимум целей: ${spell.targets}.`);
  if (spell.id === "void-warp") requireRule(targets.every(target => !target.dummy), "Искажение пустоты действует на живых. Выберите упражнение с живым противником.");
  const friendly = ["heal", "bless", "shield", "fortune"].includes(spell.kind);
  if (!area.length) for (const target of targets) {
    requireRule(friendly ? target.team === actor.team : target.team !== actor.team && target.hp > 0, friendly ? "Нужна согласная союзная цель." : "Нужна живая враждебная цель.");
    if (!(hero.system === "pf2e" && spell.kind === "bless")) requireRule(gridDistance(actor.pos, target.pos, hero.system) <= spell.range && lineOfSight(battleMap(state.setup.map), actor.pos, target.pos).visible, "Цель вне дальности или за стеной.");
  }
  if (spell.burst) requireRule(intent.point && gridDistance(actor.pos, intent.point, hero.system) <= spell.range && lineOfSight(battleMap(state.setup.map), actor.pos, intent.point).visible, "Центр области вне дальности или за стеной.");
  requireRule(!(spell.kind === "shield" && actor.shieldSpent), "Магический щит уже использован для блока; нужна новая тренировка.");
  requireRule(!(spell.kind === "fortune" && actor.fortuneSpent), "Верный удар уже использован; действует временная невосприимчивость.");
  const font = hero.system === "pf2e" && spell.id === "heal" && (actor.font ?? 0) > 0;
  if (spell.rank > 0) { requireRule((actor.slots[spell.rank] ?? 0) > 0 || font, "Ячейки первого круга закончились. Заговоры можно применять без ячеек."); requireRule(hero.system !== "dnd5e" || !actor.slotSpent, "В правилах 2024 года за один ход тратится ячейка только на одно заклинание."); }
  if (spell.rank && actor.preparedSlots && !font) requireRule((actor.preparedSlots[spell.id] ?? 0) > 0, "Эта подготовленная ячейка уже потрачена. В PF каждое подготовленное заклинание занимает свою ячейку.");
  if (["sacred-flame", "magic-missile", "healing-word", "bless"].includes(spell.id) && hero.system === "dnd5e") requireRule(targets.every(target => actorSight(state, hero, actor, target.pos).visible), "Для этого заклинания нужно видеть цель.");
  spend(actor, hero, spell.cost, spell.bonus, false, true);
  if (spell.rank > 0) { if (font) actor.font!--; else { actor.slots[spell.rank]--; if (actor.preparedSlots) actor.preparedSlots[spell.id]--; } actor.slotSpent = true; }
  if (hero.system === "pf2e" && effect(actor, "grabbed") && roller("1d20", "Чистая проверка сотворения в захвате, СЛ 5") < 5) { addLog(state, "Заклинание сорвано захватом", "Действия и ячейка потрачены, эффекта нет: чистая проверка ниже СЛ 5."); return; }
  addLog(state, `${spell.name} · сотворение`, `${hero.system === "pf2e" ? `${spell.cost} действия` : spell.bonus ? "Бонусное действие" : "Основное действие"}${spell.rank ? ", ячейка первого круга потрачена" : ", ячейка не нужна"}. ${spell.explanation}`, "spell");
  if (hero.system === "pf2e" && spell.kind !== "attack" && !area.length && spell.kind !== "bless") targets = targets.filter(target => {
    if (target.id === actor.id) return true;
    const sight = actorSight(state, hero, actor, target.pos), dc = !sight.visible ? 11 : sight.concealed ? 5 : 0;
    if (!dc) return true;
    const flat = roller("1d20", `Видимость цели заклинания: СЛ ${dc}`); addLog(state, "Проверка видимости", `к20 ${flat} против СЛ ${dc}. Действия и ячейка уже потрачены.`, "roll"); return flat >= dc;
  });
  if (spell.kind !== "attack") {
    if (area.length) cue(state, { kind: spellVisual(spell.id), from: actor.pos, to: intent.point!, cells: area, hit: true });
    else for (const target of targets) cue(state, { kind: spellVisual(spell.id), from: actor.pos, to: target.pos, hit: true });
  }
  const nums = spellNumbers(hero); const dc = (nums?.dc ?? 10) - (hero.system === "pf2e" ? effect(actor, "frightened") : 0);
  if (spell.kind === "attack") for (const target of targets) attack(state, hero, actor, target, roller, 0, false, spell);
  else if (spell.kind === "shield") addEffect(actor, { id: "magic-shield", value: 1, source: actor.id, expires: untilNext(actor) });
  else if (spell.kind === "fortune") addEffect(actor, { id: "fortune", value: 1, source: actor.id, expires: { actor: actor.id, turn: actor.turns, phase: "end" } });
  else if (spell.kind === "bless") {
    if (spell.concentration) { removeConcentration(state, actor); actor.concentration = spell.name; }
    for (const target of targets) addEffect(target, { id: "bless", value: 1, source: actor.id, expires: { actor: actor.id, turn: actor.turns + 10, phase: "start" } });
  } else if (spell.kind === "heal") {
    const base = roller(spellDamage(spell, hero), spell.name) + (hero.system === "dnd5e" ? mod(hero.abilities[hero.spellcasting!.ability]) : 0);
    for (const target of targets) { const old = target.hp; target.hp = Math.min(target.maxHp, target.hp + Math.max(0, base)); addLog(state, `${target.name} · лечение`, `Восстановлено ${target.hp - old}; теперь ${target.hp}/${target.maxHp}. Максимум хитов не превышен.`, "spell"); }
  } else if (spell.kind === "auto") {
    const target = targets[0]; const damage = roller(spell.dice!, spell.name); hurt(state, hero, target, damage, roller);
  } else {
    const damage = spell.kind === "fear" ? 0 : roller(spellDamage(spell, hero), `Урон: ${spell.name}`);
    for (const target of targets) {
      const degree = savingThrow(state, hero, target, spell.save!, dc, roller);
      if (spell.kind === "fear") {
        if (degree < 3) addEffect(target, { id: "frightened", value: 3 - degree, source: actor.id });
        if (degree === 0) addEffect(target, { id: "fleeing", value: 1, source: actor.id, expires: { actor: target.id, turn: target.turns + 1, phase: "end" } });
      } else {
        const dealt = hero.system === "pf2e" ? degree === 3 ? 0 : degree === 2 ? Math.floor(damage / 2) : degree === 0 ? damage * 2 : damage : degree >= 2 ? spell.half ? Math.floor(damage / 2) : 0 : damage;
        hurt(state, hero, target, dealt, roller);
        if (spell.id === "void-warp" && degree === 0 && target.hp > 0) {
          addEffect(target, { id: "enfeebled", value: 1, source: actor.id, expires: untilNext(actor) });
          addLog(state, "Ослаблен 1", `${target.name}: −1 к броскам и СЛ на Силе до начала следующего хода заклинателя.`);
        }
      }
    }
  }
  state.hint = `Применено: ${spell.name}. Посмотрите спасброски, здоровье и значки состояний; они уже влияют на следующие действия.`;
}

function basicAction(state: TacticalState, hero: Character, action: Extract<TacticalIntent, { type: "action" }>, roller: BattleRoller) {
  const actor = heroActor(state), isPf = hero.system === "pf2e", target = state.actors.find(row => row.id === action.target);
  requireRule(!isPf || !effect(actor, "restrained") || !["trip", "grapple", "shove", "interact"].includes(action.action), "Вы скованы: сначала освободитесь.");
  if (action.action === "stand") {
    requireRule(effect(actor, "prone"), "Вы уже стоите.");
    if (isPf) spend(actor, hero, 1); else { requireRule(actor.move >= Math.floor(actor.speed / 2), "На подъём нужна половина скорости."); actor.move -= Math.floor(actor.speed / 2); }
    actor.effects = actor.effects.filter(row => row.id !== "prone");
  } else if (action.action === "defend") {
    requireRule(!isPf || trainingStats(hero).shield, "Нужен щит в руке.");
    if (isPf) requireRule((actor.shieldHp ?? 20) > (hero.items.find(item => item.kind === "shield" && item.equipped)?.shield?.bt ?? 10), "Щит сломан: нужна новая тренировка или другой щит.");
    spend(actor, hero, 1);
    addEffect(actor, { id: isPf ? "shield" : "dodge", value: isPf ? 2 : 1, source: actor.id, expires: untilNext(actor) });
  } else if (action.action === "dash") { requireRule(!isPf, "В PF перемещайтесь ещё раз, потратив действие."); spend(actor, hero, 1); actor.move += actor.speed - effect(actor, "cold"); }
  else if (action.action === "disengage") { requireRule(!isPf, "В PF вместо Отхода используйте осторожный шаг на одну клетку."); spend(actor, hero, 1); actor.disengaged = true; }
  else if (action.action === "hide") {
    const map = battleMap(state.setup.map);
    requireRule(state.actors.filter(row => row.team !== actor.team && row.hp > 0).every(enemy => { const sight = lineOfSight(map, actor.pos, enemy.pos); return !sight.visible || (isPf && sight.cover > 0); }), "Чтобы спрятаться, сначала уйдите за достаточное укрытие от всех наблюдателей.");
    spend(actor, hero, 1); const bonus = skillRows(hero).find(row => row.id === "stealth")?.mod ?? 0;
    const natural = roller("1d20", "Скрытность"), dc = isPf ? Math.max(10, ...state.actors.filter(row => row.team === "enemy").map(row => 10 + row.saves.will)) : 15;
    if (natural + bonus >= dc) addEffect(actor, { id: "hidden", value: 1, source: actor.id });
    addLog(state, "Скрытность", `к20 ${natural} ${fmt(bonus)} против ${dc}: ${natural + bonus >= dc ? "успех" : "провал"}.`, "roll", { total: natural, formula: "1d20" });
  } else if (action.action === "interact") { spend(actor, hero, 1); addLog(state, "Взаимодействие", "Учебный рычаг щёлкнул. Это отдельное действие; предметы настоящего листа не меняются."); }
  else if (action.action === "escape") {
    requireRule(effect(actor, "grabbed") || effect(actor, "restrained"), "Вас никто не держит.");
    requireRule(!actor.escapeLocked, "После критического провала PF повторить освобождение в этом ходу нельзя.");
    const hold = actor.effects.find(row => row.id === "grabbed" || row.id === "restrained")!, source = state.actors.find(row => row.id === hold.source);
    const bonus = Math.max(...skillRows(hero).filter(row => ["athletics", "acrobatics"].includes(row.id)).map(row => row.mod), mod(hero.abilities.str));
    spend(actor, hero, 1); const penalty = isPf ? mapPenalty(actor.pf.strikes++) : 0;
    const natural = roller("1d20", "Освободиться"), dc = hold.dc ?? (source ? 10 + source.attack : 15);
    const verdict = isPf ? resolveCheck("pf2e", natural, bonus + penalty, dc).verdict : natural + bonus >= dc ? "успех" : "провал";
    if (verdict === "успех" || verdict === "критический успех") actor.effects = actor.effects.filter(row => row.id !== "grabbed" && row.id !== "restrained");
    if (verdict === "критический провал") actor.escapeLocked = true;
    addLog(state, "Освободиться", `к20 ${natural} ${fmt(bonus + penalty)} против СЛ ${dc}. ${effect(actor, "grabbed") ? "Захват остаётся." : "Вы свободны."}`, "roll", { total: natural, formula: "1d20" });
  } else {
    requireRule(target && target.team === "enemy" && target.hp > 0, "Выберите живого противника.");
    const distance = gridDistance(actor.pos, target.pos, hero.system);
    requireRule(lineOfSight(battleMap(state.setup.map), actor.pos, target.pos).visible, "Стена закрывает цель.");
    if (action.action === "demoralize") {
      requireRule(isPf, "Деморализация как это действие относится к Pathfinder."); requireRule(distance <= 30, "Деморализация действует в 30 футах."); requireRule(!target.demoralizedBy.includes(actor.id), "Цель уже невосприимчива к вашей деморализации в этой тренировке.");
      spend(actor, hero, 1); target.demoralizedBy.push(actor.id);
      const bonus = (skillRows(hero).find(row => row.id === "intimidation")?.mod ?? 0) - effect(actor, "frightened");
      const die = roller("1d20", "Деморализация"), dc = 10 + target.saves.will - effect(target, "frightened");
      const verdict = resolveCheck("pf2e", die, bonus, dc).verdict;
      if (verdict === "успех" || verdict === "критический успех") addEffect(target, { id: "frightened", value: verdict === "успех" ? 1 : 2, source: actor.id });
      addLog(state, "Деморализация", `Общий язык предполагается. к20 ${die} ${fmt(bonus)} против СЛ Воли ${dc}: ${verdict}. Повторная попытка недоступна 10 минут.`, "roll", { total: die, formula: "1d20" });
    } else {
      requireRule(distance <= 5, "Подойдите на соседнюю клетку.");
      const stats = trainingStats(hero); requireRule(!stats.shield && !lightPair(hero, stats) && actor.grip !== 2 && stats.weapons[actor.activeWeapon ?? 0]?.hands !== 2, "Для этого приёма нужна свободная рука. Освободите руку или начните бой с другим снаряжением.");
      spend(actor, hero, 1, false, !isPf);
      const bonus = skillRows(hero).find(row => row.id === "athletics")?.mod ?? 0;
      let success = false, critical = false;
      if (isPf) {
        const penalty = mapPenalty(actor.pf.strikes++, true), die = roller("1d20", "Атлетика");
        const key = action.action === "trip" ? "ref" : "fort", dc = 10 + target.saves[key] - effect(target, "frightened");
        const adjusted = bonus + penalty - Math.max(effect(actor, "enfeebled"), effect(actor, "frightened"));
        const verdict = resolveCheck("pf2e", die, adjusted, dc).verdict; success = verdict === "успех" || verdict === "критический успех"; critical = verdict === "критический успех";
        if (verdict === "критический провал") addEffect(actor, { id: action.action === "grapple" ? "grabbed" : "prone", value: 1, source: target.id, dc: 10 + target.attack });
        addLog(state, "Атлетика", `к20 ${die} ${fmt(adjusted)} против СЛ ${dc}: ${verdict}${penalty ? `; штраф повторной атаки ${fmt(penalty)}` : ""}.`, "roll", { total: die, formula: "1d20" });
      } else {
        const dc = 8 + mod(hero.abilities.str) + (2 + Math.floor((hero.level - 1) / 4));
        const key = target.saves.str >= target.saves.dex ? "str" : "dex";
        success = savingThrow(state, hero, target, key, dc, roller) < 2;
      }
      if (success && action.action === "trip") { addEffect(target, { id: "prone", value: 1, source: actor.id }); if (critical) hurt(state, hero, target, roller("1d6", "Критическое опрокидывание"), roller, true); }
      if (success && action.action === "grapple") addEffect(target, { id: isPf && critical ? "restrained" : "grabbed", value: 1, source: actor.id, dc: isPf ? 10 + bonus : 8 + mod(hero.abilities.str) + (2 + Math.floor((hero.level - 1) / 4)), expires: isPf ? { actor: actor.id, turn: actor.turns + 1, phase: "end" } : undefined });
      if (success && action.action === "shove") {
        const dx = Math.sign(target.pos.x - actor.pos.x), dy = Math.sign(target.pos.y - actor.pos.y), next = { x: target.pos.x + dx, y: target.pos.y + dy };
        if (walkable(battleMap(state.setup.map), next) && !state.actors.some(row => row.hp > 0 && sameCell(row.pos, next))) target.pos = next;
        else addLog(state, "Толчок остановлен", "За целью стена, стол или другой жетон.");
      }
    }
  }
  addLog(state, "Действие применено", ACTION_NAMES[action.action] + ". Ресурс хода изменён, смотрите счётчик и состояния.");
}

export const ACTION_NAMES = { defend: "Защита", dash: "Рывок", disengage: "Отход без провокации", stand: "Встать", hide: "Спрятаться", demoralize: "Деморализовать", trip: "Сбить с ног", grapple: "Захватить", shove: "Толкнуть", escape: "Освободиться", interact: "Взаимодействовать" };

function npcTurn(state: TacticalState, hero: Character, npc: TacticalActor, roller: BattleRoller) {
  if (npc.hp === 0 || npc.dummy) return;
  if (npc.team === "party" && state.setup.ally !== "fighter") { addEffect(npc, { id: hero.system === "pf2e" ? "shield" : "dodge", value: 2, source: npc.id, expires: untilNext(npc) }); addLog(state, "Союзник держит позицию", "Лис защищается и остаётся целью для упражнений в поддержке и лечении."); return; }
  if (hero.system === "pf2e" && effect(npc, "restrained")) {
    const hold = npc.effects.find(row => row.id === "restrained")!; const die = roller("1d20", `Освободиться: ${npc.name}`);
    const result = resolveCheck("pf2e", die, npc.attack - effect(npc, "frightened"), hold.dc ?? 15).verdict;
    npc.pf.actions--; addLog(state, `${npc.name} пытается освободиться`, `к20 ${die} ${fmt(npc.attack)} против СЛ ${hold.dc ?? 15}: ${result}.`, "roll", { total: die, formula: "1d20" });
    if (result !== "успех" && result !== "критический успех") return;
    npc.effects = npc.effects.filter(row => row.id !== "restrained");
  }
  const targets = state.actors.filter(row => row.team !== npc.team && row.hp > 0 && (npc.team === "party" || row.id === "hero" || state.setup.ally === "fighter")).sort((a, b) => gridDistance(npc.pos, a.pos, hero.system) - gridDistance(npc.pos, b.pos, hero.system) || a.id.localeCompare(b.id));
  const target = targets[0], map = battleMap(state.setup.map); if (!target) return;
  if (npc.team === "party") addLog(state, "Лис вступает в бой", `Приближается к ${target.name} и атакует, если достаёт. Его действия и реакция отдельны от ваших.`);
  if (effect(npc, "prone")) { npc.effects = npc.effects.filter(row => row.id !== "prone"); if (hero.system === "pf2e") npc.pf.actions--; else npc.move -= Math.floor(npc.speed / 2); addLog(state, `${npc.name} встаёт`, "На подъём потрачен ресурс движения или действие."); }
  if (effect(npc, "fleeing")) {
    const cells = map.tiles.flatMap((row, y) => row.map((_, x) => ({ x, y }))).filter(cell => walkable(map, cell)).sort((a, b) => gridDistance(b, target.pos, hero.system) - gridDistance(a, target.pos, hero.system));
    const path = findPath(map, npc.pos, cells[0], state.actors.filter(row => row.id !== npc.id && row.hp > 0).map(row => row.pos));
    let count = 1; const fleeSpeed = (npc.speed - effect(npc, "cold")) * (hero.system === "pf2e" ? npc.pf.actions : 2); while (count < path.length && pathCost(map, path.slice(0, count + 1), hero.system).feet <= fleeSpeed) count++;
    if (count > 1) moveActor(state, hero, npc, path.slice(0, count), roller); return;
  }
  if (effect(npc, "grabbed")) { addLog(state, `${npc.name} связан захватом`, "В учебной логике удерживаемый противник не перемещается, но может атаковать рядом."); }
  const sight = lineOfSight(map, npc.pos, target.pos), rangedReady = npc.caster && sight.visible && actorSight(state, hero, npc, target.pos).visible && gridDistance(npc.pos, target.pos, hero.system) <= 60;
  if (!rangedReady && gridDistance(npc.pos, target.pos, hero.system) > 5 && !effect(npc, "grabbed") && (hero.system !== "pf2e" || npc.pf.actions > 0)) {
    const occupied = state.actors.filter(row => row.id !== npc.id && row.hp > 0).map(row => row.pos);
    const paths: Cell[][] = [];
    for (let y = target.pos.y - 1; y <= target.pos.y + 1; y++) for (let x = target.pos.x - 1; x <= target.pos.x + 1; x++) { const path = findPath(map, npc.pos, { x, y }, occupied); if (path.length) paths.push(path); }
    const path = paths.sort((a, b) => pathCost(map, a, hero.system).feet - pathCost(map, b, hero.system).feet)[0] ?? [];
    let count = 1; const budget = Math.max(0, npc.speed - effect(npc, "cold")); while (count < path.length && pathCost(map, path.slice(0, count + 1), hero.system).feet <= budget) count++;
    if (count > 1) { moveActor(state, hero, npc, path.slice(0, count), roller); if (hero.system === "pf2e") npc.pf.actions--; }
  }
  if (state.status !== "active") return;
  if (npc.caster && lineOfSight(map, npc.pos, target.pos).visible && actorSight(state, hero, npc, target.pos).visible && gridDistance(npc.pos, target.pos, hero.system) <= 60) {
    if (hero.system === "pf2e" && npc.pf.actions < 2) return;
    addLog(state, "Учебный разряд", `${npc.name} атакует магией. Бросает не заклинатель, а цель: спасбросок ${hero.system === "pf2e" ? "Рефлексов" : "Ловкости"}.`, "spell");
    const degree = savingThrow(state, hero, target, hero.system === "pf2e" ? "ref" : "dex", npc.attack + (hero.system === "pf2e" ? 10 : 8), roller);
    const damage = roller("2d4", "Учебный разряд: урон");
    cue(state, { kind: "lightning", from: npc.pos, to: target.pos, hit: degree < 3 || hero.system === "dnd5e" });
    hurt(state, hero, target, degree === 3 && hero.system === "pf2e" ? 0 : degree >= 2 ? Math.floor(damage / 2) : degree === 0 && hero.system === "pf2e" ? damage * 2 : damage, roller);
  } else if (gridDistance(npc.pos, target.pos, hero.system) <= 5 && (hero.system !== "pf2e" || npc.pf.actions > 0)) attack(state, hero, npc, target, roller);
}

function advanceNpcs(state: TacticalState, hero: Character, roller: BattleRoller) {
  let guard = 0;
  while (state.status === "active" && currentActor(state).id !== "hero" && guard++ < state.order.length * 2) {
    const actor = currentActor(state); npcTurn(state, hero, actor, roller); if (state.status === "active") finishTurn(state, hero, actor);
  }
}

export function executeTactical(hero: Character, previous: TacticalState, intent: TacticalIntent, roller: BattleRoller): TacticalState {
  const state = structuredClone(previous), actor = heroActor(state);
  state.visuals = [];
  const rawRoll = roller;
  roller = (formula, label) => { const total = rawRoll(formula, label); if (formula !== "1d20") addLog(state, label, `${formula.replace(/d/g, "к")} = ${total}.`, "roll", { total, formula }); return total; };
  if (intent.type === "roll") { const total = roller(intent.formula.replace(/[кК]/g, "d"), "Свободный бросок"); addLog(state, "Свободный бросок", `${intent.formula.replace(/d/g, "к")} = ${total}. Это проба костей: действия и здоровье не меняются.`, "roll", { total, formula: intent.formula }); return state; }
  if (intent.type === "save") {
    requireRule(Number.isInteger(intent.dc) && intent.dc >= 1 && intent.dc <= 99, "СЛ должна быть целой от 1 до 99.");
    const target = state.actors.find(row => row.id === intent.target); requireRule(target, "Выберите жетон для спасброска."); savingThrow(state, hero, target, intent.save, intent.dc, roller); return state;
  }
  if (intent.type === "skill") {
    const derived = hero.system === "pf2e" && hero.progress ? derive({ progress: hero.progress, items: hero.items, level: hero.level, customEffects: effectsFrom(hero) }) : hero.system === "dnd5e" ? sheetDnd(hero) : null;
    const skill = skillRows(hero).find(row => row.id === intent.skill) ?? (hero.system === "pf2e" && intent.skill === "perception" && derived && "perception" in derived ? { id: "perception", name: "Восприятие", mod: derived.perception.value } : undefined);
    requireRule(skill && Number.isInteger(intent.dc) && intent.dc >= 1 && intent.dc <= 99, "Выберите навык и СЛ от 1 до 99.");
    const bonus = derived?.skills[skill.id]?.value ?? skill.mod;
    const sight = actorSight(state, hero, actor, state.actors.find(row => row.id === "guard")!.pos);
    requireRule(!intent.visual || sight.visible, "Зрительная проверка невозможна: цель не видна. Это не запрет слушать или искать другим чувством.");
    const first = roller("1d20", `${skill.name}: учебная проверка`);
    const natural = intent.visual && skill.id === "perception" && sight.dimPerception ? Math.min(first, roller("1d20", "Помеха зрительной Внимательности")) : first;
    const result = resolveCheck(hero.system, natural, bonus, intent.dc);
    addLog(state, `${skill.name} · проба навыка`, `к20 ${natural} ${fmt(bonus)} против СЛ ${intent.dc}: ${result.verdict}. Это проба навыка, не автоматическое применение особой способности. Действия не тратятся.`, "roll", { total: natural, formula: "1d20" }); return state;
  }
  if (intent.type === "effect") {
    const target = state.actors.find(row => row.id === intent.target); requireRule(target && intent.effect in EFFECTS, "Нужны жетон и известное состояние.");
    requireRule(Number.isInteger(intent.value) && intent.value >= 0 && intent.value <= 4, "Значение состояния: от 0 до 4.");
    target.effects = target.effects.filter(row => row.id !== intent.effect);
    if (intent.value > 0) addEffect(target, { id: intent.effect, value: intent.value, source: "manual" });
    addLog(state, "Учебное изменение ведущего", `${target.name}: ${EFFECTS[intent.effect]} ${intent.value}. Это ручная проба эффекта, не способность героя.`); return state;
  }
  requireRule(state.status === "active", "Бой завершён. Начните новую тренировку."); requireRule(currentActor(state).id === "hero", "Сейчас не ваш ход.");
  if (intent.type === "feature") {
    requireRule(hero.system === "dnd5e" && hero.classId === "fighter", "Эта способность доступна только воину D&D.");
    if (intent.feature === "wind") {
      const step = secondWind(actor.dnd); requireRule(step.spent, step.note); actor.dnd = step.state;
      const healed = roller("1d10", "Второе дыхание") + hero.level, old = actor.hp; actor.hp = Math.min(actor.maxHp, actor.hp + healed);
      addLog(state, "Второе дыхание", `Лечение ${actor.hp - old}. Бонусное действие и использование потрачены.`, "effect"); cue(state, { kind: "heal", from: actor.pos, to: actor.pos, amount: actor.hp - old });
    } else {
      requireRule(hero.level >= 2 && (actor.dnd.resources.surge ?? 0) > 0 && !actor.surgeUsed, "Всплеск недоступен: нужен 2 уровень, использование и не чаще одного за ход.");
      actor.dnd.resources.surge--; actor.extraActionAvailable = true; actor.surgeUsed = true;
      addLog(state, "Всплеск действий", "Дополнительное действие доступно до конца хода. Его нельзя тратить на магическое действие."); cue(state, { kind: "ward", from: actor.pos, to: actor.pos });
    }
    return state;
  }
  if (intent.type === "move") {
    const preview = movePreview(state, hero, intent.to, intent.step); requireRule(preview.allowed, preview.reason);
    if (hero.system === "pf2e") spend(actor, hero, 1); else actor.move -= preview.feet;
    moveActor(state, hero, actor, preview.path, roller, Boolean(intent.step)); state.hint = `Перемещение: ${preview.feet} футов. Проверьте дальность оружия и укрытие новой позиции.`;
  } else if (intent.type === "grip") changeGrip(state, hero, intent.hands, roller);
  else if (intent.type === "swap") swapWeapon(state, hero, intent.weapon, roller);
  else if (intent.type === "attack") { const target = state.actors.find(row => row.id === intent.target); requireRule(target, "Выберите противника на карте."); attack(state, hero, actor, target, roller, intent.weapon, false, undefined, intent.extra); state.hint = "В журнале видны кость, бонус, защита и урон. Перед следующим действием оцените позицию и оставшиеся ресурсы."; }
  else if (intent.type === "spell") cast(state, hero, intent, roller);
  else if (intent.type === "action") basicAction(state, hero, intent, roller);
  else if (intent.type === "end") { finishTurn(state, hero, actor); advanceNpcs(state, hero, roller); if (state.status === "active") state.hint = "Снова ваш ход. Изучите ответы врагов, оставшиеся эффекты и ячейки; они не восстановились вместе с действиями."; }
  return state;
}
