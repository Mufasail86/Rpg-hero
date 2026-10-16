export const SYSTEM_DND = "Подземелья и драконы";
export const SYSTEM_PF = "Следопыт";

export function systemTitle(system: string): string {
  if (system === "dnd5e") return SYSTEM_DND;
  if (system === "pf2e") return SYSTEM_PF;
  return "Своя игра";
}
