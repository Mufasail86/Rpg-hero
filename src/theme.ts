export const THEME_KEY = "rpg-hero-theme";
export const SKIN_KEY = "rpg-hero-skin";

export type ThemeId = "tavern" | "atlas";
export type SkinId = "" | "scroll" | "hud" | "hud-dark";

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

export const SKIN_NAME: Record<SkinId, string> = {
  "": "Обычный",
  scroll: "Свиток",
  hud: "Щит",
  "hud-dark": "Щит ночью",
};

export function skinOf(value: string | null): SkinId {
  if (value === "scroll" || value === "1") return "scroll";
  if (value === "hud" || value === "4" || value === "hud-light") return "hud";
  if (value === "hud-dark") return "hud-dark";
  return "";
}

export function readSkin(store: Pick<Storage, "getItem"> | null, search = ""): SkinId {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const asked = query.get("skin") || query.get("theme");
  if (asked === "scroll" || asked === "hud" || asked === "hud-light" || asked === "hud-dark" || asked === "1" || asked === "4") return skinOf(asked);
  try {
    return skinOf(store?.getItem(SKIN_KEY) ?? null);
  } catch {
    return "";
  }
}

export function applySkin(skin: SkinId, store?: Pick<Storage, "setItem"> | null): void {
  if (skin) document.documentElement.dataset.skin = skin;
  else delete document.documentElement.dataset.skin;
  try {
    store?.setItem(SKIN_KEY, skin);
  } catch {
    /* облик остаётся на эту отрисовку */
  }
}
