import { useMemo, useState } from "react";
import { CLASSES as CL5, CONDITIONS as COND5, GENERAL_FEATS, ITEMS as ITEMS5, ORIGIN_FEATS, SPECIES, SPELLS as SP5, STYLE_FEATS } from "../data/dnd5e";
import { ANCESTRIES, CLASSES as CL2, CONDITIONS as COND2, ITEMS as ITEMS2, SKILL_FEATS, SPELLS as SP2 } from "../data/pf2e";
import { go } from "./common";

interface Row {
  name: string;
  kind: string;
  system: string;
  text: string;
  source: string;
}

function rows(): Row[] {
  const list: Row[] = [];
  const add = (name: string, kind: string, system: string, text: string, source: string) => list.push({ name, kind, system, text, source });
  for (const item of SPECIES) add(item.name, "Народ", "D&D 5e", item.info, "SRD 5.2, CC-BY");
  for (const item of CL5) add(item.name, "Класс", "D&D 5e", item.info, "SRD 5.2, CC-BY");
  for (const item of [...ORIGIN_FEATS, ...STYLE_FEATS, ...GENERAL_FEATS]) add(item.name, "Черта", "D&D 5e", item.info, "SRD 5.2, CC-BY");
  for (const item of COND5) add(item.name, "Состояние", "D&D 5e", item.info, "SRD 5.2, CC-BY");
  for (const item of SP5) add(item.name, "Заклинание", "D&D 5e", item.info, "SRD 5.2, CC-BY");
  for (const item of ITEMS5) add(item.name, "Предмет", "D&D 5e", item.info, "SRD 5.2, CC-BY");
  for (const item of ANCESTRIES) add(item.name, "Народ", "Pathfinder 2e", item.info, "ORC, Remaster");
  for (const item of CL2) add(item.name, "Класс", "Pathfinder 2e", item.info, "ORC, Remaster");
  for (const item of SKILL_FEATS) add(item.name, "Черта", "Pathfinder 2e", item.info, "ORC, Remaster");
  for (const item of COND2) add(item.name, "Состояние", "Pathfinder 2e", item.info, "ORC, Remaster");
  for (const item of SP2) add(item.name, "Заклинание", "Pathfinder 2e", item.info, "ORC, Remaster");
  for (const item of ITEMS2) add(item.name, "Предмет", "Pathfinder 2e", item.info, "ORC, Remaster");
  return list;
}

export function Library() {
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState("все");
  const all = useMemo(rows, []);
  const needle = query.trim().toLowerCase();
  const shown = all.filter((row) => {
    if (system !== "все" && row.system !== system) return false;
    if (!needle) return true;
    return `${row.name} ${row.kind} ${row.text}`.toLowerCase().includes(needle);
  }).slice(0, 40);
  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="К списку" onClick={() => go("#/")}>←</button>
        <h1 className="grow">Справочник</h1>
      </header>
      <main className="screen stack">
        <p className="lead">Короткие русские пересказы открытых правил. Это не замена книге: у каждой карточки указан источник.</p>
        <label className="field">
          <span>Поиск</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например, кольчуга или лечение" />
        </label>
        <div className="seg">
          {["все", "D&D 5e", "Pathfinder 2e"].map((item) => (
            <button key={item} type="button" className={`pill ${system === item ? "on" : ""}`} onClick={() => setSystem(item)}>{item}</button>
          ))}
        </div>
        <p className="tiny">Показано {shown.length} из {all.length}. Длинный список обрезан, уточните поиск.</p>
        {shown.map((row) => (
          <article key={`${row.system}-${row.kind}-${row.name}`} className="card stack">
            <b>{row.name}</b>
            <p className="tiny">{row.system} · {row.kind} · {row.source}</p>
            <p>{row.text}</p>
          </article>
        ))}
      </main>
    </div>
  );
}
