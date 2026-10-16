import { DRAFT_KEY, SAVE_KEY, type Character, type Draft } from "./types";

export interface SaveFile {
  app: "rpg-hero";
  version: 1;
  characters: Character[];
}

export function loadCharacters(): Character[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SaveFile;
    if (!parsed || parsed.app !== "rpg-hero" || !Array.isArray(parsed.characters)) return [];
    return parsed.characters.filter((c) => c && typeof c.id === "string" && typeof c.name === "string");
  } catch {
    return [];
  }
}

export function saveCharacters(characters: Character[]) {
  const file: SaveFile = { app: "rpg-hero", version: 1, characters };
  localStorage.setItem(SAVE_KEY, JSON.stringify(file));
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
  try {
    const parsed = JSON.parse(text) as SaveFile | Character;
    const incoming = Array.isArray((parsed as SaveFile).characters)
      ? (parsed as SaveFile).characters
      : Array.isArray(parsed)
        ? (parsed as Character[])
        : [parsed as Character];
    if (!incoming.length || !incoming[0]?.id) return { error: "В файле нет персонажей." };
    const map = new Map(current.map((c) => [c.id, c]));
    let added = 0;
    for (const character of incoming) {
      if (!character?.id || !character.name || (character.system !== "dnd5e" && character.system !== "pf2e")) continue;
      if (!map.has(character.id)) added += 1;
      map.set(character.id, character);
    }
    return { characters: [...map.values()], added };
  } catch {
    return { error: "Файл не похож на JSON этого приложения." };
  }
}
