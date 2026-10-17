import { useMemo, useState } from "react";
import { byRu } from "../sort";
import { Choice } from "./common";

export interface PickRow {
  id: string;
  name: string;
  info: string;
  hint?: string;
  level?: number;
}

export function PickList({
  title,
  testId,
  rows,
  selected,
  onPick,
  level,
  onLevel,
  note,
  empty,
}: {
  title: string;
  testId: string;
  rows: PickRow[];
  selected: string;
  onPick: (row: PickRow) => void;
  level?: number;
  onLevel?: (level: number) => void;
  note?: string;
  empty?: string;
}) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(24);
  const needle = query.trim().toLocaleLowerCase("ru");
  const filtered = useMemo(() => {
    const unique = new Map<string, PickRow>();
    for (const row of rows) {
      if (level != null && level !== 0 && row.level != null && row.level !== level) continue;
      if (needle && !`${row.name} ${row.hint ?? ""}`.toLocaleLowerCase("ru").includes(needle)) continue;
      if (!unique.has(row.id)) unique.set(row.id, row);
    }
    return [...unique.values()].sort(byRu((row) => row.name));
  }, [rows, needle, level]);
  const page = filtered.slice(0, shown);
  return (
    <section className="stack" data-testid={testId}>
      <p className="kicker">{title}</p>
      {note && <p className="tiny">{note}</p>}
      <input
        className="search"
        type="search"
        placeholder="Найти по имени"
        value={query}
        aria-label={title}
        onChange={(event) => { setQuery(event.target.value); setShown(24); }}
      />
      {onLevel && (
        <label className="field">
          <span>Уровень черты</span>
          <select value={level ?? 0} onChange={(event) => { onLevel(Number(event.target.value)); setShown(24); }}>
            <option value={0}>Все уровни</option>
            {Array.from({ length: 20 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      )}
      <p className="tiny">Показано {page.length} из {filtered.length}</p>
      {filtered.length === 0 && <p className="tiny">{empty ?? "В этом срезе черт нет. Смените уровень или запрос."}</p>}
      {page.map((row) => (
        <Choice
          key={row.id}
          id={row.id}
          name={row.name}
          hint={row.hint}
          info={row.info}
          on={selected === row.id}
          onPick={() => onPick(row)}
        />
      ))}
      {shown < filtered.length && (
        <button type="button" className="btn" onClick={() => setShown((value) => value + 24)}>Показать ещё</button>
      )}
    </section>
  );
}
