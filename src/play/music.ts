export type MusicScene = "tavern" | "combat" | "bestiary";

export const MUSIC_ON_KEY = "rpg-hero-music";
export const MUSIC_VOLUME_KEY = "rpg-hero-music-volume";
export const MUSIC_CACHE = "rpg-hero-music";

export interface MusicTrack {
  id: MusicScene;
  title: string;
  file: string;
  note: string;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "tavern",
    title: "Спокойный зал",
    file: "music/tavern.ogg",
    note: "Тихий фон для города, таверны и обычных экранов.",
  },
  {
    id: "combat",
    title: "Три действия",
    file: "music/combat.ogg",
    note: "Чуть более собранный фон, когда в «Играю сейчас» выбран бой.",
  },
  {
    id: "bestiary",
    title: "Чужой след",
    file: "music/bestiary.ogg",
    note: "Низкий фон для бестиария.",
  },
];

export const MUSIC_LICENSE_RU =
  "Три коротких петли написаны для этого приложения и ниоткуда не скопированы. Автор отказывается от прав в пределах CC0 1.0: их можно копировать, менять и использовать, в том числе в своих играх, не спрашивая разрешения.";

export const MUSIC_LICENSE_EN =
  "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication. The person who associated a work with this deed has dedicated the work to the public domain by waiving all of their rights to the work worldwide under copyright law, including all related and neighboring rights, to the extent allowed by law. You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.";

export const MUSIC_LICENSE_LINK = "https://creativecommons.org/publicdomain/zero/1.0/legalcode";

export function musicSceneFor(hash: string, playScene = ""): MusicScene {
  const path = hash.replace(/^#/, "");
  if (path.startsWith("/bestiary") || path.startsWith("bestiary")) return "bestiary";
  if ((path.includes("/now") || path.endsWith("/now")) && playScene === "fight") return "combat";
  return "tavern";
}

export function readMusicOn(storage: Pick<Storage, "getItem"> | null): boolean {
  return storage?.getItem(MUSIC_ON_KEY) === "1";
}

export function readMusicVolume(storage: Pick<Storage, "getItem"> | null): number {
  const stored = storage?.getItem(MUSIC_VOLUME_KEY);
  if (stored == null || stored === "") return 0.35;
  const raw = Number(stored);
  if (!Number.isFinite(raw)) return 0.35;
  return Math.min(1, Math.max(0, raw));
}
