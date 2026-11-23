import { useMemo, useState } from "react";
import { createCharacter } from "../create";
import { starterDraft } from "../beginner";
import { systemTitle } from "../labels";
import { fmt, type Character } from "../types";
import { ENEMIES, actionBlock, equipTraining, newTraining, trainingAction, trainingGear, trainingStats, type TrainingAction, type TrainingConfig } from "../play/training";
import { go } from "./common";
import { portraitSrc } from "./art";

function guest(system: Character["system"]): Character {
  const made = createCharacter(starterDraft(system, "боец", "Учебный герой").draft);
  if (!made.ok) throw new Error(made.error);
  return made.character;
}

export function Training({ characters, heroId }: { characters: Character[]; heroId?: string }) {
  const [selected, setSelected] = useState(heroId ?? characters[0]?.id ?? "guest-pf");
  const guests = useMemo(() => ({ "guest-pf": guest("pf2e"), "guest-dnd": guest("dnd5e") }), []);
  const hero = characters.find(row => row.id === selected) ?? guests[selected as keyof typeof guests] ?? guests["guest-pf"];
  return <div className="app training-app">
    <header className="topbar"><button type="button" className="icon-btn" aria-label="На главную" onClick={() => go("#/")}>←</button><h1 className="grow">Учебные бои</h1></header>
    <main className="screen stack">
      <label className="field"><span>Кто тренируется</span><select data-testid="training-hero" value={selected} onChange={event => setSelected(event.target.value)}>
        {characters.map(row => <option key={row.id} value={row.id}>{row.name} · {systemTitle(row.system)} · уровень {row.level}</option>)}
        <option value="guest-pf">Учебный воин · Pathfinder (PF)</option><option value="guest-dnd">Учебный воин · Подземелья и драконы (D&D)</option>
      </select></label>
      <TrainingRoom key={hero.id} hero={hero} />
    </main>
  </div>;
}

function TrainingRoom({ hero }: { hero: Character }) {
  const [config, setConfig] = useState<TrainingConfig>({ place: "arena", difficulty: "easy", enemy: "dummy" });
  const pool = useMemo(() => trainingGear(hero), [hero]);
  const [weaponId, setWeapon] = useState(hero.items.find(item => item.kind === "weapon" && item.equipped)?.catalogId ?? pool.find(item => item.kind === "weapon")?.id ?? "");
  const [armorId, setArmor] = useState(hero.items.find(item => item.kind === "armor" && item.equipped)?.catalogId ?? "");
  const [shield, setShield] = useState(hero.items.some(item => item.kind === "shield" && item.equipped));
  const copy = useMemo(() => equipTraining(hero, weaponId, armorId, shield), [hero, weaponId, armorId, shield]);
  const stats = useMemo(() => trainingStats(copy), [copy]);
  const [state, setState] = useState(() => newTraining(copy, config));
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const weapon = stats.weapons[0];
  const portrait = hero.photo || portraitSrc(hero.ancestryId, hero.classId);
  const twoHands = pool.find(item => item.id === weaponId)?.weapon;
  const locked = started && state.status === "active";
  function act(action: TrainingAction) {
    setError("");
    try { setState(current => trainingAction(copy, current, config, action)); }
    catch { setError("Этот бросок не поддерживается. Выберите обычное оружие и начните тренировку заново."); }
  }
  function start() { setState(newTraining(copy, config)); setStarted(true); setError(""); }
  const block = (action: TrainingAction) => !started ? "Сначала начните тренировку." : actionBlock(copy, state, action);
  return <>
    <p className="tiny">Безопасная копия листа. Здоровье, деньги, вещи и опыт настоящего героя не меняются. После выхода бой начинается заново.</p>
    <section className="training-setup stack">
      <div className="seg" role="group" aria-label="Место тренировки">
        <button type="button" disabled={locked} aria-pressed={config.place === "arena"} className={`pill ${config.place === "arena" ? "on" : ""}`} onClick={() => setConfig({ ...config, place: "arena" })}>Арена</button>
        <button type="button" disabled={locked} aria-pressed={config.place === "tavern"} className={`pill ${config.place === "tavern" ? "on" : ""}`} onClick={() => setConfig({ ...config, place: "tavern" })}>Таверна</button>
      </div>
      <div className="training-fields">
        <label className="field"><span>Противник</span><select disabled={locked} data-testid="training-enemy" value={config.enemy} onChange={event => setConfig({ ...config, enemy: event.target.value as TrainingConfig["enemy"] })}>{Object.entries(ENEMIES).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
        <label className="field"><span>Сложность спарринга</span><select disabled={locked} data-testid="training-difficulty" value={config.difficulty} onChange={event => setConfig({ ...config, difficulty: event.target.value as TrainingConfig["difficulty"] })}><option value="easy">Знакомство</option><option value="normal">Равный соперник</option><option value="hard">Вызов</option></select></label>
      </div>
      <details open={!started} className="training-equipment"><summary>Снаряжение для пробы</summary><div className="training-fields">
        <label className="field"><span>Оружие</span><select disabled={locked} data-testid="training-weapon" value={weaponId} onChange={event => setWeapon(event.target.value)}>{pool.filter(item => item.kind === "weapon").map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field"><span>Доспех</span><select disabled={locked} data-testid="training-armor" value={armorId} onChange={event => setArmor(event.target.value)}><option value="">Без доспеха</option>{pool.filter(item => item.kind === "armor").map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div><label className="training-check"><input type="checkbox" checked={shield} disabled={locked || Boolean(twoHands?.twoHanded || twoHands?.hands === 2)} onChange={event => setShield(event.target.checked)} /> Щит {twoHands?.twoHanded || twoHands?.hands === 2 ? "недоступен с двуручным оружием" : ""}</label>
        <p className="tiny">Можно примерить предмет без покупки. Владение и ограничения класса всё ещё важны; выбор в тренировке не добавляет владение. Особые свойства оружия, реакции, заклинания и эффекты классов здесь не разыгрываются автоматически.</p>
      </details>
      <div className="training-summary"><span>КБ <b>{stats.ac}</b></span><span>Здоровье <b>{stats.hp}</b></span><span>Атака <b>{fmt(weapon?.attack ?? 0)}</b></span><span>Урон <b>{weapon?.damage ?? "нет оружия"}</b></span></div>
      {weapon?.limited && <p className="warn">Для этого оружия не поддерживается полный расчёт. Выберите обычное оружие без особого критического эффекта.</p>}
      <button type="button" className="btn primary" data-testid="training-start" disabled={locked || !weapon || weapon.limited} onClick={start}>{started ? "Начать заново" : "Начать тренировку"}</button>
      {locked && <button type="button" className="text-btn" onClick={() => { setStarted(false); setState(newTraining(copy, config)); }}>Прервать и сменить снаряжение</button>}
    </section>
    {started && <section className="stack" data-testid="training-fight">
      <div className={`training-stage ${config.place}`}>
        <img className="training-backdrop" src={config.place === "tavern" ? "art/hero-tavern-party.jpg" : "art/hill-castle.jpg"} alt="" />
        <div className="training-stage-content">
          <div className="training-health">{portrait && <img className="training-portrait" src={portrait} alt="" />}<span>{hero.name}</span><b data-testid="training-hp">{state.hp} / {stats.hp}</b><progress aria-label="Здоровье героя" value={state.hp} max={stats.hp} /></div>
          <p className="training-distance">Раунд {state.round} · {state.distance} футов</p>
          <div className="training-health enemy">{config.enemy !== "dummy" && <img className="training-portrait" src={config.enemy === "guard" ? "art/orc-portrait.jpg" : "art/goblin-portrait.jpg"} alt="" />}<span>{ENEMIES[config.enemy]}</span><b data-testid="training-enemy-hp">{state.enemyHp} / {state.enemyMax}</b><progress aria-label="Здоровье противника" value={state.enemyHp} max={state.enemyMax} /></div>
        </div>
      </div>
      <p className="training-economy">{hero.system === "pf2e" ? `Действия: ${state.pf.actions} из 3` : `Действие: ${state.dnd.action ? "есть" : "потрачено"} · атак: ${state.dnd.attacks} из ${stats.perAction} · движение: ${state.movement} футов`}{state.defending ? " · защита действует" : ""}</p>
      <p className="training-hint" role="status" data-testid="training-hint">{state.hint}</p>
      <div className="training-actions">
        {([
          ["approach", "Подойти", hero.system === "pf2e" ? "1 действие" : "перемещение"],
          ["attack", "Атаковать", hero.system === "pf2e" ? "1 действие" : "атака"],
          ["retreat", "Отойти", hero.system === "pf2e" ? "1 действие" : "перемещение"],
          ["defend", hero.system === "pf2e" ? "Поднять щит" : "Уклонение", "1 действие"],
          ["end", "Завершить ход", "ответ противника"],
        ] as [TrainingAction, string, string][]).map(([action, name, cost]) => <button type="button" className="btn" key={action} data-testid={`training-${action}`} disabled={Boolean(block(action))} title={block(action) ?? name} onClick={() => act(action)}><b>{name}</b><small>{cost}</small></button>)}
      </div>
      {error && <p role="alert" className="warn">{error}</p>}
      <h2>Ход боя</h2><ol className="training-log" aria-label="Журнал боя">{state.log.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol>
      {state.status !== "active" && <button type="button" className="btn primary" data-testid="training-restart" onClick={start}>Повторить бой</button>}
    </section>}
    <details className="training-rules"><summary>Чему учит этот бой и где границы</summary><p>Дистанция, основная атака, бросок попадания и урона, критическое попадание, защита, завершение хода и выбор снаряжения. В Pathfinder учитываются три действия и штраф повторных атак; в D&D — действие, дополнительные атаки, перемещение и уклонение.</p><p>Это учебные соперники с подстроенными под героя параметрами, не официальные существа и не оценка сложности приключения. Они наносят один ответный удар за ход. Нет карты укрытий, атак по возможности, магии, лечения, полного набора классовых приёмов и наград. Манекен не отвечает. Противник всегда виден, герой не обездвижен.</p></details>
  </>;
}
