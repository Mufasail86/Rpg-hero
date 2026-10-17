import type { Character } from "./types";

export const PROFILE_KEY = "rpg-hero-profiles";
export const CAMPAIGN_KEY = "rpg-hero-campaigns";

export interface LocalProfile {
  id: string;
  name: string;
  role: "player" | "gm";
}

export interface Seat {
  characterId: string;
  playerName: string;
}

export interface Campaign {
  id: string;
  name: string;
  note: string;
  seats: Seat[];
}

export function readProfiles(raw: string | null): LocalProfile[] {
  return readList(raw).flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Partial<LocalProfile>;
    if (typeof item.id !== "string" || typeof item.name !== "string") return [];
    return [{ id: item.id, name: item.name, role: item.role === "gm" ? "gm" : "player" }];
  });
}

export function readCampaigns(raw: string | null): Campaign[] {
  return readList(raw).flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Partial<Campaign>;
    if (typeof item.id !== "string" || typeof item.name !== "string") return [];
    const seats = Array.isArray(item.seats)
      ? item.seats.flatMap((seat) => {
          if (!seat || typeof seat !== "object") return [];
          const rowSeat = seat as Partial<Seat>;
          if (typeof rowSeat.characterId !== "string") return [];
          return [{ characterId: rowSeat.characterId, playerName: typeof rowSeat.playerName === "string" ? rowSeat.playerName : "" }];
        })
      : [];
    return [{ id: item.id, name: item.name, note: typeof item.note === "string" ? item.note : "", seats }];
  });
}

export function campaignFile(campaign: Campaign, profiles: LocalProfile[], characters: Character[]): string {
  const ids = new Set(campaign.seats.map((seat) => seat.characterId));
  return JSON.stringify(
    {
      app: "rpg-hero-table",
      version: 1,
      published: false,
      note: "Локальный стол. Этот файл никуда сам не отправляется.",
      campaign,
      profiles,
      characters: characters.filter((hero) => ids.has(hero.id)),
    },
    null,
    2,
  );
}

export function tableSummary(campaign: Campaign, characters: Character[]): string {
  const lines = [`Стол «${campaign.name}». Ничего не опубликовано.`, campaign.note].filter(Boolean);
  for (const seat of campaign.seats) {
    const hero = characters.find((item) => item.id === seat.characterId);
    if (!hero) {
      lines.push(`${seat.playerName || "Игрок"}: героя на этом телефоне нет`);
      continue;
    }
    lines.push(`${seat.playerName || "Игрок"}: ${hero.name}, ${hero.ancestryName}, ${hero.className}, ${hero.level} ур., хиты ${hero.hpCurrent}`);
  }
  return lines.join("\n");
}

function readList(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
