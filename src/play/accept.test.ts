import { describe, expect, it } from "vitest";
import { deriveProgress } from "../dnd/build";
import { derive } from "../pf2e/build";
import type { DndProgress, Pf2eProgress, RollEntry } from "../types";
import { appendRoll } from "./log";
import { deathSave, emptyDeath, endTurn, previewDamage, previewHeal, recoveryCheck, type Body } from "./vitality";
import { exchange, parsePurse, pay, pfCoinBulk, totalCopper } from "./wallet";

function body(partial: Partial<Body> = {}): Body {
  return {
    hpCurrent: 20,
    hpTemp: 0,
    conditions: [],
    values: {},
    death: emptyDeath(),
    ...partial,
  };
}

function pf(extra: Pf2eProgress["choices"] = []): Pf2eProgress {
  return {
    freeArchetype: false,
    ancestryId: "human",
    heritageId: "skilled",
    backgroundId: "field-medic",
    classId: "fighter",
    keyAbility: "str",
    toggles: [],
    dailyFeats: [],
    choices: [
      { id: "a0", level: 1, source: "ancestry-boost", pick: "str" },
      { id: "a1", level: 1, source: "ancestry-boost", pick: "dex" },
      { id: "b0", level: 1, source: "background-boost", pick: "con" },
      { id: "b1", level: 1, source: "background-boost", pick: "str" },
      { id: "c", level: 1, source: "class-boost", pick: "str" },
      { id: "f0", level: 1, source: "free-boost", pick: "str" },
      { id: "f1", level: 1, source: "free-boost", pick: "dex" },
      { id: "f2", level: 1, source: "free-boost", pick: "con" },
      { id: "f3", level: 1, source: "free-boost", pick: "wis" },
      { id: "g0", level: 5, source: "free-boost", pick: "con" },
      { id: "g1", level: 5, source: "free-boost", pick: "str" },
      { id: "g2", level: 5, source: "free-boost", pick: "dex" },
      { id: "g3", level: 5, source: "free-boost", pick: "wis" },
      { id: "h0", level: 10, source: "free-boost", pick: "con" },
      { id: "h1", level: 10, source: "free-boost", pick: "str" },
      { id: "h2", level: 10, source: "free-boost", pick: "dex" },
      { id: "h3", level: 10, source: "free-boost", pick: "int" },
      ...extra,
    ],
  };
}

describe("приёмка листа", () => {
  it("считает хиты человека-воина Pathfinder и частичное повышение", () => {
    const first = derive({ progress: pf(), items: [], level: 1 });
    expect(first.abilities.str).toMatchObject({ score: 18, mod: 4, partial: false });
    expect(first.abilities.dex.mod).toBe(2);
    expect(first.abilities.con.mod).toBe(2);
    expect(first.abilities.int.mod).toBe(0);
    expect(first.abilities.wis.mod).toBe(1);
    expect(first.abilities.cha.mod).toBe(0);
    expect(first.hp.value).toBe(20);
    const steady = derive({
      progress: { ...pf(), choices: pf().choices.filter((choice) => !(choice.level === 5 && choice.pick === "con")) },
      items: [],
      level: 5,
    });
    expect(steady.abilities.con.mod).toBe(2);
    expect(steady.hp.value).toBe(68);
    const fifth = derive({ progress: pf(), items: [], level: 5 });
    expect(fifth.abilities.con.mod).toBe(3);
    expect(fifth.hp.value).toBe(8 + (10 + 3) * 5);
    const tenth = derive({ progress: pf(), items: [], level: 10 });
    expect(tenth.abilities.con).toMatchObject({ score: 18, mod: 4, partial: false });
    const held = derive({ progress: pf([{ id: "i0", level: 15, source: "free-boost", pick: "con" }]), items: [], level: 15 });
    const open = derive({ progress: pf(), items: [], level: 15 });
    expect(held.abilities.con.partial).toBe(true);
    expect(held.abilities.con.score).toBe(open.abilities.con.score);
    expect(held.abilities.con.mod).toBe(open.abilities.con.mod);
    expect(held.hp.value).toBe(open.hp.value);
    const closed = derive({
      progress: pf([
        { id: "i0", level: 15, source: "free-boost", pick: "con" },
        { id: "j0", level: 20, source: "free-boost", pick: "con" },
      ]),
      items: [],
      level: 20,
    });
    expect(closed.abilities.con).toMatchObject({ score: 20, mod: 5, partial: false });
    expect(closed.hp.value).toBeGreaterThan(held.hp.value);
  });

  it("считает хиты воина D&D: 12 на 1 уровне и 44 на 5 при фиксированном среднем", () => {
    const progress: DndProgress = {
      speciesId: "human",
      backgroundId: "soldier",
      classId: "fighter",
      subclassId: "champion",
      base: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
      speed: 30,
      toggles: [],
      choices: [],
    };
    expect(deriveProgress(progress, [], {}, [], 1).hp.value).toBe(12);
    expect(deriveProgress(progress, [], {}, [], 5).hp.value).toBe(44);
    const raised: DndProgress = { ...progress, base: { ...progress.base, con: 16 } };
    expect(deriveProgress(raised, [], {}, [], 5).hp.value).toBe(49);
  });

  it("снимает временные хиты раньше обычных и пишет умирание", () => {
    const worn = previewDamage("pf2e", body({ hpTemp: 5 }), 8, 20);
    expect(worn.body.hpTemp).toBe(0);
    expect(worn.body.hpCurrent).toBe(17);
    expect(worn.body.conditions).not.toContain("dying");
    const down = previewDamage("pf2e", body({ hpCurrent: 4, values: { wounded: 1 }, conditions: ["wounded"] }), 4, 20);
    expect(down.body.hpCurrent).toBe(0);
    expect(down.body.values.dying).toBe(2);
    const worse = previewDamage("pf2e", down.body, 1, 20);
    expect(worse.body.values.dying).toBe(3);
    expect(worse.body.values.wounded).toBe(1);
    const healed = previewHeal("pf2e", worse.body, 5, 20);
    expect(healed.body.hpCurrent).toBe(5);
    expect(healed.body.conditions).not.toContain("dying");
    expect(healed.body.values.wounded).toBe(2);
    const check = recoveryCheck(down.body, 1);
    expect(check.body.conditions).toContain("dead");
  });

  it("ведёт спасброски от смерти D&D", () => {
    const zero = body({ hpCurrent: 0, conditions: ["unconscious"] });
    const miss = deathSave(zero, 9, 20);
    expect(miss.body.death.fail).toBe(1);
    const two = deathSave(zero, 1, 20);
    expect(two.body.death.fail).toBe(2);
    const up = deathSave(zero, 20, 20);
    expect(up.body.hpCurrent).toBe(1);
    expect(up.body.conditions).not.toContain("unconscious");
    const stable = deathSave({ ...zero, death: { success: 2, fail: 0, stable: false } }, 12, 20);
    expect(stable.body.death.stable).toBe(true);
    expect(stable.body.hpCurrent).toBe(0);
    const dead = previewDamage("dnd5e", body({ hpCurrent: 5 }), 25, 20);
    expect(dead.body.conditions).toContain("dead");
  });

  it("снижает в конце хода только испуг", () => {
    const step = endTurn(body({ conditions: ["frightened", "sickened"], values: { frightened: 2, sickened: 1 } }));
    expect(step.body.values.frightened).toBe(1);
    expect(step.body.values.sickened).toBe(1);
    expect(step.body.conditions).toContain("sickened");
  });

  it("считает кошелёк целыми медными и не разменивает сам", () => {
    const parsed = parsePurse("2 зм 5 см");
    expect(parsed).toMatchObject({ gp: 2, sp: 5, cp: 0 });
    if ("error" in parsed) return;
    expect(totalCopper(parsed)).toBe(250);
    expect(parsePurse("1.5 зм")).toMatchObject({ error: expect.stringMatching(/Дроби/) });
    const purse = { cp: 0, sp: 0, ep: 0, gp: 1, pp: 0 };
    const blocked = pay(purse, 50, false);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.needExchange).toBe(true);
    const paid = pay(purse, 50, true);
    expect(paid.ok).toBe(true);
    if (paid.ok) expect(totalCopper(paid.coins)).toBe(50);
    const broken = exchange(purse, "gp", "sp", 1);
    expect(broken.ok).toBe(true);
    if (broken.ok) expect(broken.coins.sp).toBe(10);
    expect(pfCoinBulk({ cp: 999, sp: 0, ep: 0, gp: 0, pp: 0 })).toBe(0);
    expect(pfCoinBulk({ cp: 1000, sp: 0, ep: 0, gp: 0, pp: 0 })).toBe(1);
  });

  it("не переписывает старую строку журнала", () => {
    const entry: RollEntry = {
      id: "one",
      at: 1,
      system: "pf2e",
      edition: "pf-remaster",
      action: "Атлетика",
      dice: [12],
      kept: 12,
      modifier: 7,
      total: 19,
      dc: 15,
      verdict: "успех",
    };
    const log = appendRoll([], entry);
    entry.modifier = 9;
    entry.total = 21;
    expect(log[0].modifier).toBe(7);
    expect(log[0].total).toBe(19);
    expect(appendRoll(log, { ...entry, id: "two" })).toHaveLength(2);
    expect(log).toHaveLength(1);
  });
});
