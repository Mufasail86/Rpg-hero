/** Лёгкий модуль: главный экран проверяет, показывали ли знакомство, не загружая справочник. */
export const TOUR_KEY = "rpg-hero-tour";

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return false;
  }
}
