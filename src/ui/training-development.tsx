import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RotateCcw, WandSparkles } from "lucide-react";
import { atTrainingLevel, mergeTrainingChoices, trainingBuild, trainingSourceKey } from "../play/training-character";
import { choiceCaption, optionsForSlot, slotsForProgress as pfSlots } from "../pf2e/build";
import { describeDndChoice, KNOWN_SUBCLASSES, slotsForProgress as dndSlots } from "../dnd/build";
import { optionsFor as dndOptions } from "./dnd";
import { LevelWizard } from "./beginner";
import { levelAdvice } from "../data/build-advice";
import { skillRows } from "../rules";
import { rulesCatalog } from "../data/catalog";
import { fmt, type Character, type BuildChoice } from "../types";

function slots(hero: Character) { return hero.system === "pf2e" && hero.progress ? pfSlots(hero.progress, hero.level) : hero.dnd ? dndSlots(hero.dnd, hero.level) : []; }
function choices(hero: Character) { return (hero.system === "pf2e" ? hero.progress?.choices : hero.dnd?.choices) ?? []; }
function options(hero: Character, slot: ReturnType<typeof slots>[number]) {
  return hero.system === "pf2e" ? optionsForSlot(slot.source, { classId: hero.classId, ancestryId: hero.ancestryId, level: slot.level, taken: choices(hero).filter(row => row.level <= slot.level).map(row => row.pick), ranks: hero.skillRanks, scores: hero.abilities, skillInGeneral: slot.source === "general-feat" }) : dndOptions(slot.source, hero);
}
function pick(hero: Character, slot: ReturnType<typeof slots>[number], value: string) {
  const copy = structuredClone(hero); const [name, ability] = value.split("|");
  const row: BuildChoice = { ...slot, pick: name, ...(ability ? { detail: { ability } } : {}) };
  const progress = copy.system === "pf2e" ? copy.progress : copy.dnd;
  if (progress) progress.choices = [...progress.choices.filter(row => row.id !== slot.id), row];
  return atTrainingLevel(copy, copy.level);
}
export function fillTrainingChoices(source: Character): Character {
  let hero = atTrainingLevel(source, source.level);
  if (hero.dnd && hero.level >= 3 && !hero.dnd.subclassId) hero.dnd.subclassId = KNOWN_SUBCLASSES.find(row => row.classId === hero.classId)?.id ?? "";
  for (const slot of slots(hero)) {
    if (choices(hero).some(row => row.id === slot.id)) continue;
    const tip = levelAdvice(hero.system === "pf2e" ? "pf-remaster" : "dnd-2024", hero.classId, slot.level);
    const ids = [...(tip?.skills ?? []), ...(tip?.feats ?? []), ...(tip?.archetypes ?? [])].map(row => row.id);
    const list = options(hero, slot).sort((a, b) => {
      const ai = ids.indexOf(a.pick.replace(/^feat:/, "")), bi = ids.indexOf(b.pick.replace(/^feat:/, ""));
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
    const issues = trainingBuild(hero)?.issues.filter(row => row.kind === "build") ?? [];
    const invalid = (text: string) => !text.startsWith("Не закрыт выбор") && !text.includes("не хватает повышений");
    const previousErrors = new Set(issues.filter(row => invalid(row.message)).map(row => row.message));
    for (const option of list.slice(0, 100)) {
      const trial = pick(hero, slot, option.pick);
      const after = trainingBuild(trial)?.issues.filter(row => row.kind === "build") ?? [];
      if (!after.some(row => invalid(row.message) && !previousErrors.has(row.message)) && choices(trial).some(row => row.id === slot.id)) { hero = trial; break; }
    }
  }
  return hero;
}

export function TrainingDevelopment({ source, children }: { source: Character; children: (hero: Character, onRunning: (running: boolean) => void) => ReactNode }) {
  const signature = trainingSourceKey(source), key = `rpg-training-build-v1-${source.id}`;
  const [master, setMaster] = useState(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(key) ?? "null"); if (saved?.source === signature && saved.hero?.id === source.id && Number.isInteger(saved.hero.level) && saved.hero.level >= 1 && saved.hero.level <= 20 && saved.hero.system === source.system) {
      atTrainingLevel(saved.hero, saved.hero.level); trainingBuild(saved.hero);
      return saved.hero as Character;
    } } catch { /* исходный лист остаётся нетронутым */ }
    return structuredClone(source);
  });
  const [level, setLevel] = useState(master.level); const [running, setRunning] = useState(false);
  const [revision, setRevision] = useState(0);
  const hero = useMemo(() => atTrainingLevel(master, level), [master, level]);
  const derived = useMemo(() => trainingBuild(hero), [hero]);
  const cards = useMemo(() => rulesCatalog().filter(row => row.edition === (hero.system === "pf2e" ? "pf-remaster" : "dnd-2024")), [hero.system]);
  const buildIssues = derived?.issues.filter(row => row.kind === "build") ?? [];
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify({ source: signature, hero: { ...master, level } })); } catch { /* тренировка работает без записи */ } }, [master, level, key, signature]);
  function change(next: Character) { setMaster(previous => mergeTrainingChoices(previous, next)); setLevel(next.level); setRevision(value => value + 1); sessionStorage.removeItem(`rpg-tactical-v1-${source.id}`); }
  return <>
    <section className="training-development" data-testid="training-development">
      <div className="training-level-row"><label className="field"><span>Уровень для тренировки</span><select data-testid="training-level" value={level} disabled={running || (!source.progress && !source.dnd)} onChange={event => { setLevel(Number(event.target.value)); setRevision(value => value + 1); sessionStorage.removeItem(`rpg-tactical-v1-${source.id}`); }}>{Array.from({ length: 20 }, (_, index) => <option value={index + 1} key={index}>{index + 1} уровень</option>)}</select></label>
        <button type="button" className="btn" disabled={running} data-testid="training-fill-build" onClick={() => change(fillTrainingChoices(hero))}><WandSparkles size={18} />Заполнить учебным вариантом</button>
        <button type="button" className="icon-btn" disabled={running} title="Вернуть исходный учебный лист" aria-label="Сбросить учебное развитие" onClick={() => change(structuredClone(source))}><RotateCcw size={18} /></button></div>
      {!source.progress && !source.dnd && <p className="warn">У этого листа нет истории развития. Можно проверить его текущий уровень; для сравнения уровней выберите учебного героя с историей.</p>}
      {source.progress?.choices.some(row => ["nimble", "dwarf-lore"].includes(row.pick) || row.id === "class-doctrine") && <p className="tiny">Старые обозначения черт и доктрины переведены в текущий формат только в учебной копии. Исходный лист сохранён.</p>}
      {buildIssues.length > 0 && <p className="warn" data-testid="training-build-warning">Открытых или неверных выборов: {buildIssues.length}. Числа предварительные. Заполните учебным вариантом или выберите сами.</p>}
      <details><summary>Развитие · черты, умения и навыки</summary><fieldset disabled={running} className="training-build-fields">
        {hero.system === "dnd5e" && hero.dnd && level >= 3 && <label className="field"><span>Подкласс</span><select data-testid="training-subclass" value={hero.dnd.subclassId} onChange={event => change({ ...hero, dnd: { ...hero.dnd!, subclassId: event.target.value } })}><option value="">Не выбран</option>{KNOWN_SUBCLASSES.filter(row => row.classId === hero.classId).map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select></label>}
        <LevelWizard title={`Выборы ${level} уровня`} level={level} slots={slots(hero)} selected={choices(hero).map(row => ({ id: row.id, pick: row.detail?.ability ? `${row.pick}|${row.detail.ability}` : row.pick, name: hero.system === "pf2e" ? choiceCaption(row) : describeDndChoice(row) }))} optionsFor={slot => options(hero, slot)} adviceAt={at => { const row = levelAdvice(hero.system === "pf2e" ? "pf-remaster" : "dnd-2024", hero.classId, at); return [...(row?.skills ?? []), ...(row?.feats ?? []), ...(row?.archetypes ?? [])]; }} onPick={(slot, value) => change(pick(hero, slot, value))} onRemove={id => { const copy = structuredClone(hero), progress = copy.system === "pf2e" ? copy.progress : copy.dnd; if (progress) progress.choices = progress.choices.filter(row => row.id !== id); change(copy); }} />
        <details><summary>Все выборы до {level} уровня</summary>{slots(hero).map(slot => {
          const chosen = choices(hero).find(row => row.id === slot.id), value = chosen ? chosen.detail?.ability ? `${chosen.pick}|${chosen.detail.ability}` : chosen.pick : "", list = options(hero, slot);
          return <label className="field" key={slot.id}><span>{slot.level} уровень · {slot.label}</span><select aria-label={`${slot.level} уровень · ${slot.label}`} value={value} onChange={event => { if (event.target.value) change(pick(hero, slot, event.target.value)); }}><option value="">Не выбрано</option>{chosen && !list.some(row => row.pick === value) && <option value={value}>{hero.system === "pf2e" ? choiceCaption(chosen) : describeDndChoice(chosen)}</option>}{list.map(row => <option value={row.pick} key={row.pick}>{row.name}</option>)}</select></label>;
        })}</details>
      </fieldset>
        <h3>Выбранные способности</h3><div className="training-feature-list">{choices(hero).filter(row => /feat|archetype|style|epic/.test(row.source)).map(row => {
          const card = cards.find(card => card.localId === row.pick.replace(/^feat:|^boon:/, ""));
          return <details key={row.id}><summary>{hero.system === "pf2e" ? choiceCaption(row) : describeDndChoice(row)}</summary><p>{card?.text ?? "Постоянные показатели берутся из расчёта листа. Особое применение сверяйте с правилом; автоматизация боя поддерживает только явно указанные действия."}</p></details>;
        })}{[...hero.feats, ...hero.features].filter((row, index, all) => all.findIndex(other => other.name === row.name) === index && !choices(hero).some(choice => (hero.system === "pf2e" ? choiceCaption(choice) : describeDndChoice(choice)) === row.name)).map((row, index) => <details key={`feature-${index}`}><summary>{row.name}</summary><p>{row.info}</p></details>)}</div>
        <h3>Навыки на {level} уровне</h3><div className="training-skill-summary">{skillRows(hero).map(row => <span key={row.id}>{row.name} <b>{fmt(derived?.skills[row.id]?.value ?? row.mod)}</b></span>)}</div>
        <p className="tiny">Учебный вариант — изменяемый черновик, не обязательная сборка. Расчёт листа не означает автоматизацию каждого особого действия. Неподдерживаемые действия остаются справкой и ручными пробами.</p>
        {derived?.issues.length ? <details><summary>Что требует проверки: {derived.issues.length}</summary>{derived.issues.map((row, index) => <p key={index}>{row.message}</p>)}</details> : null}
      </details>
    </section>
    <div key={`${source.id}-${level}-${revision}`}>{children(hero, setRunning)}</div>
  </>;
}
