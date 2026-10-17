export const SYSTEM_DND = "D&D";
export const SYSTEM_PF = "Pathfinder";

export function systemTitle(system: string): string {
  if (system === "dnd5e") return SYSTEM_DND;
  if (system === "pf2e") return SYSTEM_PF;
  return "Своя игра";
}
