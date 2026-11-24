import { DiceRoll } from "@dice-roller/rpg-dice-roller";
import { catalog } from "../create";
import { sheetDnd } from "../dnd/build";
import { emptyDndCombat, spendAttack, newRound as dndRound } from "../dnd/combat";
import { derive, effectsFrom } from "../pf2e/build";
import { emptyCombat, strike, mapPenalty, newRound as pfRound } from "../pf2e/combat";
import { armorClass, attackFor, hpMax, speedOf } from "../rules";
import { resolveCheck } from "../skills/guide";
import type { Character, CombatState, DndCombat, ItemInst } from "../types";

export type TrainingAction = "attack" | "approach" | "retreat" | "defend" | "end";
export type TrainingDifficulty = "easy" | "normal" | "hard";
export interface TrainingConfig { place: "arena" | "tavern"; difficulty: TrainingDifficulty; enemy: "dummy" | "guard" | "bandit" }
export interface TrainingWeapon { name: string; attack: number; damage: string; ranged: boolean; agile: boolean; reach: number; range: number; limited: boolean }
export interface TrainingStats { hp: number; ac: number; speed: number; perAction: number; shield: boolean; crit: number; weapons: TrainingWeapon[] }
export interface TrainingState {
  round: number; hp: number; enemyHp: number; enemyMax: number; enemyAc: number; enemyAttack: number;
  distance: number; pf: CombatState; dnd: DndCombat; movement: number; defending: boolean;
  status: "active" | "won" | "lost"; log: string[]; hint: string;
}
export type Roll = (notation: string) => number;
export const rollDice: Roll = notation => Number(new DiceRoll(notation).total);
export const ENEMIES = { dummy: "Учебный манекен", guard: "Партнёр со щитом", bandit: "Тавернный задира" };

// Only arithmetic damage is automated. Unsupported effects stay visible, not silently discarded.
export function damageFormula(text: string): string | null {
  const plain = text.replace(/(?:ярость|спец\.)\s*[+−-]?\d+/g, "").replace(/рубящего|колющего|дробящего|огня|холода|электричества|кислотой|звуком|силового|некротического|излучением|ядом/g, "").replace(/\s/g, "").replace(/−/g, "-");
  return /^(?:\d+d\d+|\d+)(?:[+-](?:\d+d\d+|\d+))*$/.test(plain) ? plain : null;
}

export function criticalFormula(formula: string, system: Character["system"]): string {
  return system === "pf2e" ? `2*(${formula})` : formula.replace(/(\d+)d(\d+)/g, (_, count, sides) => `${Number(count) * 2}d${sides}`);
}

export function trainingStats(hero: Character): TrainingStats {
  const clean = { ...hero, conditions: [], conditionValues: {}, shieldRaised: false };
  const derived = hero.system === "dnd5e" ? sheetDnd(clean) : hero.progress ? derive({ progress: hero.progress, items: hero.items, level: hero.level, conditions: {}, shieldRaised: false, customEffects: effectsFrom(hero) }) : null;
  const weapons = hero.items.filter(item => item.kind === "weapon" && item.equipped && item.weapon).map(item => {
    const found = derived?.attacks.find(attack => attack.name === item.name);
    const basic = attackFor(clean, item)!;
    const damage = found?.damage ?? basic.damage;
    const catalogItem = trainingGear(hero).find(row => row.id === item.catalogId);
    const traits = `${item.weapon!.traits ?? ""} ${catalogItem?.info ?? ""}`;
    return { name: item.name, attack: found?.attack.value ?? basic.attack, damage, ranged: Boolean(item.weapon!.ranged), agile: /agile|быстро|проворн/i.test(traits) || (hero.system === "pf2e" && Boolean(item.weapon?.light)), reach: item.weapon!.reach ?? (item.catalogId === "glaive" ? 10 : 5), range: item.weapon!.range ?? 60, limited: !damageFormula(damage) || (hero.system === "pf2e" && /deadly|fatal|смертонос|смертель|фаталь|перезарядка|reload/i.test(traits)) || (hero.system === "dnd5e" && /перезарядка|loading/i.test(traits)) };
  });
  const dnd = hero.system === "dnd5e" ? sheetDnd(clean) : null;
  return { hp: derived?.hp.value ?? hpMax(clean), ac: derived?.ac.value ?? armorClass(clean).value, speed: derived?.speed.value ?? speedOf(clean).value, perAction: dnd?.attacksPerAction ?? 1, crit: Number(dnd?.crit.split("–")[0] ?? 20), shield: hero.items.some(item => item.kind === "shield" && item.equipped), weapons };
}

export function trainingGear(hero: Character) {
  return catalog(hero.system).filter(item => ["weapon", "armor", "shield"].includes(item.kind)).map(item => {
    const twoHanded = ["greatsword", "greataxe", "greatclub", "glaive", "shortbow", "longbow", "crossbow", "light-crossbow"].includes(item.id);
    return item.weapon ? { ...item, weapon: { ...item.weapon, twoHanded: item.weapon.twoHanded || twoHanded } } : item;
  });
}

export function equipTraining(hero: Character, weaponId: string, armorId: string, shield: boolean): Character {
  const copy = structuredClone(hero);
  const pool = trainingGear(hero);
  const weapon = pool.find(item => item.id === weaponId && item.kind === "weapon");
  const armor = pool.find(item => item.id === armorId && item.kind === "armor");
  const ward = shield && !weapon?.weapon?.twoHanded && weapon?.weapon?.hands !== 2 ? pool.find(item => item.kind === "shield") : undefined;
  const selected = [weapon, armor, ward].filter(item => item != null).map(item => {
    const owned = copy.items.find(row => row.catalogId === item.id && row.equipped);
    return { ...item, ...owned, uid: `training-${item.id}`, catalogId: item.id, qty: 1, equipped: true } as ItemInst;
  });
  copy.items = [...copy.items.filter(item => !["weapon", "armor", "shield"].includes(item.kind)), ...selected];
  return copy;
}

export function newTraining(hero: Character, config: TrainingConfig): TrainingState {
  const stats = trainingStats(hero);
  const power = config.difficulty === "easy" ? -2 : config.difficulty === "hard" ? 2 : 0;
  const enemyMax = Math.max(8, Math.round(stats.hp * (config.difficulty === "easy" ? 0.7 : config.difficulty === "hard" ? 1.4 : 1)));
  const attack = stats.weapons[0]?.attack ?? 3;
  return { round: 1, hp: stats.hp, enemyHp: enemyMax, enemyMax, enemyAc: Math.max(10, attack + 10 + power), enemyAttack: stats.ac - 11 + power, distance: config.enemy === "dummy" ? 5 : 20, pf: emptyCombat(), dnd: emptyDndCombat(), movement: stats.speed, defending: false, status: "active", log: ["Тренировка началась. Здоровье, вещи и опыт настоящего героя не меняются. Первый ход ваш."], hint: "Сначала оцените дистанцию: до ближнего удара нужно подойти, дальним оружием можно атаковать издалека." };
}

export function actionBlock(hero: Character, state: TrainingState, action: TrainingAction, index = 0): string | null {
  if (state.status !== "active") return "Бой завершён. Начните новую тренировку.";
  if (action === "end") return null;
  const stats = trainingStats(hero);
  if (action === "approach" || action === "retreat") {
    if (action === "approach" && state.distance <= 5) return "Вы уже рядом.";
    if (action === "retreat" && state.distance >= 60) return "Достигнут край учебной площадки.";
    if (stats.speed <= 0) return "Скорость равна нулю.";
    if (hero.system === "pf2e" ? state.pf.actions < 1 : state.movement <= 0) return "Перемещение на этот ход закончено.";
    return null;
  }
  if (hero.system === "pf2e" ? state.pf.actions < 1 : !state.dnd.action) return "Нет действия. Завершите ход.";
  if (action === "defend") {
    if (hero.system === "dnd5e" && state.dnd.attacks > 0) return "Вы уже выбрали действие атаки. Оставшиеся атаки нельзя заменить уклонением.";
    if (state.defending) return "Защита уже действует.";
    return hero.system === "pf2e" && !stats.shield ? "Для действия «Поднять щит» нужен щит." : null;
  }
  const weapon = stats.weapons[index];
  if (!weapon) return "Сначала выберите оружие в снаряжении.";
  if (weapon.limited) return "Особые эффекты этого оружия пока не автоматизированы. Для тренировки выберите обычное оружие.";
  if (state.distance > (weapon.ranged ? weapon.range : weapon.reach)) return "Цель за пределами дистанции. Подойдите ближе.";
  return null;
}

function hit(system: Character["system"], die: number, bonus: number, ac: number, crit = 20) {
  if (system === "dnd5e") return { hit: die !== 1 && (die >= crit || die + bonus >= ac), critical: die >= crit };
  const verdict = resolveCheck(system, die, bonus, ac).verdict;
  return { hit: verdict === "успех" || verdict === "критический успех", critical: verdict === "критический успех" };
}

export function trainingAction(hero: Character, current: TrainingState, config: TrainingConfig, action: TrainingAction, index = 0, roll: Roll = rollDice): TrainingState {
  const blocked = actionBlock(hero, current, action, index);
  if (blocked) return { ...current, hint: blocked };
  const state = structuredClone(current);
  const stats = trainingStats(hero);
  const log = (text: string) => { state.log = [...state.log.slice(-79), text]; };
  if (action === "attack") {
    const weapon = stats.weapons[index];
    const penalty = hero.system === "pf2e" ? mapPenalty(state.pf.strikes, weapon.agile) : 0;
    if (hero.system === "pf2e") state.pf = strike(state.pf, { agile: weapon.agile }).state;
    else state.dnd = spendAttack(state.dnd, stats.perAction).state;
    const first = roll("1d20");
    const closeRanged = hero.system === "dnd5e" && weapon.ranged && state.distance <= 5;
    const die = closeRanged ? Math.min(first, roll("1d20")) : first;
    const bonus = weapon.attack + penalty;
    const result = hit(hero.system, die, bonus, state.enemyAc, stats.crit);
    const formula = damageFormula(weapon.damage)!;
    const minimum = hero.system === "pf2e" ? result.critical ? 2 : 1 : 0;
    const damage = result.hit ? Math.max(minimum, roll(result.critical ? criticalFormula(formula, hero.system) : formula)) : 0;
    state.enemyHp = Math.max(0, state.enemyHp - damage);
    log(`${weapon.name}: кость ${die}${closeRanged ? " (помеха вблизи)" : ""} ${bonus >= 0 ? "+" : "−"} ${Math.abs(bonus)} = ${die + bonus} против КБ ${state.enemyAc}. ${result.critical ? "Критическое попадание" : result.hit ? "Попадание" : "Промах"}${damage ? `, урон ${damage}` : ""}.`);
    state.hint = hero.system === "pf2e" ? "Повторные атаки менее точны. Сравните ещё один удар с перемещением или поднятием щита." : "Проверьте оставшиеся атаки и перемещение. При завершении хода ответит противник.";
    if (state.enemyHp === 0) { state.status = "won"; state.hint = "Победа! Можно сменить снаряжение и сравнить другую тактику в новой тренировке. Настоящему герою опыт не начисляется."; }
  } else if (action === "defend") {
    state.defending = true;
    if (hero.system === "pf2e") state.pf.actions--;
    else state.dnd = { ...state.dnd, action: false, attacks: stats.perAction };
    log(hero.system === "pf2e" ? "Поднят щит: +2 к КБ до начала следующего вашего хода. Блокирование щитом отдельно не разыгрывается." : "Уклонение: видимый противник атакует с помехой до начала следующего вашего хода.");
    state.hint = "Теперь завершите ход и сравните атаку противника с вашей защитой.";
  } else if (action === "approach" || action === "retreat") {
    const move = hero.system === "pf2e" ? stats.speed : state.movement;
    const next = action === "approach" ? Math.max(5, state.distance - move) : Math.min(60, state.distance + move);
    const used = Math.abs(next - state.distance);
    state.distance = next;
    if (hero.system === "pf2e") state.pf.actions--; else state.movement -= used;
    log(`Вы ${action === "approach" ? "сблизились" : "отошли"} на ${used} футов. Дистанция ${next} футов.`);
    state.hint = "Дистанция изменилась. В этой учебной паре нет атак по возможности; в настоящем бою отход может быть опасен.";
  } else {
    log(`Ход противника · раунд ${state.round}.`);
    if (config.enemy !== "dummy") {
      if (state.distance > 5) { state.distance = Math.max(5, state.distance - 25); log(`Противник подходит: дистанция ${state.distance} футов.`); }
      if (state.distance <= 5) {
        const first = roll("1d20");
        const die = state.defending && hero.system === "dnd5e" ? Math.min(first, roll("1d20")) : first;
        const ac = stats.ac + (state.defending && hero.system === "pf2e" ? 2 : 0);
        const result = hit(hero.system, die, state.enemyAttack, ac);
        const formula = `1d6+${Math.max(0, Math.floor(hero.level / 3))}`;
        const minimum = hero.system === "pf2e" ? result.critical ? 2 : 1 : 0;
        const damage = result.hit ? Math.max(minimum, roll(result.critical ? criticalFormula(formula, hero.system) : formula)) : 0;
        state.hp = Math.max(0, state.hp - damage);
        log(`Ответ: кость ${die} ${state.enemyAttack >= 0 ? "+" : "−"} ${Math.abs(state.enemyAttack)} = ${die + state.enemyAttack} против вашей КБ ${ac}${state.defending ? " с защитой" : ""}. ${result.critical ? "Критическое попадание" : result.hit ? "Попадание" : "Промах"}${damage ? `, урон ${damage}` : ""}.`);
      } else log("Противник ещё слишком далеко для удара.");
    } else log("Манекен не отвечает: можно спокойно изучать действия.");
    if (state.hp === 0) { state.status = "lost"; state.hint = "Тренировка завершена поражением. Герой в безопасности: попробуйте щит, другой доспех или более лёгкого противника."; }
    else {
      state.round++; state.pf = pfRound(state.pf).state; state.dnd = dndRound(state.dnd).state; state.movement = stats.speed; state.defending = false;
      state.hint = `Ваш ход, раунд ${state.round}. Действия и движение восстановились, здоровье — нет.`;
    }
  }
  return state;
}
