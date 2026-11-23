import { describe, expect, it } from "vitest";
import { blankDraft } from "../types";
import { createCharacter, validateStep } from "../create";
import { hpMax } from "../rules";
import { ANCESTRIES } from "./pf2e";
import { VERSATILE } from "./versatile";
import { featChoices } from "./pf-index";

function pfHero(ancestryId: string, heritageId: string, featId: string, name: string, skills: string[]) {
  const draft = blankDraft();
  draft.system = "pf2e";
  draft.name = name;
  draft.ancestryId = ancestryId;
  draft.heritageId = heritageId;
  draft.choices.ancestryMode = "listed";
  draft.choices.ancFree = "con";
  draft.choices.ancestryFeat = featId;
  draft.backgroundId = "acolyte";
  draft.choices.bgFixed = "wis";
  draft.choices.bgFree = "con";
  draft.choices.skillFeat = "student-canon";
  draft.classId = "fighter";
  draft.choices.key = "str";
  draft.choices.fighterSkill = "athletics";
  draft.choices.classFeat = "sudden-charge";
  draft.choices.abilityMethod = "boost";
  draft.multi.freeBoosts = ["str", "dex", "con", "cha"];
  draft.multi.skills = skills;
  draft.gearMode = "kit";
  return draft;
}

describe("народы Feybound", () => {
  it("кладёт фавна и спрайта в конструктор с источником и без выдуманных хитов", () => {
    const faun = ANCESTRIES.find((item) => item.id === "faun");
    const sprite = ANCESTRIES.find((item) => item.id === "sprite");
    expect(faun?.name).toBe("Фавн");
    expect(faun?.hp).toBe(8);
    expect(faun?.speed).toBe(30);
    expect(faun?.flaw).toBe("wis");
    expect(faun?.heritages.map((item) => item.name)).toContain("Мечтательный фавн");
    expect(faun?.info).toContain("Feybound");
    expect(sprite?.name).toBe("Спрайт");
    expect(sprite?.hp).toBe(6);
    expect(sprite?.size).toBe("Крошечный");
    expect(sprite?.boosts).toEqual(["dex", "int"]);
    expect(sprite?.heritages.find((item) => item.id === "pixie-sprite")?.size).toBe("Малый");
    expect(VERSATILE.find((item) => item.id === "fadrim")?.name).toBe("Фадрим");
    expect(featChoices({ kind: "archetype", level: 2 }).some((feat) => feat.id === "unicorn-rider-dedication")).toBe(true);
    expect(faun?.feats.find((item) => item.id === "entrancing-magic")?.info).toContain("Очарование");
    expect(sprite?.feats.find((item) => item.id === "sprites-spark")?.info).toContain("1d4");
    expect(featChoices({ kind: "class", classId: "bard", level: 1 }).some((feat) => feat.id === "bamboozling-performance")).toBe(true);
    const texts = [
      ...faun!.feats.map((item) => item.info),
      ...sprite!.feats.map((item) => item.info),
    ];
    expect(texts.some((text) => text.includes("Постоянные хиты, скорость и бонусы листа она не меняет"))).toBe(false);
  });

  it("собирает фавна 1 уровня от народа до листа", () => {
    const draft = pfHero("faun", "dreaming-faun", "faun-lore", "Лира", ["medicine", "stealth", "diplomacy"]);
    expect(validateStep(draft, "review")).toBeNull();
    const made = createCharacter(draft);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    expect(made.character.ancestryHp).toBe(8);
    expect(made.character.size).toBe("Средний");
    expect(made.character.level).toBe(1);
    expect(hpMax(made.character)).toBeGreaterThan(8);
    expect(made.character.features.some((feature) => feature.name === "Мечтательный фавн")).toBe(true);
  });

  it("собирает спрайта 1 уровня и оставляет его крошечным без наследия пикси", () => {
    const draft = pfHero("sprite", "firefly-sprite", "sprite-lore", "Искра", ["medicine", "stealth", "diplomacy", "society"]);
    expect(validateStep(draft, "review")).toBeNull();
    const made = createCharacter(draft);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    expect(made.character.ancestryHp).toBe(6);
    expect(made.character.size).toBe("Крошечный");
    expect(ANCESTRIES.find((item) => item.id === "sprite")?.speed).toBe(20);
    const pixie = blankDraft();
    Object.assign(pixie, structuredClone(draft));
    pixie.heritageId = "pixie-sprite";
    pixie.name = "Пикси";
    const small = createCharacter(pixie);
    expect(small.ok).toBe(true);
    if (!small.ok) return;
    expect(small.character.size).toBe("Малый");
  });
});
