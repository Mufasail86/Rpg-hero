import { snapshot, derive, effectsFrom } from "../pf2e/build";
import { snapshotDnd, sheetDnd } from "../dnd/build";
import { refreshSlots, hpMax } from "../rules";
import type { Character } from "../types";

export const trainingSourceKey = (hero: Character) => JSON.stringify(hero, (key, value) => ["uid", "createdAt", "updatedAt"].includes(key) ? undefined : value);

export function atTrainingLevel(source: Character, level: number): Character {
  const copy = structuredClone(source);
  copy.level = Math.max(1, Math.min(20, Math.floor(level) || 1));
  if (copy.progress) copy.progress.choices = copy.progress.choices.filter(row => row.level <= copy.level);
  if (copy.progress) {
    for (const row of copy.progress.choices) {
      if (row.pick === "nimble") row.pick = "nimble-elf";
      if (row.pick === "dwarf-lore") row.pick = "dwarven-lore";
      if (row.id === "class-doctrine" && row.source === "doctrine") { row.id = "doctrine"; row.pick = row.pick === "war" ? "warpriest" : row.pick === "cloister" ? "cloistered" : row.pick; }
    }
  }
  if (copy.dnd) copy.dnd.choices = copy.dnd.choices.filter(row => row.level <= copy.level);
  copy.hpRolls = Array.from({ length: copy.level }, (_, index) => source.hpRolls[index] ?? (index ? Math.floor(copy.hitDie / 2) + 1 : copy.hitDie));
  copy.conditions = []; copy.conditionValues = {}; copy.shieldRaised = false;
  copy.hitDice = { ...copy.hitDice, max: copy.level, current: copy.level };
  const next = refreshSlots(copy.system === "pf2e" ? snapshot(copy) : snapshotDnd(copy));
  next.hpCurrent = hpMax(next);
  return next;
}

export function trainingBuild(hero: Character) {
  return hero.system === "pf2e" && hero.progress ? derive({ progress: hero.progress, items: hero.items, level: hero.level, customEffects: effectsFrom(hero) }) : hero.system === "dnd5e" ? sheetDnd(hero) : null;
}

export function mergeTrainingChoices(previous: Character, next: Character): Character {
  const copy = structuredClone(next);
  copy.hpRolls = [...previous.hpRolls]; next.hpRolls.forEach((roll, index) => { copy.hpRolls[index] = roll; });
  if (copy.progress && previous.progress) copy.progress.choices.push(...previous.progress.choices.filter(row => row.level > next.level && !copy.progress!.choices.some(choice => choice.id === row.id)));
  if (copy.dnd && previous.dnd) copy.dnd.choices.push(...previous.dnd.choices.filter(row => row.level > next.level && !copy.dnd!.choices.some(choice => choice.id === row.id)));
  return copy;
}
