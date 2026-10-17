import { useState } from "react";
import type { Character } from "./types";
import { loadCharacters, saveCharacters } from "./storage";
import { go, InfoProvider, useHash } from "./ui/common";
import { Home } from "./ui/home";
import { Builder } from "./ui/builder";
import { Sheet } from "./ui/sheet";
import { Library } from "./ui/library";
import { Lore } from "./ui/lore";
import { Bestiary } from "./ui/bestiary";
import { QuickBar } from "./ui/quickbar";
import { Table } from "./ui/table";
import { ThemeToggle } from "./ui/theme";

function routeOf(hash: string): { page: "home" | "new" | "sheet" | "library" | "lore" | "bestiary" | "table"; id?: string; panel?: string | null } {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  if (parts[0] === "library") return { page: "library" };
  if (parts[0] === "lore") return { page: "lore" };
  if (parts[0] === "bestiary") return { page: "bestiary", id: parts[1] ? decodeURIComponent(parts[1]) : undefined };
  if (parts[0] === "table") return { page: "table" };
  if (parts[0] === "new") return { page: "new" };
  if (parts[0] === "c" && parts[1]) return { page: "sheet", id: decodeURIComponent(parts[1]), panel: parts[2] ? decodeURIComponent(parts[2]) : null };
  return { page: "home" };
}

export function App() {
  const hash = useHash();
  const route = routeOf(hash);
  const [characters, setCharacters] = useState<Character[]>(() => loadCharacters());

  function write(next: Character[]) {
    setCharacters(next);
    saveCharacters(next);
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
      <ThemeToggle />
      <div className={route.page === "new" ? "has-quickbar creating" : "has-quickbar"}>
      {route.page === "home" && (
        <Home
          characters={characters}
          onCommit={write}
          onDelete={(id) => write(characters.filter((item) => item.id !== id))}
        />
      )}
      {route.page === "library" && <Library />}
      {route.page === "lore" && <Lore />}
      {route.page === "bestiary" && <Bestiary />}
      {route.page === "table" && <Table characters={characters} />}
      {route.page === "new" && (
        <Builder
          onDone={(character) => {
            upsert(character);
            go(`#/c/${character.id}`);
          }}
        />
      )}
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
          <p>Этого персонажа на телефоне нет.</p>
          <button type="button" className="btn" onClick={() => go("#/")}>На главную</button>
        </div>
      )}
      </div>
      <QuickBar
        character={active ?? null}
        roster={characters}
        allowSwitch={route.page !== "sheet"}
        raised={route.page === "new"}
        compact={route.page === "sheet" && !route.panel}
        onChange={upsert}
      />
    </InfoProvider>
  );
}
