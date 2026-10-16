import type { RollEntry } from "../types";

export type { RollEntry };

/** Новая строка добавляется. Старые строки не пересчитываются. */
export function appendRoll(log: RollEntry[] | undefined, entry: RollEntry): RollEntry[] {
  return [...(log ?? []), { ...entry, dice: [...entry.dice] }];
}
