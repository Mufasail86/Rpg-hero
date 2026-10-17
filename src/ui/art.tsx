import portraits from "../data/generated/portraits.json";

const base = import.meta.env.BASE_URL;
const PORTRAITS = portraits as Record<string, string>;

export const ART = {
  hero: "hero-tavern-party.jpg",
  elf: "elf-portrait.jpg",
  dwarf: "dwarf-portrait.jpg",
  orc: "orc-portrait.jpg",
  wizard: "wizard-portrait.jpg",
  goblin: "goblin-portrait.jpg",
  castle: "hill-castle.jpg",
  drake: "river-drake.jpg",
} as const;

export const ART_CAPTION = "Свой рисунок. Не официальная иллюстрация.";

export function artSrc(file: string): string {
  return `${base}art/${file}`;
}

export function portraitFile(ancestryId: string, classId?: string): string | null {
  if (PORTRAITS[ancestryId]) return PORTRAITS[ancestryId];
  if (ancestryId === "elf") return ART.elf;
  if (ancestryId === "dwarf") return ART.dwarf;
  if (ancestryId === "orc") return ART.orc;
  if (ancestryId === "goblin") return ART.goblin;
  if (classId === "wizard") return ART.wizard;
  return null;
}

export function portraitSrc(ancestryId: string, classId?: string): string | null {
  const file = portraitFile(ancestryId, classId);
  return file ? artSrc(file) : null;
}

export function cardArt(id: string): string | null {
  return portraitSrc(id, id);
}
