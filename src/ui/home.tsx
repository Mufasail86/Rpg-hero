import { useRef, useState } from "react";
import type { Character } from "../types";
import { loadDraft } from "../storage";
import { go } from "./common";
import { LegalText } from "./legal";

export function Home({
  characters,
  onImport,
  onDelete,
}: {
  characters: Character[];
  onImport: (text: string) => string | null;
  onDelete: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [about, setAbout] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const draft = loadDraft();
  const hasDraft = Boolean(draft && (draft.system || draft.name));

  function exportAll() {
    const blob = new Blob([JSON.stringify({ app: "rpg-hero", version: 1, characters }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rpg-hero.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Файл сохранён. На телефоне он обычно попадает в «Загрузки».");
  }

  async function onFile(file: File) {
    const text = await file.text();
    const error = onImport(text);
    setMessage(error ?? "Персонажи из файла добавлены. Одинаковые записи обновлены.");
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Герой</h1>
      </header>
      <main className="screen stack">
        <div>
          <h1 className="display">Лист в кармане</h1>
          <p className="lead">D&D 5e и Pathfinder 2e. Всё хранится на этом телефоне, без аккаунта и сервера.</p>
        </div>
        <button type="button" className="btn primary" data-testid="new-character" onClick={() => go("#/new")}>
          Новый персонаж
        </button>
        {hasDraft && (
          <button type="button" className="btn" onClick={() => go("#/new")}>
            Продолжить создание{draft?.name ? `: ${draft.name}` : ""}
          </button>
        )}
        {characters.length === 0 && <p className="muted">Пока никого нет. Создайте героя — лист откроется большими кнопками, каждый раздел на своём экране.</p>}
        {characters.map((hero) => (
          <div key={hero.id} className="card portrait-home">
            {hero.photo ? <img className="avatar" src={hero.photo} alt="" /> : <div className="avatar" aria-hidden>⚔</div>}
            <div className="grow">
              <button type="button" className="text-btn" onClick={() => go(`#/c/${hero.id}`)}>
                <b>{hero.name}</b>
              </button>
              <div className="tiny">
                {hero.system === "dnd5e" ? "D&D 5e" : "Pathfinder 2e"} · {hero.ancestryName} · {hero.className} · {hero.level} ур.
              </div>
              {pendingDelete === hero.id ? (
                <div className="row">
                  <button type="button" className="btn danger" onClick={() => { onDelete(hero.id); setPendingDelete(null); }}>
                    Удалить
                  </button>
                  <button type="button" className="btn" onClick={() => setPendingDelete(null)}>
                    Оставить
                  </button>
                </div>
              ) : (
                <button type="button" className="text-btn" onClick={() => setPendingDelete(hero.id)}>
                  Удалить
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="grid-2">
          <button type="button" className="btn" onClick={exportAll} disabled={characters.length === 0}>
            Экспорт JSON
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Импорт JSON
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
            event.target.value = "";
          }}
        />
        {message && <p className="warn">{message}</p>}
        <button type="button" className="text-btn" onClick={() => setAbout((value) => !value)}>
          {about ? "Скрыть лицензии" : "Об игре и лицензиях"}
        </button>
        {about && <LegalText />}
      </main>
    </div>
  );
}
