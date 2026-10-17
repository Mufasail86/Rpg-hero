import { useEffect, useState } from "react";
import { ANATHEMA_NOTE, REMINDER_NOTE, VOW_KINDS, VOW_LABEL, reminderFilled, reminderOf, vowCount } from "../reminder";
import {
  actionGate,
  characterHasFeat,
  keepDie,
  passivePerception,
  resolveCheck,
  skillSnapshot,
  type CheckMode,
  type SkillLine,
} from "../skills/guide";
import { SKILLS as DND_SKILLS } from "../data/dnd5e";
import { rulesOf } from "../data/editions";
import { SKILLS as PF_SKILLS } from "../data/pf2e";
import { Info } from "./common";
import { appendRoll } from "../play/log";
import { type Character, type VowKind, fmt, uid } from "../types";

type Tab = "skills" | "reminder";

export function QuickBar({
  character,
  roster,
  allowSwitch,
  raised,
  onChange,
}: {
  character: Character | null;
  roster: Character[];
  allowSwitch: boolean;
  raised: boolean;
  onChange: (character: Character) => void;
}) {
  const [open, setOpen] = useState<Tab | null>(null);
  const [picked, setPicked] = useState(character?.id ?? "");
  useEffect(() => {
    setPicked(character?.id ?? "");
    setOpen(null);
  }, [character?.id]);
  const current = character ? (allowSwitch ? roster.find((item) => item.id === picked) ?? character : character) : null;
  const vows = current ? vowCount(reminderOf(current)) : 0;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div className="sheet-layer quick-layer" role="dialog" aria-modal="true" aria-label={open === "skills" ? "Навыки" : "Памятка"}>
          <button type="button" className="backdrop" aria-label="Закрыть" onClick={() => setOpen(null)} />
          <div className="panel quick-panel">
            <div className="row-between">
              <div className="seg" role="tablist" aria-label="Быстрый доступ">
                <button type="button" className={`pill ${open === "skills" ? "on" : ""}`} data-testid="tab-skills" onClick={() => setOpen("skills")}>
                  Навыки
                </button>
                <button type="button" className={`pill ${open === "reminder" ? "on" : ""}`} data-testid="tab-reminder" onClick={() => setOpen("reminder")}>
                  Памятка
                </button>
              </div>
              <button type="button" className="text-btn" data-testid="quick-close" onClick={() => setOpen(null)}>
                Закрыть
              </button>
            </div>
            <p className="tiny">{current ? current.name : "Героя на телефоне ещё нет"}</p>
            {current && allowSwitch && roster.length > 1 && (
              <div className="wrap">
                {roster.map((item) => (
                  <button key={item.id} type="button" className={`pill ${item.id === current.id ? "on" : ""}`} onClick={() => setPicked(item.id)}>
                    {item.name}
                  </button>
                ))}
              </div>
            )}
            {open === "skills"
              ? current ? <SkillsPane character={current} onChange={onChange} /> : <SkillGuide />
              : current ? <ReminderPane character={current} onChange={onChange} /> : <ReminderGuide />}
          </div>
        </div>
      )}
      <nav className={`quickbar ${raised ? "raised" : ""}`} aria-label="Быстрый доступ">
        <button type="button" className="btn" data-testid="quick-skills" onClick={() => setOpen("skills")}>
          Навыки
        </button>
        <button type="button" className="btn" data-testid="quick-reminder" onClick={() => setOpen("reminder")}>
          Памятка{vows > 0 ? ` · ${vows}` : ""}
        </button>
      </nav>
    </>
  );
}

function SkillsPane({ character, onChange }: { character: Character; onChange: (character: Character) => void }) {
  const lines = skillSnapshot(character);
  const [showRest, setShowRest] = useState(false);
  const [opened, setOpened] = useState<string | null>(lines.find((line) => line.pinned || line.trained)?.id ?? null);
  const [dc, setDc] = useState("");
  const [mode, setMode] = useState<CheckMode>("normal");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<string>("");
  const head = lines.filter((line) => line.pinned || line.trained);
  const rest = lines.filter((line) => !line.pinned && !line.trained);
  const shown = showRest ? lines : head.length ? head : lines;

  function roll(line: SkillLine, actionId: string | null) {
    if (actionId) {
      const action = line.card.actions.find((item) => item.id === actionId);
      if (action && actionGate(line.rank, action, characterHasFeat(character, action.featId ?? ""))) return;
    }
    const typed = Number(manual);
    const entered = manual !== "" && typed >= 1 && typed <= 20;
    const first = entered ? Math.trunc(typed) : 1 + Math.floor(Math.random() * 20);
    const second = 1 + Math.floor(Math.random() * 20);
    const kept = character.system === "dnd5e" && !entered ? keepDie(mode, first, second) : first;
    const dcNum = dc.trim() === "" ? null : Number(dc);
    const target = dcNum != null && !Number.isNaN(dcNum) ? dcNum : null;
    const check = resolveCheck(character.system, kept, line.modifier, target);
    const dice =
      entered
        ? `Введена кость ${kept}, не готовый итог.`
        : character.system === "dnd5e" && mode !== "normal"
          ? `Кости ${first} и ${second}, взяли ${kept}.`
          : `Кость ${kept}.`;
    const verdict = target == null ? "СЛ не названа, успех не объявляю." : check.verdict;
    setOpened(line.id);
    setResult(`${line.name}: ${dice} К ней только ${fmt(line.modifier)}. Итог ${check.total}. ${verdict}`);
    const action = actionId ? line.card.actions.find((item) => item.id === actionId)?.name ?? line.name : line.name;
    onChange({
      ...character,
      rolls: appendRoll(character.rolls, {
        id: uid(),
        at: Date.now(),
        system: character.system,
        edition: rulesOf(character).edition,
        action,
        dice: entered || mode === "normal" ? [kept] : [first, second],
        kept,
        modifier: line.modifier,
        total: check.total,
        dc: target,
        verdict,
      }),
    });
  }

  return (
    <div className="stack">
      <p className="tiny">Если здесь +7, к кости к20 прибавьте только 7. Характеристика и владение уже внутри.</p>
      <label className="field">
        <span>СЛ, если мастер назвал</span>
        <input inputMode="numeric" data-testid="skill-dc" value={dc} onChange={(event) => setDc(event.target.value)} />
      </label>
      {character.system === "dnd5e" && (
        <div className="seg" role="group" aria-label="Кости">
          <button type="button" className={`pill ${mode === "normal" ? "on" : ""}`} onClick={() => setMode("normal")}>Одна кость</button>
          <button type="button" className={`pill ${mode === "adv" ? "on" : ""}`} onClick={() => setMode("adv")}>Преимущество</button>
          <button type="button" className={`pill ${mode === "dis" ? "on" : ""}`} onClick={() => setMode("dis")}>Помеха</button>
        </div>
      )}
      <label className="field">
        <span>Своя кость, грань от 1 до 20</span>
        <input inputMode="numeric" data-testid="skill-manual" value={manual} onChange={(event) => setManual(event.target.value)} />
      </label>
      {result && <p className="card" data-testid="skill-result">{result}</p>}
      {(character.rolls ?? []).length > 0 && (
        <div className="card stack" data-testid="roll-log">
          <b>Журнал</b>
          <p className="tiny">Старая строка не меняется, если потом поменять лист.</p>
          {(character.rolls ?? []).slice(-5).reverse().map((entry) => (
            <p key={entry.id} className="tiny">{entry.action}: кость {entry.kept} {fmt(entry.modifier)} = {entry.total}. {entry.verdict}</p>
          ))}
        </div>
      )}
      {shown.map((line) => (
        <SkillRow key={line.id} line={line} character={character} open={opened === line.id} onToggle={() => setOpened(opened === line.id ? null : line.id)} onRoll={(actionId) => roll(line, actionId)} />
      ))}
      {rest.length > 0 && head.length > 0 && (
        <button type="button" className="btn" data-testid="skills-rest" onClick={() => setShowRest((value) => !value)}>
          {showRest ? "Скрыть остальные" : `Остальные навыки · ${rest.length}`}
        </button>
      )}
    </div>
  );
}

function SkillRow({
  line,
  character,
  open,
  onToggle,
  onRoll,
}: {
  line: SkillLine;
  character: Character;
  open: boolean;
  onToggle: () => void;
  onRoll: (actionId: string | null) => void;
}) {
  const passive = character.system === "dnd5e" ? passivePerception(line) : null;
  return (
    <div className="card" data-testid={`skill-row-${line.id}`}>
      <div className="skill">
        <button type="button" className="skill-name" onClick={onToggle}>
          <b>{line.name}</b>
          <span className="tiny">{line.rankLabel}{passive != null ? ` · пассивная ${passive}` : ""}</span>
        </button>
        <button type="button" className="mod" data-testid={`skill-roll-${line.id}`} onClick={() => onRoll(null)}>
          {fmt(line.modifier)}
        </button>
      </div>
      {open && (
        <div className="stack">
          <p>{line.card.when}</p>
          <p className="tiny">{line.card.roll} {line.formula}</p>
          {line.statusNote && <p className="tiny">{line.statusNote}</p>}
          <p className="tiny">{line.card.outcome}</p>
          {line.card.actions.map((action) => {
            const block = actionGate(line.rank, action, characterHasFeat(character, action.featId ?? ""));
            return (
              <div key={action.id}>
                <div className="row-between">
                  <b>{action.name}</b>
                  <button type="button" className="btn" data-testid={`skill-action-${line.id}-${action.id}`} disabled={Boolean(block)} onClick={() => onRoll(action.id)}>
                    Бросить
                  </button>
                </div>
                <p className="tiny">{action.brief}</p>
                <p className="tiny">{action.detail}</p>
                {block && <p className="warn">{block}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReminderPane({ character, onChange }: { character: Character; onChange: (character: Character) => void }) {
  const reminder = reminderOf(character);
  const [edit, setEdit] = useState<"story" | "deity" | null>(reminderFilled(reminder) ? null : "story");
  function write(next: typeof reminder) {
    onChange({ ...character, reminder: next, updatedAt: Date.now() });
  }
  function addVow(kind: VowKind) {
    write({ ...reminder, vows: [...reminder.vows, { id: uid(), kind, text: "" }] });
  }
  return (
    <div className="stack">
      <p className="tiny">{REMINDER_NOTE}</p>
      <section className="card stack">
        <b>Наказы</b>
        {reminder.vows.length === 0 && <p className="tiny">Табу, наказы и обязательства. Пока пусто.</p>}
        {reminder.vows.map((vow) => (
          <div key={vow.id} className="stack">
            <div className="seg">
              {VOW_KINDS.map((kind) => (
                <button key={kind} type="button" className={`pill ${vow.kind === kind ? "on" : ""}`} onClick={() => write({ ...reminder, vows: reminder.vows.map((row) => (row.id === vow.id ? { ...row, kind } : row)) })}>
                  {VOW_LABEL[kind]}
                </button>
              ))}
            </div>
            <textarea data-testid={`vow-text-${vow.id}`} value={vow.text} placeholder="Коротко, своими словами" onChange={(event) => write({ ...reminder, vows: reminder.vows.map((row) => (row.id === vow.id ? { ...row, text: event.target.value } : row)) })} />
            <button type="button" className="text-btn" onClick={() => write({ ...reminder, vows: reminder.vows.filter((row) => row.id !== vow.id) })}>
              Убрать
            </button>
          </div>
        ))}
        <div className="wrap">
          <button type="button" className="btn" data-testid="vow-add" onClick={() => addVow("taboo")}>Табу</button>
          <button type="button" className="btn" data-testid="vow-add-vow" onClick={() => addVow("vow")}>Наказ</button>
          <button type="button" className="btn" data-testid="vow-add-duty" onClick={() => addVow("duty")}>Обязательство</button>
          <button type="button" className="btn" onClick={() => addVow("note")}>Своя пометка</button>
        </div>
      </section>
      <section className="card stack">
        <div className="row-between">
          <b>Биография</b>
          <button type="button" className="text-btn" onClick={() => setEdit(edit === "story" ? null : "story")}>{edit === "story" ? "Свернуть" : "Править"}</button>
        </div>
        {edit === "story" ? (
          <textarea data-testid="reminder-story" value={reminder.backstory} placeholder="Кто герой и чего хочет. Можно оставить пустым." onChange={(event) => write({ ...reminder, backstory: event.target.value })} />
        ) : (
          <p>{reminder.backstory.trim() || "Не записана."}</p>
        )}
      </section>
      <section className="card stack">
        <div className="row-between">
          <b>Божество</b>
          <button type="button" className="text-btn" data-testid="deity-edit" onClick={() => setEdit(edit === "deity" ? null : "deity")}>{edit === "deity" ? "Свернуть" : "Править"}</button>
        </div>
        {edit === "deity" ? (
          <>
            <label className="field"><span>Кто</span><input data-testid="deity-name" value={reminder.deity.name} onChange={(event) => write({ ...reminder, deity: { ...reminder.deity, name: event.target.value } })} /></label>
            <label className="field"><span>Сферы</span><input data-testid="deity-domains" value={reminder.deity.domains} onChange={(event) => write({ ...reminder, deity: { ...reminder.deity, domains: event.target.value } })} /></label>
            <label className="field"><span>Символ</span><input data-testid="deity-symbol" value={reminder.deity.symbol} onChange={(event) => write({ ...reminder, deity: { ...reminder.deity, symbol: event.target.value } })} /></label>
            <label className="field"><span>Любимое оружие</span><input data-testid="deity-weapon" value={reminder.deity.weapon} onChange={(event) => write({ ...reminder, deity: { ...reminder.deity, weapon: event.target.value } })} /></label>
            {character.system === "pf2e" && (
              <>
                <label className="field"><span>Эдикты</span><textarea data-testid="deity-edicts" value={reminder.deity.edicts} onChange={(event) => write({ ...reminder, deity: { ...reminder.deity, edicts: event.target.value } })} /></label>
                <label className="field"><span>Анафема</span><textarea data-testid="deity-anathema" value={reminder.deity.anathema} onChange={(event) => write({ ...reminder, deity: { ...reminder.deity, anathema: event.target.value } })} /></label>
                <p className="tiny" data-testid="anathema-note">{ANATHEMA_NOTE}</p>
              </>
            )}
          </>
        ) : reminder.deity.name.trim() ? (
          <>
            <p>{reminder.deity.name}</p>
            {reminder.deity.domains && <p className="tiny">Сферы: {reminder.deity.domains}</p>}
            {reminder.deity.symbol && <p className="tiny">Символ: {reminder.deity.symbol}</p>}
            {reminder.deity.weapon && <p className="tiny">Оружие: {reminder.deity.weapon}</p>}
            {character.system === "pf2e" && reminder.deity.edicts && <p className="tiny">Эдикты: {reminder.deity.edicts}</p>}
            {character.system === "pf2e" && reminder.deity.anathema && <p className="tiny">Анафема: {reminder.deity.anathema}</p>}
            {character.system === "pf2e" && <p className="tiny">{ANATHEMA_NOTE}</p>}
          </>
        ) : (
          <>
            <p className="tiny">Не выбрано. Для обычного воина божество можно не указывать.</p>
            {character.system === "pf2e" && <p className="tiny" data-testid="anathema-note">{ANATHEMA_NOTE}</p>}
          </>
        )}
      </section>
    </div>
  );
}

function SkillGuide() {
  return (
    <div className="stack">
      <p className="tiny">Справочник навыков. Бросок с модификатором героя появится, когда на телефоне будет лист.</p>
      <b>Ремастер</b>
      {PF_SKILLS.map((skill) => (
        <div key={skill.id} className="row-between">
          <span>{skill.name}</span>
          <Info title={skill.name} text={skill.info} />
        </div>
      ))}
      <b>Открытый справочник</b>
      {DND_SKILLS.map((skill) => (
        <div key={skill.id} className="row-between">
          <span>{skill.name}</span>
          <Info title={skill.name} text={skill.info} />
        </div>
      ))}
    </div>
  );
}

function ReminderGuide() {
  return (
    <div className="stack">
      <p className="tiny">{REMINDER_NOTE}</p>
      <p>Табу, наказы и обязательства, предыстория и божество записываются на герое. Создайте лист, и эта вкладка откроет его памятку.</p>
      <p className="tiny">{ANATHEMA_NOTE}</p>
    </div>
  );
}
