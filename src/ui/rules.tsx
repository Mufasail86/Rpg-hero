import { useState } from "react";
import { packCounts } from "../data/catalog";
import { applyEdition, editionPreview, editionsFor, EDITION_NAME, PACKS, rulesOf, sanitizeSources, type RulesEdition } from "../data/editions";
import type { Character } from "../types";
import { clearEditionBackup, loadEditionBackup, saveEditionBackup } from "../storage";

export function RulesPanel({ character, commit }: { character: Character; commit: (next: Character) => void }) {
  const rules = rulesOf(character);
  const [target, setTarget] = useState<RulesEdition | "">("");
  const [notice, setNotice] = useState("");
  const backup = loadEditionBackup(character.id);
  const preview = target ? editionPreview(character.system, rules.edition, target) : null;
  const counts = packCounts();

  function saveSources(sources: string[]) {
    commit({ ...character, rules: { ...rules, sources: sanitizeSources(rules.edition, sources) } });
  }

  function toggleSource(id: string) {
    const sources = rules.sources.includes(id) ? rules.sources.filter((item) => item !== id) : [...rules.sources, id];
    saveSources(sources);
  }

  function confirmSwitch() {
    if (!target) return;
    const next = applyEdition(character, target);
    if (!next.ok) {
      setNotice(next.error);
      return;
    }
    saveEditionBackup(character);
    commit(next.character);
    setTarget("");
    setNotice("Редакция сменена. Запасная копия лежит на этом телефоне.");
  }

  function undo() {
    if (!backup) return;
    commit(backup);
    clearEditionBackup(character.id);
    setNotice("Лист возвращён к запасной копии.");
    setTarget("");
  }

  return (
    <div className="stack">
      <p className="lead">Редакция и пакеты решают, откуда брать новые записи. Уже выбранные черты и числа листа сами не переписываются. Домашние правила в расчёт не входят.</p>
      <p data-testid="rules-edition">Сейчас: {EDITION_NAME[rules.edition]}.</p>
      <div className="stack">
        {PACKS.filter((pack) => pack.edition === rules.edition).map((pack) => {
          const count = counts.find((row) => row.id === pack.id);
          const on = rules.sources.includes(pack.id);
          return (
            <button key={pack.id} type="button" className={`pill ${on ? "on" : ""}`} aria-pressed={on} onClick={() => toggleSource(pack.id)}>
              {pack.title}: {count?.entered ?? 0} записей
            </button>
          );
        })}
      </div>
      <label className="field">
        <span>Домашние правила стола</span>
        <textarea value={rules.houseRules} onChange={(event) => commit({ ...character, rules: { ...rules, houseRules: event.target.value } })} placeholder="Например, свободный архетип. Это заметка, не формула." />
      </label>
      <p className="kicker">Смена редакции</p>
      <div className="seg" role="group" aria-label="Другая редакция">
        {editionsFor(character.system).filter((edition) => edition !== rules.edition).map((edition) => (
          <button key={edition} type="button" className={`pill ${target === edition ? "on" : ""}`} aria-pressed={target === edition} data-testid={`switch-${edition}`} onClick={() => setTarget(edition)}>
            {EDITION_NAME[edition]}
          </button>
        ))}
      </div>
      {preview && preview.ok && <p data-testid="edition-preview">{preview.text}</p>}
      {preview && !preview.ok && <p className="warn">{preview.error}</p>}
      {target && preview?.ok && (
        <button type="button" className="btn primary" data-testid="edition-apply" onClick={confirmSwitch}>Сменить редакцию</button>
      )}
      {backup && <button type="button" className="btn" data-testid="edition-undo" onClick={undo}>Вернуть запасную копию</button>}
      {notice && <p>{notice}</p>}
    </div>
  );
}
