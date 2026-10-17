import { useState } from "react";
import { loreCatalog, entryByToken } from "../data/catalog";
import { fold } from "../data/editions";
import { LORE_TOPIC_NAME, type LoreTopic } from "../data/lore";
import { SearchField, SelectField } from "./controls";
import { go, useHash } from "./common";

const MODE_KEY = "rpg-spoiler";

function worldName(id: string): string {
  if (id === "golarion") return "Голарион";
  if (id === "forgotten-realms") return "Забытые королевства";
  if (id === "srd") return "Открытый справочник";
  if (id === "greyhawk") return "Серый Ястреб";
  if (id === "krynn") return "Кринн";
  if (id === "eberron") return "Эберрон";
  if (id === "ravenloft") return "Равенлофт";
  if (id === "spelljammer") return "Корабли между мирами";
  if (id === "athas") return "Атас";
  if (id === "planescape") return "Планы";
  if (id === "policy") return "Политика публикации";
  return "Отдельный мир";
}

function LoreBody({ text }: { text: string }) {
  const mark = "Идея для стола.";
  const cut = text.indexOf(mark);
  if (cut < 0) return <p className="prose">{text}</p>;
  return (
    <>
      <p className="prose">{text.slice(0, cut).trim()}</p>
      <aside className="gm-idea" data-testid="lore-idea">
        <b>{mark}</b> {text.slice(cut + mark.length).trim()}
      </aside>
    </>
  );
}

function readMode(): "player" | "gm" {
  try {
    return sessionStorage.getItem(MODE_KEY) === "gm" ? "gm" : "player";
  } catch {
    return "player";
  }
}

export function Lore() {
  const hash = useHash();
  const token = decodeURIComponent(hash.replace(/^#/, "").split("/").filter(Boolean)[1] ?? "");
  const [mode, setMode] = useState<"player" | "gm">(readMode);
  const [world, setWorld] = useState("все");
  const [topic, setTopic] = useState("все");
  const [query, setQuery] = useState("");
  const stories = loreCatalog().filter((card) => card.category !== "policy");
  const cards = stories.filter((card) => {
    if (mode !== "gm" && card.spoiler === "gm") return false;
    if (world !== "все" && card.settingId !== world) return false;
    if (topic !== "все" && card.category !== topic) return false;
    if (!query.trim()) return true;
    const needle = fold(query);
    return fold(`${card.name} ${card.originalName} ${card.short} ${card.era}`).includes(needle);
  });
  const worlds = [...new Set(stories.map((card) => card.settingId))];
  const hidden = stories.filter((card) => card.spoiler === "gm").length;
  const focus = token ? entryByToken(token) : undefined;

  function pick(next: "player" | "gm") {
    setMode(next);
    try {
      sessionStorage.setItem(MODE_KEY, next);
    } catch {
      /* режим остаётся в этой отрисовке */
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="К списку" onClick={() => go(token ? "#/lore" : "#/")}>←</button>
        <h1 className="grow">Предания</h1>
      </header>
      <main className="screen stack">
        <p className="kicker">Свои пересказы, не текст книг</p>
        <h1 className="display">Миры отдельно от правил</h1>
        <p className="lead">
          Голарион идёт по политике сообщества: некоммерчески, своим коротким пересказом и ссылкой, без абзацев из книг, карт и чужих рисунков.
          Миры «Подземелий и драконов» лежат каждый в своём разделе. Открытый справочник их не содержит, и политика фанатов не разрешает копировать книги.
        </p>
        <div className="seg" role="group" aria-label="Режим спойлеров">
          <button type="button" className={`pill ${mode === "player" ? "on" : ""}`} aria-pressed={mode === "player"} data-testid="lore-player" onClick={() => pick("player")}>Режим игрока</button>
          <button type="button" className={`pill ${mode === "gm" ? "on" : ""}`} aria-pressed={mode === "gm"} data-testid="lore-gm" onClick={() => pick("gm")}>Режим ведущего</button>
        </div>
        <p className="tiny" data-testid="lore-count">
          Преданий {stories.length}, без карточек политики публикации. Показано {focus ? 1 : cards.length}. Скрыто от игрока: {hidden}.
        </p>
        <SearchField label="Поиск" testId="lore-search" value={query} onChange={setQuery} placeholder="Например, Талдор или Глубоководье" />
        <SelectField label="Мир" testId="lore-world" value={world} onChange={setWorld}>
          <option value="все">все миры</option>
          {worlds.map((id) => <option key={id} value={id}>{worldName(id)}</option>)}
        </SelectField>
        <SelectField label="Вид" testId="lore-topic" value={topic} onChange={setTopic}>
          <option value="все">все виды</option>
          {(Object.keys(LORE_TOPIC_NAME) as LoreTopic[]).filter((id) => id !== "policy").map((id) => (
            <option key={id} value={id}>{LORE_TOPIC_NAME[id]}</option>
          ))}
        </SelectField>
        {focus && focus.edition === "lore" && mode === "player" && focus.spoiler === "gm" && (
          <p data-testid="lore-hidden">Эта карточка для ведущего. В режиме игрока текст не показывается.</p>
        )}
        {focus && focus.edition === "lore" && (mode === "gm" || focus.spoiler !== "gm") ? (
          <article className="card stack">
            <b>{focus.name}</b>
            <p className="tiny">{worldName(focus.settingId)} · {LORE_TOPIC_NAME[focus.category as LoreTopic] ?? focus.categoryTitle} · {focus.era || "Эпоха не указана"} · {focus.spoiler === "gm" ? "для ведущего" : focus.spoiler === "player" ? "для игрока" : "без спойлера"}</p>
            {focus.short && <p className="lede">{focus.short}</p>}
            <LoreBody text={focus.text} />
            {focus.link && <p className="tiny">Источник: <a href={focus.link} target="_blank" rel="noreferrer">{focus.link}</a></p>}
            {focus.relations.length > 0 && (
              <div className="wrap">
                {focus.relations.filter((id) => mode === "gm" || entryByToken(id)?.spoiler !== "gm").map((id) => (
                  <button key={id} type="button" className="pill" onClick={() => go(`#/lore/${encodeURIComponent(id)}`)}>{entryByToken(id)?.name ?? id}</button>
                ))}
              </div>
            )}
          </article>
        ) : (
          <>
            {cards.length === 0 && <p>Карточек, которые можно показать в этом режиме, пока нет. Решение их завести принято, текст книг сюда не копируется.</p>}
            <div className="library-grid">
              {cards.map((card) => (
                <article key={card.token} className="card stack">
                  <b>{card.name}</b>
                  <p className="tiny">{worldName(card.settingId)} · {LORE_TOPIC_NAME[card.category as LoreTopic] ?? card.categoryTitle} · {card.era || "без даты"} · {card.spoiler === "gm" ? "для ведущего" : card.spoiler === "player" ? "для игрока" : "без спойлера"}</p>
                  {card.short && <p>{card.short}</p>}
                  <button type="button" className="btn" onClick={() => go(`#/lore/${encodeURIComponent(card.token)}`)}>Открыть</button>
                </article>
              ))}
            </div>
          </>
        )}
        <button type="button" className="btn" onClick={() => go("#/library")}>К справочнику правил</button>
      </main>
    </div>
  );
}
