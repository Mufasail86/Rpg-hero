import { describe, expect, it } from "vitest";
import { actionSurge, attackPreview, emptyDndCombat, newRound, openHelp, secondWind, spendAttack, spendResource, spendSlot, useReaction } from "./combat";
import { deriveProgress } from "./build";
import { guardItems, guardProgress } from "./guard";

describe("боевой экран D&D", () => {
  const sheet = deriveProgress(guardProgress(), guardItems(), {}, [], 20);
  const start = emptyDndCombat(sheet.resources, sheet.slots);

  it("показывает модификатор до броска, справка ресурс не тратит", () => {
    const sword = sheet.attacks.find((attack) => attack.name.includes("Длинный"));
    expect(attackPreview(sword?.attack.value ?? 0)).toBe("До броска: +11. Справка бросок не делает.");
    const help = openHelp(start);
    expect(help.spent).toBe(false);
    expect(help.state.action).toBe(true);
    expect(help.state.resources.wind).toBe(start.resources.wind);
  });

  it("четыре атаки тратят действие, всплеск даёт ещё четыре, реакция отдельно", () => {
    let state = start;
    for (let i = 0; i < 4; i += 1) state = spendAttack(state, 4).state;
    expect(state.attacks).toBe(4);
    expect(spendAttack(state, 4).spent).toBe(false);
    const surged = actionSurge(state);
    expect(surged.state.resources.surge).toBe(1);
    let more = surged.state;
    for (let i = 0; i < 4; i += 1) more = spendAttack(more, 4).state;
    expect(more.attacks).toBe(8);
    expect(useReaction(more).state.reaction).toBe(false);
    expect(useReaction(useReaction(more).state).spent).toBe(false);
  });

  it("Второе дыхание тратит бонусное действие и заряд, новый раунд заряд не возвращает", () => {
    const used = secondWind(start);
    expect(used.state.bonus).toBe(false);
    expect(used.state.resources.wind).toBe(3);
    expect(secondWind(used.state).spent).toBe(false);
    const round = newRound(used.state);
    expect(round.state.action).toBe(true);
    expect(round.state.bonus).toBe(true);
    expect(round.state.resources.wind).toBe(3);
  });

  it("несгибаемость тратит заряд и не трогает действие", () => {
    const used = spendResource(start, "indomitable", "Несгибаемость");
    expect(used.spent).toBe(true);
    expect(used.state.resources.indomitable).toBe(2);
    expect(used.state.action).toBe(true);
    expect(spendResource({ ...used.state, resources: { ...used.state.resources, indomitable: 0 } }, "indomitable", "Несгибаемость").spent).toBe(false);
  });

  it("ячейка не тратится повторно сверх максимума", () => {
    const once = spendSlot(start, 1, 2);
    const twice = spendSlot(once.state, 1, 2);
    const third = spendSlot(twice.state, 1, 2);
    expect(twice.spent).toBe(true);
    expect(third.spent).toBe(false);
  });
});
