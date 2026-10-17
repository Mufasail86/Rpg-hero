import { useEffect, useMemo, useRef, useState } from "react";
import { LICENSE_NOTICE, bestiaryCatalog, monsterByToken, type MonsterCard } from "../data/bestiary";
import { EDITION_NAME, fold, type RulesEdition } from "../data/editions";
import { dnd2014Guidance, dnd2024Budget, pfAward, pfBudget, pfCreatureXp, type Dnd2024Threat, type PfThreat } from "../encounter";
import { ART, artSrc } from "./art";
import { go, useHash } from "./common";
import { SearchField, SelectField } from "./controls";

const PAGE = 24;

const MODE_KEY = "rpg-spoiler";
type Edition = "pf-remaster" | "dnd-2024" | "dnd-2014";

function readMode(): "player" | "gm" {
  try {
    return sessionStorage.getItem(MODE_KEY) === "gm" ? "gm" : "player";
  } catch {
    return "player";
  }
}

function rankLabel(monster: MonsterCard): string {
  return monster.edition === "pf-remaster" ? `уровень ${monster.level}` : `опасность ${monster.cr}`;
}

export function Bestiary() {
  const hash = useHash();
  const token = decodeURIComponent(hash.replace(/^#/, "").split("/").filter(Boolean)[1] ?? "");
  const [mode, setMode] = useState<"player" | "gm">(readMode);
  const [edition, setEdition] = useState<Edition>("pf-remaster");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("все");
  const [trait, setTrait] = useState("");
  const [minLevel, setMinLevel] = useState("");
  const [maxLevel, setMaxLevel] = useState("");
  const [partyLevel, setPartyLevel] = useState("5");
  const [partySize, setPartySize] = useState("4");
  const [pfThreat, setPfThreat] = useState<PfThreat>("moderate");
  const [dndThreat, setDndThreat] = useState<Dnd2024Threat>("low");
  const [picked, setPicked] = useState<string[]>([]);
  const [count, setCount] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  const all = useMemo(bestiaryCatalog, []);
  const focus = token ? monsterByToken(token) : undefined;
  const activeEdition: Edition = focus?.edition === "dnd-2024" || focus?.edition === "dnd-2014" || focus?.edition === "pf-remaster" ? focus.edition : edition;
  const kinds = [...new Set(all.filter((row) => row.edition === activeEdition).map((row) => row.kind))].sort();
  const needle = fold(query.trim());
  const traitNeedle = fold(trait.trim());
  const min = minLevel.trim() === "" ? null : Number(minLevel);
  const max = maxLevel.trim() === "" ? null : Number(maxLevel);
  const filtered = all.filter((row) => {
    if (row.edition !== activeEdition) return false;
    if (kind !== "все" && row.kind !== kind) return false;
    if (min != null && !Number.isNaN(min) && row.level < min) return false;
    if (max != null && !Number.isNaN(max) && row.level > max) return false;
    if (traitNeedle && !fold(row.traits.join(" ")).includes(traitNeedle)) return false;
    if (!needle) return true;
    return fold(`${row.name} ${row.originalName} ${row.kind} ${row.traits.join(" ")}`).includes(needle);
  });
  const parsedLevel = Math.trunc(Number(partyLevel));
  const party = Number.isNaN(parsedLevel) ? 1 : parsedLevel;
  const size = Math.max(1, Math.trunc(Number(partySize) || 1));
  const chosen = picked.map((id) => monsterByToken(id)).filter((row): row is MonsterCard => Boolean(row && row.edition === activeEdition));
  const shown = filtered.slice(0, count);
  const more = shown.length < filtered.length;

  useEffect(() => {
    setCount(PAGE);
  }, [query, kind, trait, minLevel, maxLevel, activeEdition]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !more || focus) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setCount((value) => value + PAGE);
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [more, count, focus, query, kind, trait, minLevel, maxLevel, activeEdition]);

  function pickMode(next: "player" | "gm") {
    setMode(next);
    try {
      sessionStorage.setItem(MODE_KEY, next);
    } catch {
      /* режим остаётся в этой отрисовке */
    }
  }

  function chooseEdition(next: Edition) {
    setEdition(next);
    setKind("все");
    setPicked([]);
    if (token) go("#/bestiary");
  }

  function add(id: string) {
    const monster = monsterByToken(id);
    if (!monster || monster.edition !== activeEdition) return;
    setPicked((current) => [...current, id]);
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="К списку" onClick={() => go(token ? "#/bestiary" : "#/")}>←</button>
        <h1 className="grow">Бестиарий</h1>
      </header>
      <main className="screen stack">
        <p className="kicker">Чудовища отдельно от листа</p>
        <h1 className="display">Три книги, три списка</h1>
        <p className="lead">
          Ядро чудовищ ремастера, бестиарий справочника 5.2.1 и бестиарий справочника 5.1 не смешиваются.
          В режиме игрока виден только уровень или опасность и тип. Полный блок — для ведущего.
        </p>
        <div className="seg" role="group" aria-label="Редакция бестиария">
          {([
            ["pf-remaster", "Ремастер"],
            ["dnd-2024", "2024"],
            ["dnd-2014", "2014"],
          ] as [Edition, string][]).map(([id, label]) => (
            <button key={id} type="button" className={`pill ${activeEdition === id ? "on" : ""}`} aria-pressed={activeEdition === id} data-testid={`bestiary-edition-${id}`} onClick={() => chooseEdition(id)}>{label}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Режим спойлеров">
          <button type="button" className={`pill ${mode === "player" ? "on" : ""}`} aria-pressed={mode === "player"} data-testid="bestiary-player" onClick={() => pickMode("player")}>Режим игрока</button>
          <button type="button" className={`pill ${mode === "gm" ? "on" : ""}`} aria-pressed={mode === "gm"} data-testid="bestiary-gm" onClick={() => pickMode("gm")}>Режим ведущего</button>
        </div>
        <p className="tiny" data-testid="bestiary-count">
          {EDITION_NAME[activeEdition as RulesEdition]}: показано {focus ? 1 : shown.length} из {filtered.length}, в редакции {all.filter((row) => row.edition === activeEdition).length}.
        </p>
        {mode === "gm" && <Encounter edition={activeEdition} party={party} size={size} threat={pfThreat} dndThreat={dndThreat} chosen={chosen} onLevel={setPartyLevel} onSize={setPartySize} onPf={setPfThreat} onDnd={setDndThreat} onRemove={(index) => setPicked((current) => current.filter((_, item) => item !== index))} />}
        {focus && focus.edition === activeEdition ? (
          <MonsterArticle monster={focus} mode={mode} onAdd={() => add(focus.token)} />
        ) : (
          <>
            <SearchField label="Поиск" testId="bestiary-search" value={query} onChange={setQuery} placeholder="Например, гоблин или аболеф" />
            <SelectField label="Тип" testId="bestiary-kind" value={kind} onChange={setKind}>
              <option value="все">все типы</option>
              {kinds.map((item) => <option key={item} value={item}>{item}</option>)}
            </SelectField>
            <div className="grid-2">
              <label className="field">
                <span>{activeEdition === "pf-remaster" ? "Уровень от" : "Опасность от"}</span>
                <input data-testid="bestiary-min" inputMode="decimal" value={minLevel} onChange={(event) => setMinLevel(event.target.value)} />
              </label>
              <label className="field">
                <span>до</span>
                <input data-testid="bestiary-max" inputMode="decimal" value={maxLevel} onChange={(event) => setMaxLevel(event.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>Черта</span>
              <input data-testid="bestiary-trait" value={trait} onChange={(event) => setTrait(event.target.value)} placeholder="Например, гоблинское или злой" />
            </label>
            <figure className="figure-card">
              <img src={artSrc(ART.drake)} alt="Речной змей, свой рисунок, не существо из книги" loading="lazy" decoding="async" />
            </figure>
            <div className="library-grid">
              {shown.map((monster) => (
                <article key={monster.token} className="card stack">
                  <b>{monster.name}</b>
                  <p className="tiny">{monster.originalName} · {rankLabel(monster)} · {monster.size} · {monster.kind}</p>
                  {mode === "gm" && <p className="tiny">КБ {monster.ac} · хиты {monster.hp}{monster.xp != null ? ` · опыт ${monster.xp}` : ""}</p>}
                  <button type="button" className="btn" onClick={() => go(`#/bestiary/${encodeURIComponent(monster.token)}`)}>Открыть</button>
                </article>
              ))}
            </div>
            {more && (
              <button type="button" className="btn" data-testid="bestiary-more" onClick={() => setCount((value) => value + PAGE)}>
                Показать ещё
              </button>
            )}
            <div ref={sentinel} className="sentinel" />
            {filtered.length === 0 && <p>В этой редакции такого существа нет. Другая редакция в этот список не подмешивается.</p>}
          </>
        )}
      </main>
    </div>
  );
}

function MonsterArticle({ monster, mode, onAdd }: { monster: MonsterCard; mode: "player" | "gm"; onAdd: () => void }) {
  const notice = LICENSE_NOTICE[monster.sourceId];
  return (
    <article className="card stack" data-testid="bestiary-card">
      <b>{monster.name}</b>
      <p className="tiny">{monster.originalName} · {rankLabel(monster)} · {monster.size} · {monster.kind}</p>
      {mode === "player" && <p data-testid="bestiary-hidden">Полный блок для ведущего. В режиме игрока скрыты класс брони, хиты, опыт и способности.</p>}
      {mode === "gm" && (
        <>
          <p className="tiny">Черты: {monster.traits.join(", ") || "нет"}</p>
          <p data-testid="bestiary-stats">КБ {monster.ac}. Хиты {monster.hp}.{monster.xp != null ? ` Опыт блока ${monster.xp}.` : " Опыт ремастера считается от уровня отряда, на существе его нет."}</p>
          <p data-testid="bestiary-text" style={{ whiteSpace: "pre-wrap" }}>{monster.text}</p>
          <button type="button" className="btn" data-testid="add-monster" onClick={onAdd}>Добавить во встречу</button>
        </>
      )}
      {notice && (
        <>
          <p className="tiny">{notice.caption}</p>
          <p className="tiny">{notice.english}</p>
        </>
      )}
    </article>
  );
}

function Encounter({
  edition,
  party,
  size,
  threat,
  dndThreat,
  chosen,
  onLevel,
  onSize,
  onPf,
  onDnd,
  onRemove,
}: {
  edition: Edition;
  party: number;
  size: number;
  threat: PfThreat;
  dndThreat: Dnd2024Threat;
  chosen: MonsterCard[];
  onLevel: (value: string) => void;
  onSize: (value: string) => void;
  onPf: (value: PfThreat) => void;
  onDnd: (value: Dnd2024Threat) => void;
  onRemove: (index: number) => void;
}) {
  const pf = edition === "pf-remaster" ? pfBudget(size, threat) : null;
  const award = edition === "pf-remaster" ? pfAward(party, chosen.map((monster) => monster.level)) : null;
  const dnd = edition === "dnd-2024" ? dnd2024Budget(party, size, dndThreat) : null;
  const spent = edition === "pf-remaster"
    ? award?.xp ?? 0
    : chosen.reduce((sum, monster) => sum + (monster.xp ?? 0), 0);
  return (
    <section className="card stack" data-testid="encounter">
      <b>Встреча только этой редакции</b>
      <div className="grid-2">
        <label className="field">
          <span>Уровень героев</span>
          <input data-testid="party-level" inputMode="numeric" value={String(party)} onChange={(event) => onLevel(event.target.value)} />
        </label>
        <label className="field">
          <span>Героев</span>
          <input data-testid="party-size" inputMode="numeric" value={String(size)} onChange={(event) => onSize(event.target.value)} />
        </label>
      </div>
      {edition === "pf-remaster" && (
        <label className="field">
          <span>Угроза по ядру ведущего</span>
          <select data-testid="pf-threat" value={threat} onChange={(event) => onPf(event.target.value as PfThreat)}>
            <option value="trivial">ничтожная, 40 или меньше</option>
            <option value="low">низкая, 60</option>
            <option value="moderate">умеренная, 80</option>
            <option value="severe">серьёзная, 120</option>
            <option value="extreme">крайняя, 160</option>
          </select>
        </label>
      )}
      {edition === "dnd-2024" && (
        <label className="field">
          <span>Бюджет страницы 202</span>
          <select data-testid="dnd-threat" value={dndThreat} onChange={(event) => onDnd(event.target.value as Dnd2024Threat)}>
            <option value="low">низкий</option>
            <option value="moderate">умеренный</option>
            <option value="high">высокий</option>
          </select>
        </label>
      )}
      {edition === "dnd-2014" && <p className="tiny" data-testid="dnd2014-note">{dnd2014Guidance()}</p>}
      <p data-testid="encounter-budget">
        {pf && `Бюджет ${pf.xp}${pf.orLess ? " или меньше" : ""}. `}
        {dnd != null && `Бюджет ${dnd}. `}
        {edition === "dnd-2014" && "Бюджета 2024 года нет. "}
        Потрачено {spent}.
        {award && award.missing > 0 ? ` Вне таблицы −4…+4: ${award.missing}.` : ""}
      </p>
      <p className="tiny" data-testid="encounter-spent">{chosen.length === 0 ? "Существа ещё не добавлены." : chosen.map((monster) => {
        const cost = edition === "pf-remaster" ? pfCreatureXp(party, monster.level) : monster.xp;
        return `${monster.name} ${cost == null ? "вне таблицы" : cost}`;
      }).join("; ")}</p>
      {edition === "pf-remaster" && <p className="tiny">Награда за встречу равна сумме опыта существ для четырёх героев и от числа игроков не меняется.</p>}
      <div className="wrap">
        {chosen.map((monster, index) => (
          <button key={`${monster.token}-${index}`} type="button" className="pill" onClick={() => onRemove(index)}>Убрать {monster.name}</button>
        ))}
      </div>
    </section>
  );
}
