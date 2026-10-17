import { useEffect, useMemo, useRef, useState } from "react";
import { allEntries, entryByToken, packCounts, type RuleEntry } from "../data/catalog";
import { EDITION_NAME, PACKS, STATUS_NAME, fold, licenseCaption, packById, statusVerified, type RulesEdition } from "../data/editions";
import { SYSTEM_DND, SYSTEM_PF } from "../labels";
import { ruSort } from "../sort";
import { ART, ART_CAPTION, artSrc, cardArt } from "./art";
import { go, useHash } from "./common";
import { cardFor, RuleCardView } from "./rule-card";

const SECTIONS: { id: string; title: string; categories: string[] }[] = [
  { id: "ancestry", title: "Народы", categories: ["species", "ancestry", "lineage"] },
  { id: "heritage", title: "Наследия", categories: ["heritage", "versatile-heritage"] },
  { id: "background", title: "Происхождения", categories: ["background"] },
  { id: "class", title: "Классы", categories: ["class", "subclass", "class-choice"] },
  { id: "feat", title: "Черты", categories: ["ancestry-feat", "class-feat", "skill-feat", "general-feat", "origin-feat", "style", "general-feat", "feat", "mythic-feat"] },
  { id: "archetype", title: "Архетипы", categories: ["archetype"] },
  { id: "spell", title: "Заклинания", categories: ["spell"] },
  { id: "ritual", title: "Ритуалы", categories: ["ritual"] },
  { id: "gear", title: "Снаряжение", categories: ["item", "gear", "weapon", "armor", "shield", "alchemical", "rune"] },
  { id: "companion", title: "Спутники", categories: ["companion", "familiar", "follower", "calling"] },
  { id: "other", title: "Прочее", categories: ["condition", "skill", "mastery", "epic-boon"] },
];

const PAGE = 24;
const FAV_KEY = "rpg-hero-favs";
const HISTORY_KEY = "rpg-hero-history";
const COMPARE_KEY = "rpg-hero-compare";

type EditionFilter = "cores" | "all" | RulesEdition;

function readList(key: string, store: Storage): string[] {
  try {
    const raw = JSON.parse(store.getItem(key) || "[]");
    return Array.isArray(raw) ? raw.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, store: Storage, values: string[]) {
  store.setItem(key, JSON.stringify(values));
}

function systemName(system: string): string {
  if (system === "dnd5e") return SYSTEM_DND;
  if (system === "pf2e") return SYSTEM_PF;
  return "Предание";
}

function editionLabel(entry: RuleEntry): string {
  return entry.edition === "lore" ? "предание" : EDITION_NAME[entry.edition];
}

export function pageSize(): number {
  return PAGE;
}

export function Library() {
  const hash = useHash();
  const token = decodeURIComponent(hash.replace(/^#/, "").split("/").filter(Boolean)[1] ?? "");
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState("все");
  const [edition, setEdition] = useState<EditionFilter>("cores");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [section, setSection] = useState("все");
  const [count, setCount] = useState(PAGE);
  const [favs, setFavs] = useState<string[]>(() => readList(FAV_KEY, localStorage));
  const [compare, setCompare] = useState<string[]>(() => readList(COMPARE_KEY, sessionStorage));
  const [history, setHistory] = useState<string[]>(() => readList(HISTORY_KEY, sessionStorage));
  const all = useMemo(() => allEntries().filter((entry) => entry.edition !== "lore"), []);
  const packs = useMemo(packCounts, []);
  const needle = fold(query.trim());
  const sectionCategories = SECTIONS.find((item) => item.id === section)?.categories;
  const filtered = ruSort(all.filter((row) => {
    if (system !== "все" && row.system !== system) return false;
    if (edition === "cores" && row.edition !== "dnd-2024" && row.edition !== "pf-remaster") return false;
    if (edition !== "cores" && edition !== "all" && row.edition !== edition) return false;
    if (sectionCategories && !sectionCategories.includes(row.category)) return false;
    if (verifiedOnly && !statusVerified(row.status)) return false;
    if (!needle) return true;
    const hay = fold(`${row.name} ${row.originalName} ${row.altNames.join(" ")} ${row.categoryTitle} ${row.short} ${row.text}`);
    return hay.includes(needle);
  }), (row) => row.name);
  const shown = filtered.slice(0, count);
  const more = shown.length < filtered.length;
  const sentinel = useRef<HTMLDivElement>(null);
  const focus = token ? entryByToken(token) : undefined;

  useEffect(() => {
    setCount(PAGE);
  }, [query, system, edition, verifiedOnly, section]);

  useEffect(() => {
    if (!focus || focus.edition === "lore") return;
    const next = [focus.token, ...history.filter((item) => item !== focus.token)].slice(0, 8);
    setHistory(next);
    writeList(HISTORY_KEY, sessionStorage, next);
  }, [focus?.token]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !more || focus) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setCount((value) => value + PAGE);
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [more, query, system, edition, verifiedOnly, section, count, focus]);

  function toggleFav(id: string) {
    const next = favs.includes(id) ? favs.filter((item) => item !== id) : [...favs, id];
    setFavs(next);
    writeList(FAV_KEY, localStorage, next);
  }

  function toggleCompare(id: string) {
    const next = compare.includes(id) ? compare.filter((item) => item !== id) : [...compare, id].slice(-2);
    setCompare(next);
    writeList(COMPARE_KEY, sessionStorage, next);
  }

  if (focus && focus.edition !== "lore") {
    return (
      <div className="app">
        <header className="topbar">
          <button type="button" className="icon-btn" aria-label="К справочнику" onClick={() => go("#/library")}>←</button>
          <h1 className="grow">{focus.name}</h1>
        </header>
        <main className="screen stack">
          <EntryCard entry={focus} fav={favs.includes(focus.token)} compared={compare.includes(focus.token)} onFav={() => toggleFav(focus.token)} onCompare={() => toggleCompare(focus.token)} />
        </main>
      </div>
    );
  }

  const compared = compare.map((id) => entryByToken(id)).filter((entry): entry is RuleEntry => Boolean(entry && entry.edition !== "lore"));

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="К списку" onClick={() => go("#/")}>←</button>
        <h1 className="grow">Справочник</h1>
      </header>
      <main className="screen stack">
        <p className="lead">Короткая строка и подробный пересказ. Редакции подписаны отдельно. «Ждёт сверки» значит: это свой пересказ, не построчная вычитка.</p>
        <figure className="figure-card">
          <img src={artSrc(ART.drake)} alt="Речной змей с медной чешуёй, свой рисунок, не существо из бестиария" loading="lazy" decoding="async" />
          <figcaption className="caption">{ART_CAPTION} Чудовища книг открываются на экране бестиария, не в этом списке правил.</figcaption>
        </figure>
        <section className="card stack">
          <b>Пакеты источников</b>
          {PACKS.filter((pack) => pack.edition !== "lore").map((pack) => {
            const row = packs.find((item) => item.id === pack.id);
            return (
              <p key={pack.id} className="tiny">
                {pack.title}: {row?.entered ?? 0} записей, сверено {row?.verified ?? 0}. {pack.removable ? ((row?.entered ?? 0) > 0 ? "Пакет отдельный: его можно не включать в источники листа." : "Пакет можно не подключать, пока он пуст.") : "Пакет уже внутри сборки."} {pack.bytes === null ? "Отдельный размер не измерялся." : `Размер данных пакета: ${pack.bytes} байт.`}
              </p>
            );
          })}
          <p className="tiny">Предания лежат на своём экране и в этот список правил не подмешиваются.</p>
        </section>
        <nav className="library-tree" data-testid="library-tree" aria-label="Разделы справочника">
          <details open>
            <summary>Разделы</summary>
            <div className="tree-items">
              <button type="button" className={`pill ${section === "все" ? "on" : ""}`} onClick={() => setSection("все")}>Все</button>
              {SECTIONS.map((item) => (
                <button key={item.id} type="button" className={`pill ${section === item.id ? "on" : ""}`} data-testid={`library-section-${item.id}`} onClick={() => setSection(item.id)}>{item.title}</button>
              ))}
              <button type="button" className="pill" onClick={() => go("#/bestiary")}>Бестиарий</button>
              <button type="button" className="pill" onClick={() => go("#/lore")}>Предания</button>
            </div>
          </details>
          {SECTIONS.filter((item) => section === "все" || section === item.id).map((item) => {
            const titles = ruSort(
              [...new Set(all.filter((row) => item.categories.includes(row.category)).map((row) => row.categoryTitle))],
              (title) => title,
            );
            if (titles.length === 0) return null;
            return (
              <details key={item.id}>
                <summary>{item.title}</summary>
                <div className="tree-items">
                  {titles.map((title) => (
                    <button key={title} type="button" className="pill" onClick={() => { setSection(item.id); setQuery(title); }}>{title}</button>
                  ))}
                </div>
              </details>
            );
          })}
        </nav>
        <label className="field">
          <span>Поиск</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например, кольчуга или лечение" />
        </label>
        <div className="seg" role="group" aria-label="Система">
          {[["все", "все"], ["dnd5e", SYSTEM_DND], ["pf2e", SYSTEM_PF]].map(([id, label]) => (
            <button key={id} type="button" className={`pill ${system === id ? "on" : ""}`} aria-pressed={system === id} onClick={() => setSystem(id)}>{label}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Редакция">
          {([
            ["cores", "Основные"],
            ["dnd-2024", "2024"],
            ["dnd-2014", "2014"],
            ["pf-remaster", "Ремастер"],
            ["pf-legacy", "До ремастера"],
            ["all", "Все"],
          ] as [EditionFilter, string][]).map(([id, label]) => (
            <button key={id} type="button" className={`pill ${edition === id ? "on" : ""}`} aria-pressed={edition === id} data-testid={`library-edition-${id}`} onClick={() => setEdition(id)}>{label}</button>
          ))}
        </div>
        {edition === "all" && <p className="tiny">Все редакции сразу. У каждой карточки подписана своя редакция, чтобы 2014 и 2024 не читались как одни правила.</p>}
        <button type="button" className={`pill ${verifiedOnly ? "on" : ""}`} aria-pressed={verifiedOnly} data-testid="library-verified" onClick={() => setVerifiedOnly((value) => !value)}>
          Только сверенное
        </button>
        {history.length > 0 && (
          <p className="tiny">Недавние: {history.map((id) => entryByToken(id)?.name).filter(Boolean).join(", ")}</p>
        )}
        {compared.length > 0 && (
          <section className="card stack" data-testid="library-compare">
            <b>Сравнение</b>
            {compared.map((entry) => (
              <p key={entry.token}><b>{entry.name}</b> · {editionLabel(entry)} · {entry.categoryTitle}. {entry.short || entry.text.slice(0, 140)}</p>
            ))}
            <button type="button" className="btn" onClick={() => { setCompare([]); writeList(COMPARE_KEY, sessionStorage, []); }}>Очистить сравнение</button>
          </section>
        )}
        <p className="tiny" data-testid="library-count">Показано {shown.length} из {filtered.length}</p>
        <div className="library-grid">
          {shown.map((row) => (
            <EntryCard key={row.token} entry={row} fav={favs.includes(row.token)} compared={compare.includes(row.token)} onFav={() => toggleFav(row.token)} onCompare={() => toggleCompare(row.token)} />
          ))}
        </div>
        {filtered.length === 0 && <p>Ничего не нашлось. Смените слова, редакцию или снимите фильтр «только сверенное».</p>}
        {more && (
          <button type="button" className="btn" data-testid="library-more" onClick={() => setCount((value) => value + PAGE)}>
            Показать ещё
          </button>
        )}
        <div ref={sentinel} className="sentinel" />
      </main>
    </div>
  );
}

function EntryCard({
  entry,
  fav,
  compared,
  showTitle = true,
  onFav,
  onCompare,
}: {
  entry: RuleEntry;
  fav: boolean;
  compared: boolean;
  showTitle?: boolean;
  onFav: () => void;
  onCompare: () => void;
}) {
  const art = cardArt(entry.localId.split(":").pop() ?? entry.localId) ?? cardArt(entry.localId);
  const pack = packById(entry.sourceId);
  const card = cardFor(entry.localId);
  const sourceNote = `${systemName(entry.system)} · ${editionLabel(entry)} · ${entry.categoryTitle} · ${pack?.title ?? entry.sourceId}. ${STATUS_NAME[entry.status]} · ${licenseCaption(entry.license)}.`;
  return (
    <article className="card stack">
      {art && <img className="card-art" src={art} alt="" loading="lazy" decoding="async" />}
      {showTitle && <b>{entry.name}</b>}
      {card ? <p className="en-name">{card.originalName}</p> : entry.originalName ? <p className="en-name">{entry.originalName}</p> : null}
      {card ? <RuleCardView card={card} sourceNote={sourceNote} /> : (
        <>
          <p className="tiny">{sourceNote}</p>
          {entry.short && <p className="lede">{entry.short}</p>}
          <p>{entry.text}</p>
        </>
      )}
      {entry.relations.length > 0 && (
        <p className="tiny">Связанные записи: {entry.relations.map((id) => entryByToken(id)?.name ?? id).join(", ")}</p>
      )}
      <div className="wrap">
        <button type="button" className={`pill ${fav ? "on" : ""}`} aria-pressed={fav} onClick={onFav}>{fav ? "В избранном" : "В избранное"}</button>
        <button type="button" className={`pill ${compared ? "on" : ""}`} aria-pressed={compared} onClick={onCompare}>{compared ? "В сравнении" : "Сравнить"}</button>
        <button type="button" className="pill" onClick={() => go(`#/library/${encodeURIComponent(entry.token)}`)}>Открыть карточку</button>
      </div>
    </article>
  );
}
