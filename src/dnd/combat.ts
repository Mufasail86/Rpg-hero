import type { DndCombat } from "../types";
import { fmt } from "../types";

export interface CombatStep {
  state: DndCombat;
  note: string;
  spent: boolean;
}

export function emptyDndCombat(resources: { id: string; max: number }[] = [], slots: { rank: number; max: number }[] = []): DndCombat {
  const pool: Record<string, number> = {};
  for (const resource of resources) pool[resource.id] = resource.max;
  const slotsUsed: Record<string, number> = {};
  for (const slot of slots) slotsUsed[String(slot.rank)] = 0;
  return { action: true, bonus: true, reaction: true, attacks: 0, extraAction: false, resources: pool, slotsUsed };
}

export function normalizeDnd(state: DndCombat | undefined, resources: { id: string; max: number }[] = []): DndCombat {
  const base = emptyDndCombat(resources);
  return {
    ...base,
    ...state,
    resources: { ...base.resources, ...state?.resources },
    slotsUsed: { ...base.slotsUsed, ...state?.slotsUsed },
  };
}

function keep(state: DndCombat, note: string): CombatStep {
  return { state, note, spent: false };
}

export function spendAttack(state: DndCombat, perAction: number): CombatStep {
  const current = normalizeDnd(state);
  const cap = current.extraAction ? perAction * 2 : perAction;
  if (current.attacks >= cap) return keep(current, "Атаки этого хода уже сделаны.");
  const attacks = current.attacks + 1;
  return { state: { ...current, attacks, action: attacks < cap }, note: `Атака ${attacks} из ${cap}.`, spent: true };
}

export function bonusAction(state: DndCombat, label: string): CombatStep {
  const current = normalizeDnd(state);
  if (!current.bonus) return keep(current, "Бонусное действие уже потрачено.");
  return { state: { ...current, bonus: false }, note: label, spent: true };
}

export function useReaction(state: DndCombat): CombatStep {
  const current = normalizeDnd(state);
  if (!current.reaction) return keep(current, "Реакция уже потрачена.");
  return { state: { ...current, reaction: false }, note: "Реакция потрачена.", spent: true };
}

export function secondWind(state: DndCombat): CombatStep {
  const current = normalizeDnd(state);
  if ((current.resources.wind ?? 0) <= 0) return keep(current, "Второе дыхание закончилось.");
  if (!current.bonus) return keep(current, "На Второе дыхание нужно бонусное действие.");
  return {
    state: { ...current, bonus: false, resources: { ...current.resources, wind: current.resources.wind - 1 } },
    note: "Второе дыхание: лечение 1d10 + уровень воина. Бросок костей лист не подменяет.",
    spent: true,
  };
}

export function actionSurge(state: DndCombat): CombatStep {
  const current = normalizeDnd(state);
  if ((current.resources.surge ?? 0) <= 0) return keep(current, "Всплеск действий закончился.");
  if (current.extraAction) return keep(current, "В этот ход всплеск уже взят. Второй раз за ход нельзя.");
  return {
    state: { ...current, extraAction: true, resources: { ...current.resources, surge: current.resources.surge - 1 } },
    note: "Всплеск даёт ещё одно действие. Магическое действие им взять нельзя.",
    spent: true,
  };
}

export function spendResource(state: DndCombat, id: string, label: string): CombatStep {
  const current = normalizeDnd(state);
  const left = current.resources[id] ?? 0;
  if (left <= 0) return keep(current, `${label} закончился.`);
  return {
    state: { ...current, resources: { ...current.resources, [id]: left - 1 } },
    note: `${label}: осталось ${left - 1}.`,
    spent: true,
  };
}

export function spendSlot(state: DndCombat, rank: number, max: number): CombatStep {
  const current = normalizeDnd(state);
  const key = String(rank);
  const used = current.slotsUsed[key] ?? 0;
  if (used >= max) return keep(current, `Ячейки ${rank} круга кончились.`);
  return {
    state: { ...current, slotsUsed: { ...current.slotsUsed, [key]: used + 1 } },
    note: `Потрачена ячейка ${rank} круга. Осталось ${max - used - 1}.`,
    spent: true,
  };
}

export function openHelp(state: DndCombat): CombatStep {
  return keep(normalizeDnd(state), "Справка открыта. Действие, ячейка и ресурс не потрачены.");
}

export function newRound(state: DndCombat): CombatStep {
  const current = normalizeDnd(state);
  return {
    state: { ...current, action: true, bonus: true, reaction: true, attacks: 0, extraAction: false },
    note: "Новый раунд. Ячейки и редкие ресурсы на месте.",
    spent: false,
  };
}

export function attackPreview(modifier: number): string {
  return `До броска: ${fmt(modifier)}. Справка бросок не делает.`;
}
