import { useState } from "react";
import type { Character } from "./types";
import { loadCharacters, mergeImport, saveCharacters } from "./storage";
import { go, InfoProvider, useHash } from "./ui/common";
import { Home } from "./ui/home";
import { Builder } from "./ui/builder";
import { Sheet } from "./ui/sheet";

function routeOf(hash: string): { page: "home" | "new" | "sheet"; id?: string; panel?: string | null } {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
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

  return (
    <InfoProvider>
      {route.page === "home" && (
        <Home
          characters={characters}
          onImport={(text) => {
            const result = mergeImport(characters, text);
            if ("error" in result) return result.error;
            write(result.characters);
            return null;
          }}
          onDelete={(id) => write(characters.filter((item) => item.id !== id))}
        />
      )}
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
    </InfoProvider>
  );
}
