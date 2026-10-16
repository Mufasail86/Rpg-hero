import type { ReviewStatus } from "./editions";

/**
 * Построчная сверка с открытым справочником 5.2.1, 16 октября 2026.
 * В запись попадает только то, что сверили. Остальной пересказ остаётся pending.
 */
const on = "2026-10-16";
const version = "5.2.1";

function row(status: ReviewStatus, originalName: string, location: string) {
  return { status, checkedOn: on, sourceVersion: version, originalName, location };
}

export const REVIEW: Record<string, { status: ReviewStatus; checkedOn: string; sourceVersion: string; originalName?: string; location?: string }> = {
  "dnd-2024~spell~cure-wounds": row("verified-reference", "Cure Wounds", "SRD 5.2.1, заклинание 1-го круга"),
  "dnd-2024~spell~false-life": row("verified-reference", "False Life", "SRD 5.2.1, заклинание 1-го круга"),
  "dnd-2024~condition~exhaustion": row("verified-partial", "Exhaustion", "SRD 5.2.1, словарь состояний"),
  "dnd-2024~item~rope": row("verified-reference", "Rope", "SRD 5.2.1, снаряжение"),
  "dnd-2024~mastery~cleave": row("verified-reference", "Cleave", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~graze": row("verified-reference", "Graze", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~nick": row("verified-reference", "Nick", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~push": row("verified-reference", "Push", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~sap": row("verified-reference", "Sap", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~slow": row("verified-reference", "Slow", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~topple": row("verified-reference", "Topple", "SRD 5.2.1, свойства мастерства"),
  "dnd-2024~mastery~vex": row("verified-reference", "Vex", "SRD 5.2.1, свойства мастерства"),
};

/** Связь между записями разных редакций. Оба конца должны уже лежать в каталоге. */
export const LINKS: { from: string; to: string; note: string }[] = [];
