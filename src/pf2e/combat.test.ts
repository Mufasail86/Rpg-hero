import { describe, expect, it } from "vitest";
import { artefolInput } from "./artefol";
import { derive } from "./build";
import { attackPreview, battleMedicine, doctorsVisit, emptyCombat, handsLine, knockdown, mapPenalty, newRound, openHelp, parry, reactiveStrike, strike } from "./combat";

describe("боевой экран", () => {
  it("показывает модификатор до броска и не тратит ресурс справкой", () => {
    const sheet = derive(artefolInput());
    const sword = sheet.attacks.find((attack) => attack.group === "sword");
    expect(attackPreview(sword?.attack.value ?? 0, 0)).toBe("До броска: +34 (база +34, штраф повторной атаки +0).");
    const before = emptyCombat();
    const help = openHelp(before);
    expect(help.spent).toBe(false);
    expect(help.state).toEqual(before);
  });

  it("Визит доктора есть на 1 и на 2 действия и второй раз упирается в усилие", () => {
    const one = doctorsVisit(emptyCombat(), 1);
    const two = doctorsVisit(emptyCombat(), 2);
    expect(one.state.actions).toBe(2);
    expect(two.state.actions).toBe(1);
    expect(one.state.flourish).toBe(true);
    expect(two.state.flourish).toBe(true);
    const again = doctorsVisit(one.state, 2);
    expect(again.spent).toBe(false);
    expect(again.state.actions).toBe(one.state.actions);
    expect(again.note).toMatch(/усилие/i);
  });

  it("Боевая медицина держит иммунитет по каждой цели", () => {
    const first = battleMedicine(emptyCombat(), "Страж");
    const repeat = battleMedicine(first.state, "Страж");
    const other = battleMedicine(first.state, "Лучник");
    expect(repeat.spent).toBe(false);
    expect(other.spent).toBe(true);
    expect(other.state.immunity.map((row) => row.target)).toEqual(["Страж", "Лучник"]);
    const round = newRound(other.state);
    expect(round.state.immunity).toEqual(other.state.immunity);
    expect(round.state.actions).toBe(3);
    expect(round.state.flourish).toBe(false);
  });

  it("Нокдаун тратит два действия и усилие, удар копит штраф", () => {
    const hit = strike(emptyCombat());
    expect(hit.state.map).toBe(-5);
    expect(hit.state.actions).toBe(2);
    const down = knockdown(emptyCombat());
    expect(down.state.actions).toBe(1);
    expect(down.state.flourish).toBe(true);
    expect(knockdown(down.state).spent).toBe(false);
    const reaction = reactiveStrike(emptyCombat());
    expect(reaction.state.reaction).toBe(false);
    expect(reaction.state.actions).toBe(3);
    expect(reaction.state.map).toBe(0);
    expect(reaction.state.strikes).toBe(0);
    const agile = strike(emptyCombat(), { agile: true });
    expect(agile.state.strikes).toBe(1);
    expect(mapPenalty(1, true)).toBe(-4);
    expect(agile.state.map).toBe(-5);
    const again = strike(agile.state, { agile: true });
    expect(mapPenalty(again.state.strikes, true)).toBe(-8);
    expect(again.state.map).toBe(-10);
    const guard = parry(emptyCombat());
    expect(guard.state.defense).toBe("dueling-parry");
    expect(guard.state.actions).toBe(2);
  });

  it("занятые руки считаются по положению, а не по имени", () => {
    const items = artefolInput().items;
    expect(handsLine(items)).toMatch(/Занято рук: 1/);
    expect(handsLine(items)).toMatch(/меч/i);
  });
});
