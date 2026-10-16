import { DRAFT_KEY, SAVE_KEY, type Character, type Draft } from "./types";
import { applySave, migrateCharacter, readSave, serialize } from "./transfer";

const BACKUP_KEY = "rpg-hero-backup";

export function loadCharacters(): Character[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return [];
    const read = readSave(raw);
    if ("error" in read) return [];
    return read.characters;
  } catch {
    return [];
  }
}

export function saveCharacters(characters: Character[]) {
  const previous = loadCharacters();
  const backup = serialize(previous);
  localStorage.setItem(BACKUP_KEY, backup);
  try {
    localStorage.setItem(SAVE_KEY, serialize(characters.map(migrateCharacter)));
  } catch (error) {
    localStorage.setItem(SAVE_KEY, backup);
    throw error;
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft | null) {
  if (!draft) sessionStorage.removeItem(DRAFT_KEY);
  else sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function mergeImport(current: Character[], text: string): { characters: Character[]; added: number } | { error: string } {
  const result = applySave(current, text, "update");
  if ("error" in result) return result;
  const before = new Set(current.map((character) => character.id));
  const added = result.characters.filter((character) => !before.has(character.id)).length;
  return { characters: result.characters, added };
}
