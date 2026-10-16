import { useState } from "react";
import { loreCatalog, entryByToken } from "../data/catalog";
import { PACKS } from "../data/editions";
import { ART, ART_CAPTION, artSrc } from "./art";
import { go, useHash } from "./common";

const MODE_KEY = "rpg-spoiler";

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
  const cards = loreCatalog().filter((card) => mode === "gm" || card.spoiler !== "gm");
  const hidden = loreCatalog().length - cards.length;
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
          Показано {focus ? 1 : cards.length} из {loreCatalog().length}. Скрыто от игрока: {hidden}.
        </p>
        {PACKS.filter((pack) => pack.edition === "lore").map((pack) => (
          <p key={pack.id} className="tiny">{pack.title}: {loreCatalog().filter((card) => card.sourceId === pack.id).length} карточек. {pack.note}</p>
        ))}
        {focus && focus.edition === "lore" ? (
          <article className="card stack">
            <b>{focus.name}</b>
            <p className="tiny">{focus.era || "Эпоха не указана"} · {focus.spoiler === "gm" ? "для ведущего" : focus.spoiler === "player" ? "для игрока" : "без спойлера"}</p>
            {focus.short && <p className="lede">{focus.short}</p>}
            <p>{focus.text}</p>
            {focus.link && <p className="tiny">Источник: {focus.link}</p>}
            {focus.relations.length > 0 && (
              <div className="wrap">
                {focus.relations.map((id) => (
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
                  <p className="tiny">{card.settingId === "golarion" ? "Голарион" : "Забытые королевства"} · {card.spoiler === "gm" ? "для ведущего" : card.spoiler === "player" ? "для игрока" : "без спойлера"}</p>
                  {card.short && <p>{card.short}</p>}
                  <button type="button" className="btn" onClick={() => go(`#/lore/${encodeURIComponent(card.token)}`)}>Открыть</button>
                </article>
              ))}
            </div>
          </>
        )}
        <figure className="figure-card">
          <img src={artSrc(ART.castle)} alt="Ночной замок из синего камня над водопадом, свой рисунок" loading="lazy" decoding="async" />
          <figcaption className="caption">{ART_CAPTION} Файл hill-castle.jpg. Это не вид города из книги и не карта.</figcaption>
        </figure>
        <button type="button" className="btn" onClick={() => go("#/library")}>К справочнику правил</button>
      </main>
    </div>
  );
}
