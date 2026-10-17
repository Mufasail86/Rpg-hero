import { describe, expect, it } from "vitest";
import { bestiaryCatalog, bestiaryPackCounts } from "./bestiary";
import { rulesCatalog } from "./catalog";

describe("бестиарий", () => {
  const rows = bestiaryCatalog();

  it("пакеты не смешиваются и в справочник правил не входят", () => {
    const counts = Object.fromEntries(bestiaryPackCounts().map((row) => [row.id, row.entered]));
    expect(counts["pf-monster-core"]).toBe(492);
    expect(counts["srd-5.2-monsters"]).toBe(330);
    expect(counts["srd-5.1-monsters"]).toBe(307);
    expect(rows.every((row) => row.spoiler === "gm" && row.status === "verified-partial" && row.checkedOn === "2026-10-17")).toBe(true);
    expect(rulesCatalog().some((entry) => entry.category === "monster")).toBe(false);
    expect(new Set(rows.map((row) => row.token)).size).toBe(rows.length);
  });

  it("гоблин-воин и дракон совпали с полями Monster Core", () => {
    const goblin = rows.find((row) => row.id === "goblin-warrior" && row.edition === "pf-remaster");
    expect(goblin?.level).toBe(-1);
    expect(goblin?.ac).toBe(16);
    expect(goblin?.hp).toBe(6);
    expect(goblin?.kind).toBe("гуманоид");
    expect(goblin?.text).toContain("союзник-гоблин заканчивает действие движения");
    expect(goblin?.text).toContain("делает шаг");
    const dragon = rows.find((row) => row.id === "adamantine-dragon-adult");
    expect(dragon?.level).toBe(13);
    expect(dragon?.ac).toBe(33);
    expect(dragon?.hp).toBe(220);
    expect(dragon?.text).toContain("физический 15");
    expect(dragon?.text).toContain("физический 5");
    expect(dragon?.text).toContain("11d8");
    expect(dragon?.text).toContain("конус 40");
  });

  it("аболеф 2024 и 2014 различаются хитами, опыт берётся без логова", () => {
    const next = rows.find((row) => row.originalName === "Aboleth" && row.edition === "dnd-2024");
    const prev = rows.find((row) => row.originalName === "Aboleth" && row.edition === "dnd-2014");
    expect(next?.ac).toBe(17);
    expect(next?.hp).toBe(150);
    expect(next?.cr).toBe("10");
    expect(next?.xp).toBe(5900);
    expect(next?.text).toContain("плавание 40");
    expect(next?.text).toContain("+4");
    expect(prev?.hp).toBe(135);
    expect(prev?.xp).toBe(5900);
    expect(prev?.text).toContain("плавание 40");
    const red = rows.find((row) => row.originalName === "Adult Red Dragon" && row.edition === "dnd-2024");
    expect(red?.ac).toBe(19);
    expect(red?.hp).toBe(256);
    expect(red?.cr).toBe("17");
    expect(red?.xp).toBe(18000);
    expect(red?.text).toContain("конус 60");
    const wolf = rows.find((row) => row.originalName === "Wolf" && row.edition === "dnd-2024");
    expect(wolf?.ac).toBe(12);
    expect(wolf?.hp).toBe(11);
    expect(wolf?.cr).toBe("1/4");
    expect(wolf?.xp).toBe(50);
    const goblin = rows.find((row) => row.originalName === "Goblin" && row.edition === "dnd-2014");
    expect(goblin?.ac).toBe(15);
    expect(goblin?.hp).toBe(7);
    expect(goblin?.cr).toBe("1/4");
    const young = rows.find((row) => row.originalName === "Young Red Dragon" && row.edition === "dnd-2014");
    expect(young?.hp).toBe(178);
    expect(young?.cr).toBe("10");
    const tarrasque = rows.find((row) => row.originalName === "Tarrasque" && row.edition === "dnd-2024");
    const oldTerror = rows.find((row) => row.originalName === "Tarrasque" && row.edition === "dnd-2014");
    expect(tarrasque?.hp).toBe(697);
    expect(oldTerror?.hp).toBe(676);
    expect(tarrasque?.xp).toBe(155000);
  });
});
