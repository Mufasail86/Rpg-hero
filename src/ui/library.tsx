import { useEffect, useMemo, useRef, useState } from "react";
import { CLASSES as CL5, CONDITIONS as COND5, GENERAL_FEATS, ITEMS as ITEMS5, MASTERY, ORIGIN_FEATS, SKILLS as SK5, SPECIES, SPELLS as SP5, STYLE_FEATS, BACKGROUNDS as BG5 } from "../data/dnd5e";
import { ANCESTRIES, BACKGROUNDS as BG2, CLASSES as CL2, CONDITIONS as COND2, ITEMS as ITEMS2, SKILL_FEATS, SKILLS as SK2, SPELLS as SP2 } from "../data/pf2e";
import { SYSTEM_DND, SYSTEM_PF } from "../labels";
import { ART, ART_CAPTION, artSrc, cardArt } from "./art";
import { go } from "./common";

const PAGE = 24;

interface Row {
  id: string;
  name: string;
  kind: string;
  system: string;
  short: string;
  text: string;
  source: string;
  art: string | null;
}

function rows(): Row[] {
  const list: Row[] = [];
  const add = (id: string, name: string, kind: string, system: string, short: string | undefined, text: string, source: string) => {
    list.push({ id, name, kind, system, short: short ?? "", text, source, art: cardArt(id) });
  };
  const dnd = "открытый справочник 5.2";
  const pf = "открытые правила ремастера";
  for (const item of SPECIES) {
    add(item.id, item.name, "Народ", "dnd5e", item.short, item.info, dnd);
    for (const line of item.lineage ?? []) add(line.id, line.name, "Наследие народа", "dnd5e", line.short, line.info, dnd);
  }
  for (const item of BG5) add(item.id, item.name, "Происхождение", "dnd5e", item.short, item.info, dnd);
  for (const item of CL5) {
    add(item.id, item.name, "Класс", "dnd5e", item.short, item.info, dnd);
    add(`${item.id}-sub`, item.subclass.name, "Подкласс", "dnd5e", item.subclass.short, item.subclass.info, dnd);
  }
  for (const item of [...ORIGIN_FEATS, ...STYLE_FEATS, ...GENERAL_FEATS]) add(item.id, item.name, "Черта", "dnd5e", item.short, item.info, dnd);
  for (const item of SK5) add(item.id, item.name, "Навык", "dnd5e", item.short, item.info, dnd);
  for (const [id, item] of Object.entries(MASTERY)) add(id, item.name, "Свойство оружия", "dnd5e", item.short, item.info, dnd);
  for (const item of COND5) add(item.id, item.name, "Состояние", "dnd5e", item.short, item.info, dnd);
  for (const item of SP5) add(item.id, item.name, "Заклинание", "dnd5e", item.short, item.info, dnd);
  for (const item of ITEMS5) add(item.id, item.name, "Предмет", "dnd5e", item.short, item.info, dnd);
  for (const item of ANCESTRIES) {
    add(item.id, item.name, "Народ", "pf2e", item.short, item.info, pf);
    for (const line of item.heritages) add(line.id, line.name, "Наследие", "pf2e", line.short, line.info, pf);
    for (const feat of item.feats) add(feat.id, feat.name, "Черта народа", "pf2e", feat.short, feat.info, pf);
  }
  for (const item of BG2) add(item.id, item.name, "Происхождение", "pf2e", item.short, item.info, pf);
  for (const item of CL2) {
    add(item.id, item.name, "Класс", "pf2e", item.short, item.info, pf);
    for (const choice of item.choices) {
      for (const option of choice.options) add(option.id, option.name, choice.title, "pf2e", option.short, option.info, pf);
    }
    for (const feat of item.feats) add(feat.id, feat.name, "Черта класса", "pf2e", feat.short, feat.info, pf);
  }
  for (const item of SKILL_FEATS) add(item.id, item.name, "Черта", "pf2e", item.short, item.info, pf);
  for (const item of SK2) add(item.id, item.name, "Навык", "pf2e", item.short, item.info, pf);
  for (const item of COND2) add(item.id, item.name, "Состояние", "pf2e", item.short, item.info, pf);
  for (const item of SP2) add(item.id, item.name, "Заклинание", "pf2e", item.short, item.info, pf);
  for (const item of ITEMS2) add(item.id, item.name, "Предмет", "pf2e", item.short, item.info, pf);
  return list;
}

export function pageSize(): number {
  return PAGE;
}

export function Library() {
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState("все");
  const [count, setCount] = useState(PAGE);
  const all = useMemo(rows, []);
  const needle = query.trim().toLowerCase();
  const filtered = all.filter((row) => {
    if (system !== "все" && row.system !== system) return false;
    if (!needle) return true;
    return `${row.name} ${row.kind} ${row.short} ${row.text}`.toLowerCase().includes(needle);
  });
  const shown = filtered.slice(0, count);
  const more = shown.length < filtered.length;
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCount(PAGE);
  }, [query, system]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !more) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setCount((value) => value + PAGE);
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [more, query, system, count]);

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="К списку" onClick={() => go("#/")}>←</button>
        <h1 className="grow">Справочник</h1>
      </header>
      <main className="screen stack">
        <p className="lead">Короткая строка и подробный пересказ. Числа взяты из открытых правил и совпадают с полями листа. Это не замена книге.</p>
        <figure className="figure-card">
          <img src={artSrc(ART.drake)} alt="Речной змей с медной чешуёй, свой рисунок, не существо из бестиария" loading="lazy" decoding="async" />
          <figcaption className="caption">{ART_CAPTION} Чудовища книг в справочник не входят.</figcaption>
        </figure>
        <label className="field">
          <span>Поиск</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например, кольчуга или лечение" />
        </label>
        <div className="seg" role="group" aria-label="Система">
          {[["все", "все"], ["dnd5e", SYSTEM_DND], ["pf2e", SYSTEM_PF]].map(([id, label]) => (
            <button key={id} type="button" className={`pill ${system === id ? "on" : ""}`} aria-pressed={system === id} onClick={() => setSystem(id)}>{label}</button>
          ))}
        </div>
        <p className="tiny" data-testid="library-count">Показано {shown.length} из {filtered.length}</p>
        <div className="library-grid">
          {shown.map((row, index) => (
            <article key={`${row.system}-${row.kind}-${row.id}-${index}`} className="card stack">
              {row.art && <img className="card-art" src={row.art} alt="" loading="lazy" decoding="async" />}
              <b>{row.name}</b>
              <p className="tiny">{row.system === "dnd5e" ? SYSTEM_DND : SYSTEM_PF} · {row.kind} · {row.source}</p>
              {row.short && <p className="lede">{row.short}</p>}
              <p>{row.text}</p>
            </article>
          ))}
        </div>
        {filtered.length === 0 && <p>Ничего не нашлось. Смените слова или систему.</p>}
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
