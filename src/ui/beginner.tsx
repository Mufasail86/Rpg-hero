import { useEffect, useState } from "react";
import {
  HINTS_KEY,
  STEP_EXPLAIN,
  STEP_TERMS,
  adviceReason,
  ancestryAdvice,
  backgroundAdvice,
  classFace,
  featAdvice,
  fillStep,
  hintsDefaultOn,
  markTurnPanelSeen,
  draftFromPremade,
  premades,
  recommendedClasses,
  slotTitle,
  wizardOptions,
  spellAdvice,
  starterDraft,
  termById,
  turnPanelStartsOpen,
  tourSeen,
  TERMS,
  type BeginnerRole,
  type Premade,
} from "../beginner";
import { createCharacter, type StepId } from "../create";
import type { Character, Draft } from "../types";
import { go, useInfo } from "./common";
import { adviceForOptions, type AdvicePick } from "../data/build-advice";
import { CARD_BY_ID, cardText } from "../data/cards";
import { learningText } from "../data/learning";
import { Info } from "./common";

export function Term({ id }: { id: string }) {
  const open = useInfo();
  const term = termById(id);
  if (!term) return null;
  return (
    <button
      type="button"
      className="term"
      aria-label={`Что такое ${term.title}`}
      data-testid={`term-${id}`}
      onClick={(event) => {
        event.stopPropagation();
        open(term.title, term.text);
      }}
    >
      ?
    </button>
  );
}

export function StepExplain({ step }: { step: StepId }) {
  const text = STEP_EXPLAIN[step];
  const terms = STEP_TERMS[step];
  return (
    <div className="explain" data-testid="step-explain">
      <p>{text.what}</p>
      <p className="tiny">Пример: {text.example}</p>
      {terms.length > 0 && (
        <p className="term-row">
          {terms.map((id) => {
            const term = termById(id);
            return term ? <span key={id}>{term.title} <Term id={id} /></span> : null;
          })}
        </p>
      )}
    </div>
  );
}

export function Advise({
  items,
  advice,
  onPick,
}: {
  items: { id: string; name: string }[];
  advice: { id: string; reason: string }[];
  onPick: (id: string) => void;
}) {
  const rows = advice
    .map((row) => ({ ...row, name: items.find((item) => item.id === row.id)?.name }))
    .filter((row): row is { id: string; reason: string; name: string } => Boolean(row.name));
  if (!rows.length) return null;
  return (
    <div className="advise" data-testid="advise">
      <p className="kicker">Советуем новичку</p>
      {rows.map((row) => (
        <button key={row.id} type="button" className="advise-row" data-testid={`advise-${row.id}`} onClick={() => onPick(row.id)}>
          <b>{row.name}</b>
          <small>{row.reason}</small>
        </button>
      ))}
    </div>
  );
}

export function FillButton({ draft, step, onFill }: { draft: Draft; step: StepId; onFill: (partial: Partial<Draft>) => void }) {
  return (
    <button type="button" className="btn" data-testid="fill-for-me" onClick={() => onFill(fillStep(draft, step))}>
      Выбрать за меня
    </button>
  );
}

export function classChips(system: "pf2e" | "dnd5e", id: string): { chips: string[]; reason: string } {
  const face = classFace(system, id);
  return { chips: [face.difficulty, face.role], reason: face.reason };
}

export function orderedIds(system: "pf2e" | "dnd5e", ids: string[]): { top: string[]; rest: string[] } {
  const top = recommendedClasses(system).filter((id) => ids.includes(id));
  const rest = ids.filter((id) => !top.includes(id));
  return { top, rest };
}

export function useHints(): [boolean, () => void] {
  const [on, setOn] = useState(hintsDefaultOn);
  function toggle() {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HINTS_KEY, next ? "1" : "0");
      } catch {
        /* приватный режим */
      }
      return next;
    });
  }
  return [on, toggle];
}

export function TurnHints({
  pf,
  attack,
  onRoll,
  onGrowth,
}: {
  pf: boolean;
  attack: number;
  onRoll: (label: string, modifier: number) => void;
  onGrowth: () => void;
}) {
  const [open, setOpen] = useState(turnPanelStartsOpen);
  useEffect(() => {
    markTurnPanelSeen();
  }, []);
  return (
    <aside className={`hint-layer ${open ? "" : "collapsed"}`} data-testid="hint-layer" data-open={open ? "1" : "0"}>
      <button type="button" className="hint-summary" data-testid="hint-collapse" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <b>Что я могу сделать в свой ход</b>
        <span>{open ? "Свернуть" : "Открыть"}</span>
      </button>
      {open && (
        <>
          {pf ? (
            <p>Три действия ◆ <Term id="actions" />. Удар — одно, шаг — одно, много заклинаний — два. Реакция ↺ ждёт чужого хода.</p>
          ) : (
            <p>Есть действие, бонусное действие и перемещение <Term id="turn" />. Атака обычно занимает действие.</p>
          )}
          <div className="wrap">
            <button type="button" className="pill" data-testid="hint-strike" onClick={() => onRoll(pf ? "Удар" : "Атака", attack)}>
              {pf ? "Удар" : "Атака"}, к20
            </button>
            <button type="button" className="pill" onClick={() => onRoll(pf ? "Восприятие" : "Инициатива", attack)}>
              {pf ? "Заметить" : "Кто ходит первым"}
            </button>
          </div>
          <p className="tiny">КБ <Term id="ac" /> — насколько трудно попасть. Спасбросок <Term id="save" /> — бросок, когда опасность уже летит в вас. Хиты — сколько ещё держитесь.</p>
          <button type="button" className="text-btn" data-testid="hint-growth" onClick={onGrowth}>Что нового на следующем уровне</button>
        </>
      )}
    </aside>
  );
}

export { Tour } from "./tour";

export function maybeTour(): boolean {
  return !tourSeen();
}

export function GlossaryPage() {
  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="На главную" onClick={() => go("#/")}>←</button>
        <h1 className="grow">Словарь новичка</h1>
      </header>
      <main className="screen stack">
        <p className="lead">Короткие слова, которые встречаются на листе. Нажмите «?», если такое слово всплыло в другом месте.</p>
        {TERMS.map((term) => (
          <article key={term.id} className="card" data-testid={`gloss-${term.id}`}>
            <b>{term.title}</b>
            <p>{term.text}</p>
          </article>
        ))}
      </main>
    </div>
  );
}

const ROLES: BeginnerRole[] = ["боец", "целитель", "маг", "разведчик", "поддержка"];

export function QuickStart({ onDone }: { onDone: (character: Character) => void }) {
  const [system, setSystem] = useState<"pf2e" | "dnd5e">("pf2e");
  const [role, setRole] = useState<BeginnerRole>("боец");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function createPremade(premade: Premade) {
    const draft = draftFromPremade(premade);
    const made = createCharacter(draft);
    if (!made.ok) {
      setError(made.error);
      return;
    }
    made.character.notes = ["Быстрый старт. Любой выбор можно сменить в развитии и на листе.", ...premade.notes].join("\n");
    made.character.readiness = "built";
    onDone(made.character);
  }

  function create(premadeName: string, roleName: BeginnerRole) {
    const started = starterDraft(system, roleName, premadeName);
    const made = createCharacter(started.draft);
    if (!made.ok) {
      setError(made.error);
      return;
    }
    made.character.notes = ["Быстрый старт. Любой выбор можно сменить в развитии и на листе.", ...started.notes].join("\n");
    made.character.readiness = "built";
    onDone(made.character);
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="На главную" onClick={() => go("#/")}>←</button>
        <h1 className="grow">Быстрый старт</h1>
      </header>
      <main className="screen stack">
        <p className="lead">Игра, роль и имя. Остальное уже выбрано законно: повышения, навыки, черты, вещи и заклинания. Потом всё можно поменять.</p>
        <div className="seg" role="group" aria-label="Игра">
          <button type="button" className={`pill ${system === "pf2e" ? "on" : ""}`} data-testid="quick-pf" onClick={() => setSystem("pf2e")}>Pathfinder</button>
          <button type="button" className={`pill ${system === "dnd5e" ? "on" : ""}`} data-testid="quick-dnd" onClick={() => setSystem("dnd5e")}>D&D</button>
        </div>
        <div className="seg" role="group" aria-label="Роль">
          {ROLES.map((item) => (
            <button key={item} type="button" className={`pill ${role === item ? "on" : ""}`} data-testid={`quick-role-${item}`} onClick={() => setRole(item)}>
              {item}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Имя</span>
          <input data-testid="quick-name" value={name} placeholder="Можно оставить пустым" onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="button" className="btn primary" data-testid="quick-create" onClick={() => create(name, role)}>
          Собрать героя
        </button>
        {error && <p className="warn">{error}</p>}
        <p className="kicker">Готовые герои</p>
        {premades(system).map((premade) => (
          <button key={premade.id} type="button" className="advise-row" data-testid={`premade-${premade.id}`} onClick={() => createPremade(premade)}>
            <b>{premade.name} · {premade.role}</b>
            <small>{premade.blurb}</small>
          </button>
        ))}
      </main>
    </div>
  );
}

export function LevelWizard({
  title,
  level,
  next,
  gained,
  choose,
  adviceAt,
  slots,
  selected,
  optionsFor,
  onPick,
  onRemove,
  advice,
  complexity = "simple",
}: {
  title?: string;
  complexity?: "simple" | "complex";
  level: number;
  next?: number;
  gained?: string[];
  choose?: { id: string; level: number; source: string; label: string }[];
  adviceAt: (level: number) => AdvicePick[];
  slots: { id: string; level: number; source: string; label: string }[];
  selected: { id: string; pick: string; name: string }[];
  optionsFor: (slot: { id: string; level: number; source: string; label: string }) => { pick: string; name: string }[];
  onPick: (slot: { id: string; level: number; source: string; label: string }, pick: string) => void;
  onRemove: (id: string) => void;
  advice?: { pick: string; reason: string }[];
}) {
  const target = level > 1 ? level : next ?? level;
  const future = target > level;
  const choices = future ? choose ?? [] : slots.filter((slot) => slot.level === target);
  return (
    <section className="card stack" data-testid="level-wizard">
      <h2>{title ?? `С ${Math.max(1, target - 1)} на ${target} уровень`}</h2>
      <p className="kicker">Само приходит</p>
      <ul data-testid="level-gains">
        {(gained ?? ["Хиты растут вместе с уровнем."]).map((line) => <li key={line}>{line}</li>)}
      </ul>
      <p className="kicker">Надо выбрать</p>
      {future && choices.length > 0 && <p className="tiny">Сначала повысьте уровень — затем можно выбрать варианты ниже.</p>}
      <div className="stack" data-testid="level-choices">
        {choices.length === 0 && <p>Новых выборов на этом уровне нет.</p>}
        {choices.map((slot) => {
          const chosen = selected.find((row) => row.id === slot.id);
          const available = optionsFor(slot);
          const options = chosen && !available.some((option) => option.pick === chosen.pick)
            ? [...available, { pick: chosen.pick, name: chosen.name }]
            : available;
          const specific = adviceForOptions(options, adviceAt(target));
          const tips = (specific.length ? specific : wizardOptions(slot.source, options, advice)).slice(0, complexity === "complex" ? 6 : 2);
          const pickedId = chosen?.pick.replace(/^feat:/, "").split("|")[0];
          const pickedCard = pickedId ? CARD_BY_ID.get(pickedId) : undefined;
          return (
            <div key={slot.id} className="level-choice stack" data-testid={`level-choice-${slot.id}`}>
              <label className="field">
                <span>{slotTitle(slot.source, slot.label)}</span>
                <select aria-label={slot.label} value={chosen?.pick ?? ""} disabled={future} onChange={(event) => event.target.value ? onPick(slot, event.target.value) : onRemove(slot.id)}>
                  <option value="">Не выбрано</option>
                  {options.map((option) => <option key={option.pick} value={option.pick}>{option.name}</option>)}
                </select>
              </label>
              <div className="advise" data-testid={`advice-${slot.id}`}>
                {tips.map((option) => (
                  <button key={option.pick} type="button" className="advise-row" disabled={future} aria-pressed={chosen?.pick === option.pick} data-testid={`wizard-${slot.id}`} data-advised="1" onClick={() => chosen?.pick === option.pick ? onRemove(slot.id) : onPick(slot, option.pick)}>
                    <b>{option.name}{chosen?.pick === option.pick ? " · выбрано" : ""}</b>
                    <small>{option.reason}</small>
                  </button>
                ))}
              </div>
              {chosen && <button type="button" className="text-btn" onClick={() => onRemove(slot.id)}>Отменить выбор</button>}
              {chosen && pickedId && <div className="row-between"><span>Описание выбранного варианта</span><Info title={chosen.name} text={learningText(pickedId, pickedCard ? cardText(pickedCard) : "Полное правило смотрите в справочнике выбранной редакции.")} /></div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function reasonFor(kind: "ancestry" | "background" | "feat" | "spell", system: "pf2e" | "dnd5e", id: string): string | undefined {
  if (kind === "ancestry") return adviceReason(ancestryAdvice(system), id);
  if (kind === "background") return adviceReason(backgroundAdvice(system), id);
  if (kind === "feat") return adviceReason(featAdvice(), id);
  return adviceReason(spellAdvice(system), id);
}
