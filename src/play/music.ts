export type MusicScene = "tavern" | "combat" | "creation";

export const MUSIC_ON_KEY = "rpg-hero-music";
export const MUSIC_VOLUME_KEY = "rpg-hero-music-volume";
export const MUSIC_CACHE = "rpg-hero-music";

export interface MusicTrack {
  id: MusicScene;
  title: string;
  file: string;
  note: string;
  loopFrames: number;
}

export const SCORE_SAMPLE_RATE = 48000;

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "tavern",
    title: "Свет над страницами",
    file: "music/study-score-v1.m4a",
    note: "Главная, листы, бестиарий и справочники.",
    loopFrames: 3637895,
  },
  {
    id: "combat",
    title: "Камень и отвага",
    file: "music/arena-score-v1.m4a",
    note: "Учебные бои и сцена боя в «Играю сейчас».",
    loopFrames: 3124068,
  },
  {
    id: "creation",
    title: "Перед дорогой",
    file: "music/creation-score-v1.m4a",
    note: "Создание персонажа.",
    loopFrames: 2633143,
  },
];

export const MUSIC_LICENSE_RU =
  "Три коротких петли написаны для этого приложения и ниоткуда не скопированы. Автор отказывается от прав в пределах CC0 1.0: их можно копировать, менять и использовать, в том числе в своих играх, не спрашивая разрешения.";

export const MUSIC_LICENSE_EN =
  "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication. The person who associated a work with this deed has dedicated the work to the public domain by waiving all of their rights to the work worldwide under copyright law, including all related and neighboring rights, to the extent allowed by law. You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.";

export const MUSIC_LICENSE_LINK = "https://creativecommons.org/publicdomain/zero/1.0/legalcode";

export function musicSceneFor(hash: string, playScene = ""): MusicScene {
  const path = hash.replace(/^#/, "");
  if (/^\/(new|quick)(?:\/|$)/.test(path)) return "creation";
  if (/^\/training(?:\/|$)/.test(path)) return "combat";
  if (/^\/c\/[^/]+\/now(?:\/|$)/.test(path) && playScene === "fight") return "combat";
  return "tavern";
}

export function readMusicOn(storage: Pick<Storage, "getItem"> | null): boolean {
  try { return storage?.getItem(MUSIC_ON_KEY) === "1"; } catch { return false; }
}

export function readMusicVolume(storage: Pick<Storage, "getItem"> | null): number {
  let stored: string | null | undefined;
  try { stored = storage?.getItem(MUSIC_VOLUME_KEY); } catch { return 0.35; }
  if (stored == null || stored === "") return 0.35;
  const raw = Number(stored);
  if (!Number.isFinite(raw)) return 0.35;
  return Math.min(1, Math.max(0, raw));
}
