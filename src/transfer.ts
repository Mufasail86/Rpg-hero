import type { Character } from "./types";

export const FORMAT_VERSION = 2;

export interface SaveFile {
  app: "rpg-hero";
  version: number;
  characters: Character[];
}

export function migrateCharacter(character: Character): Character {
  return { ...character, formatVersion: character.formatVersion ?? FORMAT_VERSION };
}

export function readSave(text: string): { characters: Character[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "Файл не похож на файл обмена этого приложения. Текущие персонажи не изменены." };
  }
  const incoming = Array.isArray((parsed as SaveFile)?.characters)
    ? (parsed as SaveFile).characters
    : Array.isArray(parsed)
      ? (parsed as Character[])
      : parsed && typeof parsed === "object"
        ? [parsed as Character]
        : [];
  if (!incoming.length) return { error: "В файле нет персонажей. Текущие персонажи не изменены." };
  const characters: Character[] = [];
  for (const item of incoming) {
    if (!item || typeof item.id !== "string" || typeof item.name !== "string" || (item.system !== "dnd5e" && item.system !== "pf2e")) {
      return { error: "В файле есть запись без имени или системы. Импорт отменён, ничего не заменено." };
    }
    if (item.progress && (!Array.isArray(item.progress.choices) || typeof item.progress.classId !== "string")) {
      return { error: `У «${item.name}» сломана история развития. Импорт отменён.` };
    }
    characters.push(migrateCharacter(item));
  }
  return { characters };
}

export function previewSave(text: string): { rows: { id: string; name: string; system: Character["system"]; level: number }[] } | { error: string } {
  const read = readSave(text);
  if ("error" in read) return read;
  return {
    rows: read.characters.map((character) => ({
      id: character.id,
      name: character.name,
      system: character.system,
      level: character.level || 1,
    })),
  };
}

export function applySave(current: Character[], text: string, mode: "copy" | "update"): { characters: Character[] } | { error: string } {
  const read = readSave(text);
  if ("error" in read) return read;
  if (mode === "update") {
    const map = new Map(current.map((character) => [character.id, character]));
    for (const character of read.characters) map.set(character.id, character);
    return { characters: [...map.values()] };
  }
  const used = new Set(current.map((character) => character.id));
  const copies = read.characters.map((character) => {
    if (!used.has(character.id)) {
      used.add(character.id);
      return character;
    }
    const id = `${character.id}-copy`;
    let unique = id;
    let n = 2;
    while (used.has(unique)) {
      unique = `${id}-${n}`;
      n += 1;
    }
    used.add(unique);
    return { ...character, id: unique, name: `${character.name} (копия)` };
  });
  return { characters: [...current, ...copies] };
}

export function serialize(characters: Character[]): string {
  const file: SaveFile = { app: "rpg-hero", version: FORMAT_VERSION, characters: characters.map(migrateCharacter) };
  return JSON.stringify(file, null, 2);
}
