import { useRef, useState } from "react";
import { guardCharacter } from "../dnd/guard";
import { artefolCharacter } from "../pf2e/artefol";
import type { Character } from "../types";
import { loadDraft } from "../storage";
import { applySave, previewSave, serialize } from "../transfer";
import { go } from "./common";
import { LegalText } from "./legal";

export function Home({
  characters,
  onCommit,
  onDelete,
}: {
  characters: Character[];
  onCommit: (characters: Character[]) => void;
  onDelete: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [about, setAbout] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ text: string; rows: { id: string; name: string; system: string; level: number }[] } | null>(null);
  const draft = loadDraft();
  const hasDraft = Boolean(draft && (draft.system || draft.name));

  function exportAll() {
    const blob = new Blob([serialize(characters)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rpg-hero.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Файл сохранён. На телефоне он обычно попадает в «Загрузки». Данные браузера сами на другой телефон не переезжают — нужен этот файл.");
  }

  async function onFile(file: File) {
    const text = await file.text();
    const result = previewSave(text);
    if ("error" in result) {
      setPreview(null);
      setMessage(result.error);
      return;
    }
    setPreview({ text, rows: result.rows });
    setMessage("Проверьте имя, систему и уровень. Ничего не записано, пока не выберете кнопку.");
  }

  function finishImport(mode: "copy" | "update") {
    if (!preview) return;
    const result = applySave(characters, preview.text, mode);
    if ("error" in result) {
      setMessage(result.error);
      return;
    }
    onCommit(result.characters);
    setPreview(null);
    setMessage(mode === "copy" ? "Добавлены копии. Прежние герои на месте." : "Совпадающие герои обновлены, перед заменой сделана запасная копия.");
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Герой</h1>
      </header>
      <main className="screen stack">
        <div>
          <h1 className="display">Лист в кармане</h1>
          <p className="lead">D&D 5e и Pathfinder 2e. Лист работает без аккаунта и сервера. Облако не подключается само и никого не публикует.</p>
        </div>
        <button type="button" className="btn primary" data-testid="new-character" onClick={() => go("#/new")}>
          Новый персонаж
        </button>
        {!characters.some((hero) => hero.id === "artefol-pobochka") && (
          <button type="button" className="btn" data-testid="add-artefol" onClick={() => onCommit([artefolCharacter(), ...characters])}>
            Контрольный воин: Артефол Побочка
          </button>
        )}
        {!characters.some((hero) => hero.id === "strazh-ograda") && (
          <button type="button" className="btn" data-testid="add-guard" onClick={() => onCommit([guardCharacter(), ...characters])}>
            Контрольный воин: Страж Ограда
          </button>
        )}
        <button type="button" className="btn" data-testid="open-library" onClick={() => go("#/library")}>
          Справочник
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
        {preview && (
          <div className="card stack">
            <b>Что в файле</b>
            {preview.rows.map((row) => (
              <p key={row.id}>{row.name} · {row.system === "dnd5e" ? "D&D 5e" : "Pathfinder 2e"} · {row.level} ур.</p>
            ))}
            <div className="row">
              <button type="button" className="btn" onClick={() => finishImport("copy")}>Добавить копию</button>
              <button type="button" className="btn primary" onClick={() => finishImport("update")}>Обновить совпадающих</button>
            </div>
            <button type="button" className="text-btn" onClick={() => setPreview(null)}>Отмена</button>
          </div>
        )}
        {message && <p className="warn">{message}</p>}
        <p className="tiny">Память браузера сама не переносится на другой телефон и не уходит на сервер. Чтобы открыть героя на втором устройстве, экспортируйте JSON и импортируйте его там.</p>
        <button type="button" className="text-btn" onClick={() => setAbout((value) => !value)}>
          {about ? "Скрыть лицензии" : "Об игре и лицензиях"}
        </button>
        {about && <LegalText />}
      </main>
    </div>
  );
}
