export const THEME_KEY = "rpg-hero-theme";

export type ThemeId = "tavern" | "atlas";

export const THEME_NAME: Record<ThemeId, string> = {
  tavern: "Ночная таверна",
  atlas: "Атлас приключений",
};

export function themeOf(value: string | null): ThemeId {
  return value === "atlas" ? "atlas" : "tavern";
}

export function readTheme(store: Pick<Storage, "getItem"> | null): ThemeId {
  try {
    return themeOf(store?.getItem(THEME_KEY) ?? null);
  } catch {
    return "tavern";
  }
}

export function applyTheme(theme: ThemeId, store?: Pick<Storage, "setItem"> | null): void {
  document.documentElement.dataset.theme = theme;
  const color = theme === "atlas" ? "#f3ecdf" : "#121820";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  try {
    store?.setItem(THEME_KEY, theme);
  } catch {
    /* тема остаётся на эту отрисовку */
  }
}
