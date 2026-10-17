import { describe, expect, it } from "vitest";
import { campaignFile, readCampaigns, readProfiles, tableSummary } from "./table";
import type { Character } from "./types";

const hero = {
  id: "hero-1",
  name: "Лада",
  ancestryName: "Человек",
  className: "Воин",
  level: 2,
  hpCurrent: 18,
} as Character;

describe("локальный стол", () => {
  it("читает профили и места и не помечает файл как опубликованный", () => {
    const profiles = readProfiles(JSON.stringify([{ id: "p1", name: "Мира", role: "gm" }, { id: "bad" }]));
    expect(profiles).toEqual([{ id: "p1", name: "Мира", role: "gm" }]);
    const campaigns = readCampaigns(JSON.stringify([{ id: "c1", name: "Ночная", note: "", seats: [{ characterId: "hero-1", playerName: "Мира" }] }]));
    const file = JSON.parse(campaignFile(campaigns[0], profiles, [hero])) as { published: boolean; characters: { name: string }[] };
    expect(file.published).toBe(false);
    expect(file.characters.map((item) => item.name)).toEqual(["Лада"]);
    expect(tableSummary(campaigns[0], [hero])).toContain("Лада");
    expect(tableSummary(campaigns[0], [hero])).toContain("не опубликовано");
  });
});
