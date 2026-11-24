import { describe, expect, it } from "vitest";
import { artefolCharacter } from "../pf2e/artefol";
import { battleRoller, executeTactical, heroActor, startTactical } from "./tactical";
import { readTacticalSave } from "./tactical-storage";
import { equipTraining, ownedTrainingWeapons, trainingStats, weaponGrip } from "./training";

function scenario(shield = false, grip?: 1 | 2) {
  const source = artefolCharacter();
  source.items.push({ uid: "example-bastard", name: "Меч бастард", kind: "gear", qty: 1, weight: 1, equipped: false, runes: { potency: 1, striking: 1 } });
  const item = ownedTrainingWeapons(source).find(item => item.uid === "example-bastard")!;
  const hero = equipTraining(source, item.id, "scale-mail", shield);
  const setup = { map: "arena", difficulty: "easy", scenario: "dummy", ally: "none", grip } as const;
  const state = startTactical(hero, setup, battleRoller(true, [20, 1, 1]));
  const foe = state.actors.find(row => row.id === "guard")!;
  foe.pos = { x: 3, y: 6 };
  foe.ac = trainingStats(hero).weapons[0].attack + 13;
  return { hero, state, source, setup };
}

describe("хват оружия в учебном бою", () => {
  it("меч из сумки становится оружием только в учебной копии и сохраняет руны", () => {
    const { hero, source } = scenario();
    const base = trainingStats(hero).weapons[0], two = weaponGrip(base, 2);
    expect(base.name).toBe("Меч бастард");
    expect(base.damage).toMatch(/^2d8/);
    expect(two.damage).toBe(base.damage.replace(/^2d8/, "2d12"));
    expect(two.attack).toBe(base.attack);
    expect(source.items.find(row => row.uid === "example-bastard")).toMatchObject({ kind: "gear", equipped: false });
  });
  it("смена хвата расходует одно действие, освобождение руки бесплатно", () => {
    const { hero, state } = scenario();
    const two = executeTactical(hero, state, { type: "grip", hands: 2 }, () => 1);
    expect(heroActor(two)).toMatchObject({ grip: 2, pf: { actions: 2, strikes: 0 } });
    const one = executeTactical(hero, two, { type: "grip", hands: 1 }, () => 1);
    expect(heroActor(one)).toMatchObject({ grip: 1, pf: { actions: 2 } });
    expect(heroActor(state).pf.actions).toBe(3);
  });
  it("попадание запрашивает правильную кость урона для хвата", () => {
    for (const grip of [1, 2] as const) {
      const { hero, state } = scenario(false, grip);
      const calls: string[] = [];
      const after = executeTactical(hero, state, { type: "attack", target: "guard", weapon: 0 }, formula => { calls.push(formula); return formula === "1d20" ? 15 : 10; });
      expect(calls[1]).toMatch(grip === 1 ? /^2d8/ : /^2d12/);
      expect(after.log.some(event => event.detail.includes(grip === 1 ? "одна рука" : "две руки"))).toBe(true);
    }
  });
  it("щит не позволяет сменить хват, а двуручный хват не оставляет руки для захвата", () => {
    const { hero, state } = scenario(true);
    expect(() => executeTactical(hero, state, { type: "grip", hands: 2 }, () => 1)).toThrow("щитом");
    const two = scenario(false, 2);
    expect(() => executeTactical(two.hero, two.state, { type: "action", action: "grapple", target: "guard" }, () => 1)).toThrow("свободная рука");
  });
  it("хват хранится после перезагрузки независимо от начальной настройки", () => {
    const { hero, state, setup } = scenario();
    const two = executeTactical(hero, state, { type: "grip", hands: 2 }, () => 1);
    const saved = readTacticalSave(JSON.stringify({ source: "same", preferences: { weapon: "owned:example-bastard", armor: "scale-mail", shield: false, prepared: [], setup }, state: two }), "same");
    expect(heroActor(saved!.state).grip).toBe(2);
    expect(saved!.state.setup.grip).toBeUndefined();
  });
  it("провоцированное критическое попадание срывает смену хвата", () => {
    const { hero, state } = scenario();
    const foe = state.actors.find(row => row.id === "guard")!;
    foe.opportunity = true; foe.attack = heroActor(state).ac;
    const after = executeTactical(hero, state, { type: "grip", hands: 2 }, battleRoller(true, [20, 14]));
    expect(heroActor(after).grip).toBeUndefined();
    expect(heroActor(after).pf.actions).toBe(2);
    expect(after.log.at(-1)?.title).toBe("Смена хвата сорвана");
  });
});
