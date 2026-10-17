import { describe, expect, it } from "vitest";
import { guardCharacter } from "../dnd/guard";
import { artefolCharacter } from "../pf2e/artefol";
import {
  combatBrief,
  faceFromCharacter,
  loreToken,
  parsePlay,
  sceneBrief,
  settingPlaces,
} from "./table";

describe("играю сейчас", () => {
  it("в таверне Артефола напоминает, кем он, и помечает сильный навык", () => {
    const hero = artefolCharacter();
    hero.reminder = {
      backstory: "Таскал раненых с поля и не любит бросать своих.",
      deity: { name: "Саренрей", domains: "солнце", symbol: "солнце", weapon: "скимитар", edicts: "Лечить тех, кто просит.", anathema: "Не бросать раненого." },
      vows: [{ id: "taboo-1", kind: "taboo", text: "Не бить безоружного." }],
    };
    const face = faceFromCharacter(hero);
    const brief = sceneBrief(face, "talk", "tavern");
    const text = brief.prompts.join(" ");
    expect(brief.prompts.length).toBeGreaterThanOrEqual(3);
    expect(brief.prompts.length).toBeLessThanOrEqual(5);
    expect(text).toMatch(/человек/);
    expect(text).toMatch(/воин/);
    expect(text).toMatch(/лекарь|перевяз/);
    expect(text).toMatch(/Не бросать раненого/);
    expect(brief.vows.some((row) => row.label === "Анафема" && row.text.includes("раненого"))).toBe(true);
    expect(brief.vows.some((row) => row.label === "Табу")).toBe(true);
    expect(brief.vows.some((row) => row.label === "Эдикты")).toBe(true);
    const rumor = brief.actions.find((row) => row.title === "Собрать слухи");
    const press = brief.actions.find((row) => row.title === "Надавить");
    expect(rumor?.skill).toMatch(/Дипломатия/);
    expect(press?.strong).toBe(true);
    expect(brief.placeText).toMatch(/таверн|зал|стойк/i);
  });

  it("в бою делит ближний и дальний и говорит, если стрелять нечем", () => {
    const face = faceFromCharacter(artefolCharacter());
    const melee = combatBrief(face, "melee");
    const ranged = combatBrief(face, "ranged");
    expect(melee.economy).toMatch(/три действия/);
    expect(melee.map).toMatch(/−5/);
    expect(melee.strikes.length).toBeGreaterThan(0);
    expect(melee.strikes.every((row) => row.attack.startsWith("+") || row.attack.startsWith("-"))).toBe(true);
    expect(melee.maneuvers.map((row) => row.name)).toEqual(expect.arrayContaining(["Сбить с ног", "Захват", "Толчок", "Деморализация", "Поднять щит", "Шаг"]));
    expect(melee.classActions.some((row) => row.name === "Внезапный натиск")).toBe(true);
    expect(ranged.empty).toBe("");
    expect(ranged.strikes.length).toBeGreaterThan(0);
    expect(ranged.maneuvers.map((row) => row.name)).toEqual(expect.arrayContaining(["Занять укрытие", "Достать оружие"]));

    const guard = combatBrief(faceFromCharacter(guardCharacter()), "ranged");
    expect(guard.empty).toMatch(/Дальнего удара нет/);
    expect(guard.empty).toMatch(/дротик/);
    expect(guard.economy).toMatch(/действие/);
    expect(guard.map).toBe("");
  });

  it("в лавке D&D показывает торг и работает в обеих редакциях", () => {
    const guard = guardCharacter();
    for (const edition of ["dnd-2024", "dnd-2014"] as const) {
      const face = faceFromCharacter(guard);
      face.edition = edition;
      const shop = sceneBrief(face, "talk", "shop");
      expect(shop.actions.map((row) => row.title)).toEqual(expect.arrayContaining(["Сторговаться", "Прикинуть товар", "Не сказать лишнего"]));
      expect(shop.actions.find((row) => row.title === "Сторговаться")?.skill).toMatch(/Убеждение|Убежд/);
      expect(shop.prompts.join(" ")).toMatch(/человек/);
      expect(shop.placeText).toMatch(/прилавк|лавк|товар/i);
    }
    for (const edition of ["pf-remaster", "pf-legacy"] as const) {
      const face = faceFromCharacter(artefolCharacter());
      face.edition = edition;
      const shop = sceneBrief(face, "explore", "dungeon");
      expect(shop.actions.length).toBeGreaterThan(0);
      expect(combatBrief(face, "melee").economy).toMatch(/три действия/);
    }
  });

  it("помнит выбор и даёт карточку Абсалома, не бога", () => {
    const raw = JSON.stringify({ scene: "fight", place: "tavern", loreId: "absalom", stance: "ranged" });
    expect(parsePlay(raw)).toEqual({ scene: "fight", place: "tavern", loreId: "absalom", stance: "ranged" });
    expect(parsePlay("нет")).toEqual({ scene: "talk", place: "", loreId: "", stance: "melee" });
    const places = settingPlaces();
    const absalom = places.find((card) => card.id === "absalom");
    const cheliax = places.find((card) => card.id === "cheliax");
    expect(absalom?.short).toMatch(/Кортос|город/);
    expect(cheliax).toBeTruthy();
    expect(places.some((card) => card.id === "sarenrae")).toBe(false);
    expect(places.some((card) => card.id === "oppara-court")).toBe(false);
    expect(loreToken(absalom!)).toBe("lore~golarion~absalom");
  });
});
