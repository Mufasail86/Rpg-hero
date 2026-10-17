/**
 * Бюджет встречи. Числа — из таблиц, не из головы.
 * Ремастер: Archives of Nethys, Rules.aspx?ID=2717, 2718, 2719 (GM Core).
 * Правила 2024: SRD 5.2.1, страница 202, «XP Budget per Character».
 * Справочник 5.1 таблицы порогов не содержит. Бюджет 2024 года к нему не применяется.
 */

export type PfThreat = "trivial" | "low" | "moderate" | "severe" | "extreme";
export type Dnd2024Threat = "low" | "moderate" | "high";
export type EncounterEdition = "pf-remaster" | "dnd-2024" | "dnd-2014";

export const PF_BUDGET: Record<PfThreat, { xp: number; adjust: number; orLess: boolean }> = {
  trivial: { xp: 40, adjust: 10, orLess: true },
  low: { xp: 60, adjust: 20, orLess: false },
  moderate: { xp: 80, adjust: 20, orLess: false },
  severe: { xp: 120, adjust: 30, orLess: false },
  extreme: { xp: 160, adjust: 40, orLess: false },
};

/** Опыт существа относительно уровня отряда. Вне −4…+4 в таблице нет. */
const PF_CREATURE_XP: Record<number, number> = {
  [-4]: 10,
  [-3]: 15,
  [-2]: 20,
  [-1]: 30,
  0: 40,
  1: 60,
  2: 80,
  3: 120,
  4: 160,
};

/** Опыт на одного героя. Бюджет отряда — это число, умноженное на размер отряда. */
export const DND_2024_PER_CHARACTER: Record<number, Record<Dnd2024Threat, number>> = {
  1: { low: 50, moderate: 75, high: 100 },
  2: { low: 100, moderate: 150, high: 200 },
  3: { low: 150, moderate: 225, high: 400 },
  4: { low: 250, moderate: 375, high: 500 },
  5: { low: 500, moderate: 750, high: 1100 },
  6: { low: 600, moderate: 1000, high: 1400 },
  7: { low: 750, moderate: 1300, high: 1700 },
  8: { low: 1000, moderate: 1700, high: 2100 },
  9: { low: 1300, moderate: 2000, high: 2600 },
  10: { low: 1600, moderate: 2300, high: 3100 },
  11: { low: 1900, moderate: 2900, high: 4100 },
  12: { low: 2200, moderate: 3700, high: 4700 },
  13: { low: 2600, moderate: 4200, high: 5400 },
  14: { low: 2900, moderate: 4900, high: 6200 },
  15: { low: 3300, moderate: 5400, high: 7800 },
  16: { low: 3800, moderate: 6100, high: 9800 },
  17: { low: 4500, moderate: 7200, high: 11700 },
  18: { low: 5000, moderate: 8700, high: 14200 },
  19: { low: 5500, moderate: 10700, high: 17200 },
  20: { low: 6400, moderate: 13200, high: 22000 },
};

export function pfCreatureXp(partyLevel: number, creatureLevel: number): number | null {
  const delta = creatureLevel - partyLevel;
  return PF_CREATURE_XP[delta] ?? null;
}

/** Бюджет на отряд. На каждого героя сверх четырёх прибавляется поправка, на каждого недостающего — вычитается. */
export function pfBudget(partySize: number, threat: PfThreat): { xp: number; orLess: boolean } {
  const row = PF_BUDGET[threat];
  return { xp: row.xp + (partySize - 4) * row.adjust, orLess: row.orLess };
}

/** Награда за встречу остаётся суммой опыта существ для четырёх героев и от размера отряда не зависит. */
export function pfAward(partyLevel: number, creatureLevels: number[]): { xp: number; missing: number } {
  let xp = 0;
  let missing = 0;
  for (const level of creatureLevels) {
    const cost = pfCreatureXp(partyLevel, level);
    if (cost == null) missing += 1;
    else xp += cost;
  }
  return { xp, missing };
}

export function dnd2024Budget(level: number, partySize: number, threat: Dnd2024Threat): number | null {
  const row = DND_2024_PER_CHARACTER[level];
  if (!row || partySize < 1) return null;
  return row[threat] * partySize;
}

export function dnd2014Guidance(): string {
  return "В справочнике 5.1 нет таблицы порогов сложности. Для четырёх героев ориентир такой: они должны одолеть существо той же опасности, что их уровень. Сумма ниже — это опыт из блоков, не бюджет 2024 года.";
}

export function sameEdition(edition: EncounterEdition, editions: EncounterEdition[]): boolean {
  return editions.every((item) => item === edition);
}
