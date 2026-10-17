import { useRef, useState } from "react";
import { guardCharacter } from "../dnd/guard";
import { artefolCharacter } from "../pf2e/artefol";
import type { Character } from "../types";
import { loadDraft } from "../storage";
import { applySave, previewSave, serialize } from "../transfer";
import { APP_BUILD } from "../build-id";
import { systemTitle } from "../labels";
import { ART, ART_CAPTION, PORTRAIT_PROVENANCE, artSrc, portraitSrc } from "./art";
import { go } from "./common";
import { LegalText } from "./legal";
import { maybeTour, Tour } from "./beginner";

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
  const [tour, setTour] = useState(maybeTour);
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
      <main className="screen">
        <div className="home-grid">
        <div className="stack">
        <figure className="banner" data-testid="home-hero">
          <div className="banner-art">
            <img src={artSrc(ART.hero)} alt="Четыре героя у ночной таверны: щит, лук, молот и бирюзовый свет" />
            <span className="spark" style={{ left: "18%", top: "22%" }} />
            <span className="spark amber" style={{ left: "62%", top: "30%" }} />
            <span className="spark violet" style={{ left: "78%", top: "18%" }} />
          </div>
          <div className="copy">
            <p className="kicker">Ночная таверна</p>
            <h1 className="display">Лист в кармане</h1>
          </div>
        </figure>
        <p className="caption">{ART_CAPTION}</p>
        <p className="lead">Игры D&amp;D и Pathfinder. Лист работает без аккаунта и сервера. Облако не подключается само и никого не публикует.</p>
        <p className="tiny">Первый раз здесь? <button type="button" className="text-btn" onClick={() => go("#/glossary")}>Словарь новичка</button> объясняет КБ, СЛ и другие слова.</p>
        <div className="cast">
          {[
            [ART.elf, "Эльф"],
            [ART.dwarf, "Дварф"],
            [ART.orc, "Орк"],
            [ART.wizard, "Маг"],
            [ART.goblin, "Гоблин"],
          ].map(([file, label]) => (
            <figure key={file}>
              <div className="cast-portrait"><img src={artSrc(file)} alt={label} loading="lazy" decoding="async" /></div>
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
        <button type="button" className="btn primary" data-testid="quick-start" onClick={() => go("#/quick")}>
          Быстрый старт
        </button>
        <button type="button" className="btn" data-testid="new-character" onClick={() => go("#/new")}>
          Новый персонаж, шаг за шагом
        </button>
        <p className="tiny">Кнопки ниже — контрольные воины для проверки правил. Для первой игры они не нужны.</p>
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
        <div className="grid-2">
          <button type="button" className="btn" data-testid="open-library" onClick={() => go("#/library")}>
            Справочник
          </button>
          <button type="button" className="btn" data-testid="open-lore" onClick={() => go("#/lore")}>
            Предания
          </button>
          <button type="button" className="btn" data-testid="open-bestiary" onClick={() => go("#/bestiary")}>
            Бестиарий
          </button>
          <button type="button" className="btn" data-testid="open-table" onClick={() => go("#/table")}>
            Стол ведущего
          </button>
          <button type="button" className="btn" data-testid="open-settings" onClick={() => go("#/settings")}>
            Настройки
          </button>
        </div>
        {hasDraft && (
          <button type="button" className="btn" onClick={() => go("#/new")}>
            Черновик, не проверенный лист{draft?.name ? `: ${draft.name}` : ""}
          </button>
        )}
        </div>
        <div className="stack">
        {characters.length === 0 && <p className="muted">Пока никого нет. Нажмите «Быстрый старт», если нужен готовый герой, или «Новый персонаж», если хотите выбрать всё сами.</p>}
        {characters.map((hero) => {
          const drawn = hero.photo ?? portraitSrc(hero.ancestryId, hero.classId);
          return (
          <div key={hero.id} className="card portrait-home">
            {drawn ? <img className="avatar" src={drawn} alt="" /> : <div className="avatar" aria-hidden>⚔</div>}
            <div className="grow">
              {hero.readiness === "draft" && <span className="chip">Черновик, не проверен</span>}
              <button type="button" className="text-btn" onClick={() => go(`#/c/${hero.id}`)}>
                <b>{hero.name}</b>
              </button>
              <div className="tiny">
                {systemTitle(hero.system)} · {hero.ancestryName} · {hero.className} · {hero.level} ур.
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
          );
        })}
        <div className="grid-2">
          <button type="button" className="btn" onClick={exportAll} disabled={characters.length === 0}>
            Выгрузить файл
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Загрузить файл
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
              <p key={row.id}>{row.name} · {systemTitle(row.system)} · {row.level} ур.</p>
            ))}
            <div className="row">
              <button type="button" className="btn" onClick={() => finishImport("copy")}>Добавить копию</button>
              <button type="button" className="btn primary" onClick={() => finishImport("update")}>Обновить совпадающих</button>
            </div>
            <button type="button" className="text-btn" onClick={() => setPreview(null)}>Отмена</button>
          </div>
        )}
        {message && <p className="warn">{message}</p>}
        <p className="tiny">Память браузера сама не переносится на другой телефон и не уходит на сервер. Чтобы открыть героя на втором устройстве, выгрузите файл и загрузите его там. Сборка {APP_BUILD}.</p>
        <details className="source-foot">
          <summary>Источники и права</summary>
          <p className="tiny">{PORTRAIT_PROVENANCE} {ART_CAPTION}</p>
          {about ? <LegalText /> : <button type="button" className="text-btn" onClick={() => setAbout(true)}>Текст лицензий</button>}
        </details>
        </div>
        </div>
      </main>
      {tour && <Tour onDone={() => setTour(false)} />}
    </div>
  );
}
