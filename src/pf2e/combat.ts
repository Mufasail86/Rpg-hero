import type { CombatState, ItemInst } from "../types";
import { fmt } from "../types";

export interface CombatStep {
  state: CombatState;
  note: string;
  spent: boolean;
}

export function emptyCombat(): CombatState {
  return { actions: 3, reaction: true, map: 0, flourish: false, immunity: [], defense: null };
}

export function normalize(state: CombatState | undefined): CombatState {
  return { ...emptyCombat(), ...state, immunity: state?.immunity ? [...state.immunity] : [] };
}

function keep(state: CombatState, note: string): CombatStep {
  return { state, note, spent: false };
}

function nextMap(map: number): number {
  return map === 0 ? -5 : -10;
}

export function strike(state: CombatState): CombatStep {
  const current = normalize(state);
  if (current.actions < 1) return keep(current, "Нет свободного действия на удар.");
  const map = nextMap(current.map);
  return { state: { ...current, actions: current.actions - 1, map }, note: `Удар совершён. Следующий штраф повторной атаки ${map}.`, spent: true };
}

export function reactiveStrike(state: CombatState): CombatStep {
  const current = normalize(state);
  if (!current.reaction) return keep(current, "Реакция в этом раунде уже потрачена.");
  const map = nextMap(current.map);
  return {
    state: { ...current, reaction: false, map },
    note: "Внеочередная атака потратила реакцию и повысила штраф повторной атаки.",
    spent: true,
  };
}

export function knockdown(state: CombatState): CombatStep {
  const current = normalize(state);
  if (current.flourish) return keep(current, "Усилие уже потрачено в этом раунде. Нокдаун тоже с чертой «усилие».");
  if (current.actions < 2) return keep(current, "Нокдаун стоит 2 действия.");
  return {
    state: { ...current, actions: current.actions - 2, map: nextMap(current.map), flourish: true },
    note: "Нокдаун: удар и попытка сбить с ног. Усилие потрачено.",
    spent: true,
  };
}

export function parry(state: CombatState): CombatStep {
  const current = normalize(state);
  if (current.actions < 1) return keep(current, "Нет действия на парирование.");
  return {
    state: { ...current, actions: current.actions - 1, defense: "dueling-parry" },
    note: "Дуэльное парирование взято. +2 обстоятельственных к КБ до начала вашего следующего хода.",
    spent: true,
  };
}

export function doctorsVisit(state: CombatState, actions: 1 | 2): CombatStep {
  const current = normalize(state);
  if (current.flourish) return keep(current, "Усилие уже потрачено в этом раунде. Второй Визит доктора не проходит.");
  if (current.actions < actions) return keep(current, `Визит на ${actions} не помещается в оставшиеся действия.`);
  return {
    state: { ...current, flourish: true, actions: current.actions - actions },
    note: actions === 1
      ? "Визит на 1 действие: шаг и Боевая медицина или Лечение яда."
      : "Визит на 2 действия: шаг и Первая помощь или Лечение состояния.",
    spent: true,
  };
}

export function battleMedicine(state: CombatState, target: string): CombatStep {
  const current = normalize(state);
  const name = target.trim();
  if (!name) return keep(current, "Назовите цель. Без цели иммунитет не записывается.");
  if (current.immunity.some((row) => row.target === name && row.effect === "battle-medicine")) {
    return keep(current, `${name} уже в иммунитете к вашей Боевой медицине. Повтор сегодня не лечит.`);
  }
  return {
    state: { ...current, immunity: [...current.immunity, { target: name, effect: "battle-medicine" }] },
    note: `${name}: Боевая медицина применена. Иммунитет до конца дня.`,
    spent: true,
  };
}

export function newRound(state: CombatState): CombatStep {
  const current = normalize(state);
  return {
    state: { actions: 3, reaction: true, map: 0, flourish: false, immunity: current.immunity, defense: null },
    note: "Новый раунд. Иммунитет лечения по целям сохранён, парирование спало.",
    spent: false,
  };
}

export function openHelp(state: CombatState): CombatStep {
  return keep(normalize(state), "Справка открыта. Действие, реакция и иммунитет не потрачены.");
}

export function attackPreview(modifier: number, map: number): string {
  return `До броска: ${fmt(modifier + map)} (база ${fmt(modifier)}, штраф повторной атаки ${fmt(map)}).`;
}

export function handsLine(items: ItemInst[]): string {
  const held = items.filter((item) => {
    if (item.kind !== "weapon" && item.kind !== "shield") return false;
    if (item.placement === "stowed" || item.placement === "worn") return false;
    if (item.placement === "held") return true;
    return item.equipped;
  });
  if (!held.length) return "Руки свободны.";
  const used = held.reduce((sum, item) => sum + (item.kind === "shield" ? 1 : item.weapon?.hands ?? 1), 0);
  return `Занято рук: ${used}. ${held.map((item) => item.name).join(", ")}.`;
}
