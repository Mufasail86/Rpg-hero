import { EFFECTS, type TacticalSetup, type TacticalState } from "./tactical";
import { validEnvironment } from "./tactical-vision";

export interface TacticalPreferences { weapon: string; spare?: string; armor: string; shield: boolean; prepared: string[]; setup: TacticalSetup }
export function readTacticalSave(text: string | null, source: string): { preferences: TacticalPreferences; state: TacticalState } | null {
  try {
    const value = JSON.parse(text ?? "null");
    if (!value || value.source !== source || value.state?.version !== 1) return null;
    const { state, preferences } = value;
    if (!preferences || typeof preferences.weapon !== "string" || typeof preferences.armor !== "string" || typeof preferences.shield !== "boolean" || !Array.isArray(preferences.prepared) || !preferences.prepared.every((id: unknown) => typeof id === "string")) return null;
    if (preferences.spare != null && typeof preferences.spare !== "string") return null;
    if (!["arena", "tavern"].includes(state.setup?.map) || !["dummy", "duel", "ambush"].includes(state.setup?.scenario) || !["easy", "normal", "hard"].includes(state.setup?.difficulty) || JSON.stringify(state.setup) !== JSON.stringify(preferences.setup)) return null;
    if (state.setup.environment != null && !validEnvironment(state.setup.environment)) return null;
    if (state.setup.ally != null && !["none", "fighter", "target"].includes(state.setup.ally)) return null;
    if (state.setup.grip != null && state.setup.grip !== 1 && state.setup.grip !== 2) return null;
    if (!Array.isArray(state.actors) || state.actors.length < 2 || state.actors.length > 8 || !state.actors.some((actor: { id: string }) => actor.id === "hero")) return null;
    const ids = new Set(state.actors.map((actor: { id: string }) => actor.id));
    if (ids.size !== state.actors.length || !Array.isArray(state.order) || state.order.length !== ids.size || new Set(state.order).size !== ids.size || !state.order.every((id: string) => ids.has(id)) || !Number.isInteger(state.cursor) || state.cursor < 0 || state.cursor >= state.order.length || !Number.isInteger(state.round) || state.round < 1) return null;
    if (!["active", "won", "lost"].includes(state.status) || typeof state.hint !== "string" || !Array.isArray(state.log) || state.log.length > 150 || !state.log.every((row: { title: string; detail: string }) => typeof row.title === "string" && typeof row.detail === "string")) return null;
    for (const actor of state.actors) {
      if (actor.grip != null && actor.grip !== 1 && actor.grip !== 2) return null;
      if (actor.activeWeapon != null && actor.activeWeapon !== 0 && actor.activeWeapon !== 1) return null;
      if (actor.id === "hero" && actor.activeWeapon === 1 && !preferences.spare) return null;
      if (actor.lightAttacks != null && ![0, 1, 2, 3].includes(actor.lightAttacks)) return null;
      if ([actor.weaponSwapUsed, actor.lightExtraUsed].some(value => value != null && typeof value !== "boolean")) return null;
      if (actor.sneakAttackTurn != null && (typeof actor.sneakAttackTurn !== "string" || !/^\d+:\d+$/.test(actor.sneakAttackTurn))) return null;
      if (typeof actor.id !== "string" || typeof actor.name !== "string" || !["party", "enemy"].includes(actor.team) || !Number.isFinite(actor.hp) || !Number.isFinite(actor.maxHp) || actor.maxHp < 1 || actor.hp < 0 || actor.hp > actor.maxHp || !Number.isInteger(actor.pos?.x) || !Number.isInteger(actor.pos?.y) || actor.pos.x < 0 || actor.pos.x >= 12 || actor.pos.y < 0 || actor.pos.y >= 9) return null;
      if (!actor.pf || !actor.dnd || !actor.slots || !actor.saves || !Array.isArray(actor.demoralizedBy) || !Array.isArray(actor.effects) || actor.effects.some((row: { id: string; value: number }) => !Object.hasOwn(EFFECTS, row.id) || !Number.isFinite(row.value))) return null;
      if ([actor.ac, actor.attack, actor.speed, actor.initiative, actor.move, actor.turns, actor.diagonals, actor.pf.actions, actor.dnd.attacks].some(number => !Number.isFinite(number))) return null;
    }
    return { preferences, state };
  } catch { return null; }
}
