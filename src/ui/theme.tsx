import { useEffect, useState } from "react";
import { SKIN_NAME, THEME_NAME, applySkin, applyTheme, readSkin, readTheme, type SkinId, type ThemeId } from "../theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>(() => readTheme(typeof localStorage === "undefined" ? null : localStorage));

  useEffect(() => {
    applyTheme(theme, typeof localStorage === "undefined" ? null : localStorage);
  }, [theme]);

  const next: ThemeId = theme === "tavern" ? "atlas" : "tavern";
  return (
    <button type="button" className="theme-toggle" data-testid="theme-toggle" aria-label={THEME_NAME[theme]} title={THEME_NAME[next]} aria-pressed={theme === "atlas"} onClick={() => setTheme(next)}>
      {theme === "tavern" ? "Таверна" : "Атлас"}
    </button>
  );
}

const SKIN_ORDER: SkinId[] = ["", "scroll", "hud"];

export function SkinButton() {
  const [skin, setSkin] = useState<SkinId>(() => readSkin(typeof localStorage === "undefined" ? null : localStorage, typeof location === "undefined" ? "" : location.search));

  useEffect(() => {
    applySkin(skin, typeof localStorage === "undefined" ? null : localStorage);
  }, [skin]);

  const next = SKIN_ORDER[(SKIN_ORDER.indexOf(skin) + 1) % SKIN_ORDER.length];
  return (
    <button type="button" className="theme-toggle" data-testid="skin-toggle" aria-label={`Облик: ${SKIN_NAME[skin]}`} title={`Дальше: ${SKIN_NAME[next]}`} onClick={() => setSkin(next)}>
      {SKIN_NAME[skin]}
    </button>
  );
}
