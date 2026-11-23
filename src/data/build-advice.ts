import raw from "./build-advice.json";

export interface AdvicePick {
  id: string;
  reason: string;
}

export interface LevelAdvice {
  level: number;
  skills: AdvicePick[];
  feats: AdvicePick[];
  archetypes: AdvicePick[];
}

const books = raw as Record<string, Record<string, LevelAdvice[]>>;

export const ADVICE_BOOKS = ["pf-remaster", "dnd-2024", "dnd-2014"] as const;

export const ADVICE_CLASSES: Record<(typeof ADVICE_BOOKS)[number], string[]> = {
  "pf-remaster": ["fighter", "rogue", "cleric", "wizard", "champion", "bard"],
  "dnd-2024": ["fighter", "rogue", "cleric", "wizard", "paladin", "bard"],
  "dnd-2014": ["fighter", "rogue", "cleric", "wizard", "paladin", "bard"],
};

export function levelAdvice(edition: string, classId: string, level: number): LevelAdvice | null {
  return books[edition]?.[classId]?.find((row) => row.level === level) ?? null;
}

export function adviceReason(edition: string, classId: string, level: number, id: string): string | undefined {
  const row = levelAdvice(edition, classId, level);
  if (!row) return;
  return [...row.skills, ...row.feats, ...row.archetypes].find((item) => item.id === id)?.reason;
}
