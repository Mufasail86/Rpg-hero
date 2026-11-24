import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { Character } from "./types";
import { loadCharacters, saveCharacters } from "./storage";
import { go, InfoProvider, useHash } from "./ui/common";
import { Home } from "./ui/home";
import { MusicControl, SettingsPage } from "./ui/music";
import { SkinButton, ThemeToggle } from "./ui/theme";
import { LoadFailBoundary, Loading } from "./ui/loading";

// Тяжёлые экраны и справочник грузятся отдельными частями, только когда они нужны.
const Builder = lazy(() => import("./ui/builder").then((m) => ({ default: m.Builder })));
const Sheet = lazy(() => import("./ui/sheet").then((m) => ({ default: m.Sheet })));
const Library = lazy(() => import("./ui/library").then((m) => ({ default: m.Library })));
const Lore = lazy(() => import("./ui/lore").then((m) => ({ default: m.Lore })));
const Bestiary = lazy(() => import("./ui/bestiary").then((m) => ({ default: m.Bestiary })));
const QuickBar = lazy(() => import("./ui/quickbar").then((m) => ({ default: m.QuickBar })));
const Table = lazy(() => import("./ui/table").then((m) => ({ default: m.Table })));
const GlossaryPage = lazy(() => import("./ui/beginner").then((m) => ({ default: m.GlossaryPage })));
const QuickStart = lazy(() => import("./ui/beginner").then((m) => ({ default: m.QuickStart })));
const SkillPicksPage = lazy(() => import("./ui/skill-guide").then((m) => ({ default: m.SkillPicksPage })));
const Training = lazy(() => import("./ui/tactical-training").then((m) => ({ default: m.Training })));

function routeOf(hash: string): { page: "home" | "new" | "quick" | "glossary" | "picks" | "settings" | "sheet" | "library" | "lore" | "bestiary" | "table" | "training"; id?: string; panel?: string | null } {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  if (parts[0] === "training") return { page: "training", id: parts[1] ? decodeURIComponent(parts[1]) : undefined };
  if (parts[0] === "library") return { page: "library" };
  if (parts[0] === "lore") return { page: "lore" };
  if (parts[0] === "bestiary") return { page: "bestiary", id: parts[1] ? decodeURIComponent(parts[1]) : undefined };
  if (parts[0] === "table") return { page: "table" };
  if (parts[0] === "new") return { page: "new" };
  if (parts[0] === "quick") return { page: "quick" };
  if (parts[0] === "glossary") return { page: "glossary" };
  if (parts[0] === "skill-picks") return { page: "picks" };
  if (parts[0] === "settings") return { page: "settings" };
  if (parts[0] === "c" && parts[1]) return { page: "sheet", id: decodeURIComponent(parts[1]), panel: parts[2] ? decodeURIComponent(parts[2]) : null };
  return { page: "home" };
}

export function App() {
  const hash = useHash();
  const route = routeOf(hash);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);
  // На главном экране быструю панель подключаем после первой отрисовки: она тянет справочник.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (idle) return;
    const ready = () => setIdle(true);
    const wait = () => {
      const handle = window.requestIdleCallback ? window.requestIdleCallback(ready, { timeout: 2500 }) : window.setTimeout(ready, 1200);
      cleanup = () => (window.cancelIdleCallback ? window.cancelIdleCallback(handle) : window.clearTimeout(handle));
    };
    let cleanup = () => window.removeEventListener("load", wait);
    if (document.readyState === "complete") wait();
    else window.addEventListener("load", wait, { once: true });
    return () => cleanup();
  }, [idle]);
  const [characters, setCharacters] = useState<Character[]>(() => loadCharacters());
  const latestCharacters = useRef(characters);

  function write(next: Character[]) {
    saveCharacters(next);
    latestCharacters.current = next;
    setCharacters(next);
  }

  function addSample(character: Character) {
    const current = latestCharacters.current;
    if (!current.some(item => item.id === character.id)) write([character, ...current]);
  }

  function upsert(character: Character) {
    const next = characters.some((item) => item.id === character.id)
      ? characters.map((item) => (item.id === character.id ? character : item))
      : [character, ...characters];
    write(next);
  }

  const hero = characters.find((item) => item.id === route.id);
  const latest = [...characters].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const active = route.page === "sheet" ? hero : latest;

  return (
    <InfoProvider>
      <div className="chrome-tools">
        <MusicControl hash={hash} />
        <SkinButton />
        <ThemeToggle />
      </div>
      <div className={route.page === "new" ? "has-quickbar creating" : "has-quickbar"}>
      <LoadFailBoundary resetKey={hash}>
      <Suspense fallback={<Loading />}>
      {route.page === "home" && (
        <Home
          characters={characters}
          onAddSample={addSample}
          onCommit={write}
          onDelete={(id) => write(characters.filter((item) => item.id !== id))}
        />
      )}
      {route.page === "library" && <Library />}
      {route.page === "lore" && <Lore />}
      {route.page === "bestiary" && <Bestiary />}
      {route.page === "table" && <Table characters={characters} />}
      {route.page === "training" && <Training characters={characters} heroId={route.id} />}
      {route.page === "new" && (
        <Builder
          onDone={(character) => {
            upsert(character);
            go(`#/c/${character.id}`);
          }}
        />
      )}
      {route.page === "quick" && (
        <QuickStart
          onDone={(character) => {
            upsert(character);
            go(`#/c/${character.id}`);
          }}
        />
      )}
      {route.page === "glossary" && <GlossaryPage />}
      {route.page === "settings" && <SettingsPage />}
      {route.page === "picks" && <SkillPicksPage />}
      {route.page === "sheet" && hero && (
        <Sheet
          character={hero}
          panel={route.panel ?? null}
          onChange={upsert}
          onDelete={() => {
            write(characters.filter((item) => item.id !== hero.id));
            go("#/");
          }}
        />
      )}
      {route.page === "sheet" && !hero && (
        <div className="app screen">
          <p>Этого героя на телефоне нет. Вернитесь на главную и соберите нового: быстрый старт или шаги конструктора.</p>
          <button type="button" className="btn primary" onClick={() => go("#/quick")}>Быстрый старт</button>
          <button type="button" className="btn" onClick={() => go("#/")}>На главную</button>
        </div>
      )}
      </Suspense>
      </LoadFailBoundary>
      </div>
      {route.page !== "new" && (route.page !== "home" || idle) && <LoadFailBoundary resetKey={hash} quiet><Suspense fallback={null}><QuickBar
        character={active ?? null}
        roster={characters}
        allowSwitch={route.page !== "sheet"}
        raised={false}
        compact={route.page === "sheet" && !route.panel}
        hash={hash}
        onChange={upsert}
      /></Suspense></LoadFailBoundary>}
    </InfoProvider>
  );
}
