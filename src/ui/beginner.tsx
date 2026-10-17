import { useEffect, useState } from "react";
import {
  HINTS_KEY,
  STEP_EXPLAIN,
  STEP_TERMS,
  TOUR_KEY,
  adviceReason,
  ancestryAdvice,
  backgroundAdvice,
  classFace,
  featAdvice,
  fillStep,
  hintsDefaultOn,
  markTurnPanelSeen,
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
} from "../beginner";
import { createCharacter, type StepId } from "../create";
import type { Character, Draft } from "../types";
import { go, useInfo } from "./common";

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

const TOUR = [
  { title: "Лист в кармане", text: "Здесь герой для D&D или Pathfinder. Две игры не смешиваются. Аккаунт не нужен." },
  { title: "Быстрый старт", text: "Выберите игру, роль и имя. Получите готового героя 1 уровня. Потом любое число можно сменить." },
  { title: "Если хотите сами", text: "«Новый персонаж» ведёт по шагам. У каждого шага есть фраза, зачем он. Знак «?» объясняет слово." },
  { title: "За столом", text: "Лист — один экран. Знак «?» в шапке включает подсказки: что делать в свой ход. Их можно выключить." },
];

export function Tour({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const slide = TOUR[page];
  function finish() {
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* приватный режим */
    }
    onDone();
  }
  return (
    <div className="sheet-layer tour" role="dialog" aria-modal="true" aria-label="Первый запуск" data-testid="tour">
      <button type="button" className="backdrop" aria-label="Пропустить знакомство" onClick={finish} />
      <div className="info-card">
        <p className="kicker">Шаг {page + 1} из {TOUR.length}</p>
        <h2>{slide.title}</h2>
        <p>{slide.text}</p>
        <div className="row">
          <button type="button" className="btn" data-testid="tour-skip" onClick={finish}>Пропустить</button>
          {page < TOUR.length - 1 ? (
            <button type="button" className="btn primary" data-testid="tour-next" onClick={() => setPage(page + 1)}>Дальше</button>
          ) : (
            <button type="button" className="btn primary" data-testid="tour-next" onClick={finish}>К героям</button>
          )}
        </div>
      </div>
    </div>
  );
}

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
          <button key={premade.id} type="button" className="advise-row" data-testid={`premade-${premade.id}`} onClick={() => create(premade.name, premade.role)}>
            <b>{premade.name} · {premade.role}</b>
            <small>{premade.blurb}</small>
          </button>
        ))}
      </main>
    </div>
  );
}

export function LevelWizard({
  level,
  open,
  optionsFor,
  onPick,
}: {
  level: number;
  open: { id: string; level: number; source: string; label: string }[];
  optionsFor: (slot: { id: string; level: number; source: string; label: string }) => { pick: string; name: string }[];
  onPick: (slot: { id: string; level: number; source: string; label: string }, pick: string) => void;
}) {
  const here = open.filter((slot) => slot.level === level);
  const slot = here[0] ?? open[0];
  return (
    <section className="card stack" data-testid="level-wizard">
      <h2>Что нового на этом уровне</h2>
      {!slot && <p>Новых выборов нет. Когда придёт опыт, нажмите «Повысить уровень».</p>}
      {slot && (
        <>
          <p>{slotTitle(slot.source, slot.label)}. {here.length > 1 ? `Таких шагов сейчас ${here.length}. Этот — первый.` : "Один шаг."}</p>
          {wizardOptions(slot.source, optionsFor(slot)).map((option, index) => (
            <button key={option.pick} type="button" className="advise-row" data-testid={`wizard-${slot.id}`} onClick={() => onPick(slot, option.pick)}>
              <b>{index === 0 ? "Советуем. " : ""}{option.name}</b>
              <small>{option.reason}</small>
            </button>
          ))}
        </>
      )}
    </section>
  );
}

export function reasonFor(kind: "ancestry" | "background" | "feat" | "spell", system: "pf2e" | "dnd5e", id: string): string | undefined {
  if (kind === "ancestry") return adviceReason(ancestryAdvice(system), id);
  if (kind === "background") return adviceReason(backgroundAdvice(system), id);
  if (kind === "feat") return adviceReason(featAdvice(), id);
  return adviceReason(spellAdvice(system), id);
}
