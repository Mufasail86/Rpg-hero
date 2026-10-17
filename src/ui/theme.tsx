import { useEffect, useState } from "react";
import { THEME_NAME, applyTheme, readTheme, type ThemeId } from "../theme";

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
