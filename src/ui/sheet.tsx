import { useState } from "react";
import { CLASSES as CL5, GENERAL_FEATS, SKILLS as SK5 } from "../data/dnd5e";
import { RANK_NAME } from "../data/pf2e";
import { conditionList } from "../create";
import { dndCoinPounds, exchange, formatCoins, parsePurse, pay, pfCoinBulk, totalCopper } from "../play/wallet";
import { deathSave, emptyDeath, endTurn, pfRestHeal, previewDamage, previewHeal, recoveryCheck, type Body, type HarmPreview } from "../play/vitality";
import { compressImage } from "../image";
import {
  abilityMod,
  applyLevelUp,
  armorClass,
  attackFor,
  canLevel,
  classDc,
  hpMax,
  initiativeOf,
  loadOf,
  rankLabel,
  refreshSlots,
  saveMod,
  skillRows,
  speedOf,
  spellNumbers,
  xpToNext,
} from "../rules";
import {
  ABILITIES,
  ABILITY_INFO,
  ABILITY_NAME,
  ABILITY_SHORT,
  type Ability,
  type Character,
  type ItemInst,
  fmt,
  mod,
  uid,
} from "../types";
import { go, Info } from "./common";
import { DicePanel, queueRoll } from "./dice";
import { AdvancePanel, CombatTracker, sheetDerived, WarningBanner } from "./remaster";
import { DndAdvance, DndBanner, DndCombatPanel } from "./dnd";
import { sheetDnd, subclassIdOf } from "../dnd/build";
import { systemTitle } from "../labels";
import { EDITION_NAME, rulesOf } from "../data/editions";
import { portraitSrc } from "./art";
import { RulesPanel } from "./rules";

const PANELS = [
  ["abilities", "Характеристики", "Сил", "teal"],
  ["skills", "Навыки", "Нав", "teal"],
  ["hp", "Хиты", "ХП", "copper"],
  ["inventory", "Инвентарь", "Сум", "gold"],
  ["xp", "Опыт", "Ур", "teal"],
  ["hero", "Очки", "★", "gold"],
  ["spells", "Заклинания", "✦", "copper"],
  ["dice", "Броски", "к20", "teal"],
] as const;

const VALUED = new Set(["exhaustion", "clumsy", "doomed", "drained", "enfeebled", "frightened", "sickened", "slowed", "stunned", "stupefied", "wounded"]);

export function Sheet({
  character,
  panel,
  onChange,
  onDelete,
}: {
  character: Character;
  panel: string | null;
  onChange: (character: Character) => void;
  onDelete: () => void;
}) {
  const derived = sheetDerived(character);
  const dnd = sheetDnd(character);
  const max = derived?.hp.value ?? dnd?.hp.value ?? hpMax(character);
  const ac = derived
    ? { value: derived.ac.value, text: [derived.ac.formula, ...derived.ac.aside].join("\n") }
    : dnd
      ? { value: dnd.ac.value, text: [dnd.ac.formula, ...dnd.ac.aside].join("\n") }
      : armorClass(character);
  const init = derived
    ? { value: derived.initiative.value, text: derived.initiative.formula }
    : dnd
      ? { value: dnd.initiative.value, text: [dnd.initiative.formula, ...dnd.initiative.aside].join("\n") }
      : initiativeOf(character);
  const speed = derived
    ? { value: derived.speed.value, text: derived.speed.formula }
    : dnd
      ? { value: dnd.speed.value, text: dnd.speed.formula }
      : speedOf(character);
  const title = panel === "growth" ? "Развитие" : panel === "combat" ? "Бой" : panel === "notes" ? "Заметки" : panel === "rules" ? "Редакция" : PANELS.find((item) => item[0] === panel)?.[1] ?? character.name;
  const [confirmDelete, setConfirmDelete] = useState(false);

  function commit(next: Character) {
    onChange({ ...next, updatedAt: Date.now() });
  }

  async function photo(file: File) {
    try {
      commit({ ...character, photo: await compressImage(file) });
    } catch {
      /* оставляем прежний портрет */
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label={panel ? "К листу" : "К списку"} onClick={() => go(panel ? `#/c/${character.id}` : "#/")}>
          ←
        </button>
        <h1 className="grow">{panel ? title : "Лист"}</h1>
      </header>
      {!panel && (
        <main className="screen stack">
          <section className="card hero-card">
            <label className="avatar-btn">
              {character.photo ? <img src={character.photo} alt="" /> : portraitSrc(character.ancestryId, character.classId) ? <img src={portraitSrc(character.ancestryId, character.classId) ?? ""} alt="" /> : <span>⚔</span>}
              <input hidden type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void photo(file); }} />
            </label>
            <div className="grow">
              <input data-testid="sheet-name" value={character.name} onChange={(event) => commit({ ...character, name: event.target.value })} />
              <div className="chips">
                <span className="chip">{systemTitle(character.system)}</span>
                <span className="chip">{EDITION_NAME[rulesOf(character).edition]}</span>
                <span className="chip">{character.ancestryName}</span>
                <span className="chip">{character.className}</span>
                <span className="chip">{character.level} ур.</span>
                {character.readiness === "draft" && <span className="chip">Черновик, не проверен</span>}
                {character.versatileHeritageId && <span className="chip">Универсальное наследие</span>}
              </div>
            </div>
          </section>
          <WarningBanner character={character} />
          {character.system === "dnd5e" && <DndBanner character={character} />}
          <div className="quick">
            <Stat label="КБ" value={String(ac.value)} info={ac.text} />
            <Stat label="Скорость" value={String(speed.value)} info={speed.text} />
            <Stat label="Инициатива" value={fmt(init.value)} info={init.text} />
            <Stat label="Хиты" value={`${character.hpCurrent}/${max}`} info={derived?.hp.formula ?? `Временные ${character.hpTemp}. Максимум считается из кости, Телосложения и черт.`} />
          </div>
          {derived && <p className="tiny">{derived.attacks.find((attack) => attack.equipped)?.attack.formula}</p>}
          {dnd && <p className="tiny">{dnd.attacks.find((attack) => attack.equipped)?.attack.formula} · {dnd.attacks.find((attack) => attack.equipped)?.damage} · крит {dnd.crit}</p>}
          <div className="stack">
            {PANELS.map(([id, name, mark, tone]) => (
              <button key={id} type="button" className={`big ${tone === "teal" ? "" : tone}`} data-testid={`open-${id}`} onClick={() => go(`#/c/${character.id}/${id}`)}>
                <span className="mark">{mark}</span>
                <span>
                  <b>{id === "hero" ? (character.system === "pf2e" ? "Очки героизма" : "Вдохновение") : name}</b>
                  <span>{blurb(character, id, max)}</span>
                </span>
              </button>
            ))}
            {(character.progress || character.dnd) && (
              <button type="button" className="big" data-testid="open-growth" onClick={() => go(`#/c/${character.id}/growth`)}>
                <span className="mark">↑</span>
                <span>
                  <b>Развитие</b>
                  <span>Уровни 1–20, разбор и условные эффекты</span>
                </span>
              </button>
            )}
            {(character.dnd || character.progress) && (
              <button type="button" className="big" data-testid="open-combat" onClick={() => go(`#/c/${character.id}/combat`)}>
                <span className="mark">⚔</span>
                <span>
                  <b>Бой</b>
                  <span>{character.system === "dnd5e" ? "Действие, бонус, реакция, атаки и ячейки" : "Три действия, реакция и повторные атаки"}</span>
                </span>
              </button>
            )}
            <button type="button" className="big" data-testid="open-rules" onClick={() => go(`#/c/${character.id}/rules`)}>
              <span className="mark">§</span>
              <span>
                <b>Редакция</b>
                <span>{EDITION_NAME[rulesOf(character).edition]}. Пакеты и домашние правила</span>
              </span>
            </button>
            <button type="button" className="big" data-testid="open-notes" onClick={() => go(`#/c/${character.id}/notes`)}>
              <span className="mark">✎</span>
              <span>
                <b>Заметки</b>
                <span>Языки, черты и свои пометки</span>
              </span>
            </button>
          </div>
          {confirmDelete ? (
            <div className="row">
              <button type="button" className="btn danger" onClick={onDelete}>Удалить насовсем</button>
              <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>Оставить</button>
            </div>
          ) : (
            <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
              Удалить персонажа
            </button>
          )}
        </main>
      )}
      {panel && (
        <main className="screen stack">
          {panel === "abilities" && <Abilities character={character} commit={commit} />}
          {panel === "skills" && <Skills character={character} commit={commit} />}
          {panel === "hp" && <Health character={character} commit={commit} />}
          {panel === "inventory" && <Inventory character={character} commit={commit} />}
          {panel === "xp" && <Experience character={character} commit={commit} />}
          {panel === "hero" && <Hero character={character} commit={commit} />}
          {panel === "spells" && <Spells character={character} commit={commit} />}
          {panel === "dice" && <DicePanel />}
          {panel === "notes" && <Notes character={character} commit={commit} />}
          {panel === "rules" && <RulesPanel character={character} commit={commit} />}
          {panel === "growth" && (character.dnd ? <DndAdvance character={character} onChange={commit} /> : <AdvancePanel character={character} onChange={commit} />)}
          {panel === "combat" && (character.system === "dnd5e" ? <DndCombatPanel character={character} onChange={commit} /> : <CombatTracker character={character} onChange={commit} />)}
          {panel && !["abilities", "skills", "hp", "inventory", "xp", "hero", "spells", "dice", "notes", "growth", "combat", "rules"].includes(panel) && <p>Такого раздела нет.</p>}
        </main>
      )}
    </div>
  );
}

function blurb(character: Character, id: string, max: number): string {
  if (id === "abilities") return ABILITIES.map((ability) => `${ABILITY_SHORT[ability]} ${fmt(mod(character.abilities[ability]))}`).join(" ");
  if (id === "skills") return "Проверка с кнопки сразу открывает кости";
  if (id === "hp") return `${character.hpCurrent} из ${max}${character.hpTemp ? `, временные ${character.hpTemp}` : ""}`;
  if (id === "inventory") return loadOf(character).text;
  if (id === "xp") return character.system === "pf2e" ? `${character.xp} / 1000` : `${character.xp} опыта`;
  if (id === "hero") return character.system === "pf2e" ? `${character.hero} из 3` : character.hero > 0 ? "есть" : "нет";
  if (id === "spells") return character.spellcasting ? `${character.spells.length} в запасе` : "если магия есть";
  return "к4–к100, преимущество, встряхивание";
}

function Stat({ label, value, info }: { label: string; value: string; info: string }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
      <Info title={label} text={info} />
    </div>
  );
}

function rollTo(character: Character, label: string, modifier: number, die = 20) {
  queueRoll({ label, mod: modifier, die, system: character.system });
  go(`#/c/${character.id}/dice`);
}

function Abilities({ character, commit }: { character: Character; commit: (next: Character) => void }) {
  const derived = sheetDerived(character);
  if (derived) {
    return (
      <>
        <p className="tiny">Числа собраны из повышений. Нажмите модификатор, чтобы увидеть формулу и бросить.</p>
        {ABILITIES.map((ability) => {
          const row = derived.abilities[ability];
          return (
            <div key={ability} className="ability">
              <div>
                <b>{ABILITY_NAME[ability]}</b>
                <div className="tiny">{row.score}{row.partial ? " · частичное повышение" : ""}</div>
              </div>
              <button type="button" className="mod" onClick={() => rollTo(character, ABILITY_NAME[ability], row.mod)}>{fmt(row.mod)}</button>
              <Info title={ABILITY_NAME[ability]} text={row.formula} />
            </div>
          );
        })}
        <h2>Испытания</h2>
        {(["fort", "ref", "will"] as const).map((key) => {
          const save = derived.saves[key];
          const name = key === "fort" ? "Стойкость" : key === "ref" ? "Рефлексы" : "Воля";
          return (
            <div key={key} className="skill">
              <div>
                <b>{name}</b>
                <span className="tiny">{save.rank}</span>
              </div>
              <button type="button" className="mod" onClick={() => rollTo(character, name, save.value)}>{fmt(save.value)}</button>
              <Info title={name} text={[save.formula, ...save.aside].join("\n")} />
            </div>
          );
        })}
        <div className="skill">
          <div><b>Восприятие</b></div>
          <button type="button" className="mod" onClick={() => rollTo(character, "Восприятие", derived.perception.value)}>{fmt(derived.perception.value)}</button>
          <Info title="Восприятие" text={derived.perception.formula} />
        </div>
        <div className="skill">
          <div><b>Инициатива</b></div>
          <button type="button" className="mod" onClick={() => rollTo(character, "Инициатива", derived.initiative.value)}>{fmt(derived.initiative.value)}</button>
          <Info title="Инициатива" text={[derived.initiative.formula, ...derived.initiative.aside].join("\n")} />
        </div>
        {derived.classDc && <p className="tiny">{derived.classDc.formula}</p>}
      </>
    );
  }
  function setAbility(ability: Ability, value: number) {
    const abilities = { ...character.abilities, [ability]: Math.max(1, Math.min(30, value)) };
    const next = { ...character, abilities };
    const max = hpMax(next);
    if (next.hpCurrent > max) next.hpCurrent = max;
    commit(next);
  }
  const saves = character.system === "dnd5e"
    ? ABILITIES.map((ability) => ({ key: ability, name: ABILITY_NAME[ability], ability, info: `Спасбросок ${ABILITY_NAME[ability]}. Если есть владение, прибавляется бонус мастерства.` }))
    : [
        { key: "fort", name: "Стойкость", ability: "con" as Ability, info: "Спасбросок Телосложения. Успех, крит и провал отличаются на 10 от сложности." },
        { key: "ref", name: "Рефлексы", ability: "dex" as Ability, info: "Спасбросок Ловкости: увернуться от области." },
        { key: "will", name: "Воля", ability: "wis" as Ability, info: "Спасбросок Мудрости против страха, контроля и ментальной магии." },
      ];
  return (
    <>
      {ABILITIES.map((ability) => (
        <div key={ability} className="ability">
          <div>
            <b>{ABILITY_NAME[ability]}</b>
            <div className="tiny">{ABILITY_SHORT[ability]}</div>
          </div>
          <div className="stepper">
            <button type="button" aria-label="Меньше" onClick={() => setAbility(ability, character.abilities[ability] - 1)}>−</button>
            <b>{character.abilities[ability]}</b>
            <button type="button" aria-label="Больше" onClick={() => setAbility(ability, character.abilities[ability] + 1)}>+</button>
          </div>
          <button type="button" className="mod" onClick={() => rollTo(character, ABILITY_NAME[ability], mod(character.abilities[ability]))}>
            {fmt(mod(character.abilities[ability]))}
          </button>
          <Info title={ABILITY_NAME[ability]} text={sheetDnd(character)?.abilities[ability].formula ?? ABILITY_INFO[ability]} />
        </div>
      ))}
      <h2>Спасброски</h2>
      {saves.map((save) => {
        const value = saveMod(character, save.key, save.ability);
        return (
          <div key={save.key} className="skill">
            <div>
              <b>{save.name}</b>
              <span className="tiny">{rankLabel(character.system, character.saves[save.key] ?? "untrained")}</span>
            </div>
            <button type="button" className="mod" onClick={() => rollTo(character, save.name, value)}>{fmt(value)}</button>
            <Info title={save.name} text={character.system === "dnd5e" ? (sheetDnd(character)?.saves[save.ability].formula ?? save.info) : save.info} />
          </div>
        );
      })}
      {character.system === "pf2e" && (
        <div className="skill">
          <div>
            <b>Восприятие</b>
            <span className="tiny">{RANK_NAME[character.perceptionRank] ?? character.perceptionRank}. Инициатива равна восприятию.</span>
          </div>
          <button type="button" className="mod" onClick={() => rollTo(character, "Восприятие", initiativeOf(character).value)}>{fmt(initiativeOf(character).value)}</button>
          <Info title="Восприятие" text={initiativeOf(character).text} />
        </div>
      )}
    </>
  );
}

function Skills({ character, commit }: { character: Character; commit: (next: Character) => void }) {
  const derived = sheetDerived(character);
  if (derived) {
    const rows = Object.entries(derived.skills).filter(([, skill]) => skill.rank !== "untrained");
    return (
      <>
        <p className="tiny">Ранг берётся из истории развития. Модификатор открывает формулу и бросок.</p>
        {rows.map(([id, skill]) => (
          <div key={id} className="skill">
            <div>
              <b>{skill.formula.split(" ")[0]}</b>
              <span className="tiny">{ABILITY_SHORT[skill.ability]} · {skill.rank}</span>
            </div>
            <button type="button" className="mod" onClick={() => rollTo(character, skill.formula.split(" ")[0], skill.value)}>{fmt(skill.value)}</button>
            <Info title={skill.formula.split(" ")[0]} text={skill.formula} />
          </div>
        ))}
      </>
    );
  }
  const cycle = character.system === "dnd5e" ? ["untrained", "proficient", "expertise"] : ["untrained", "trained", "expert", "master", "legendary"];
  function bump(id: string) {
    const current = character.skillRanks[id] ?? "untrained";
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    commit({ ...character, skillRanks: { ...character.skillRanks, [id]: next } });
  }
  return (
    <>
      <p className="tiny">Нажмите модификатор, чтобы бросить к20. Название переключает владение.</p>
      {skillRows(character).map((skill) => (
        <div key={skill.id} className="skill">
          <button type="button" className="text-btn" onClick={() => bump(skill.id)}>
            <b>{skill.name}</b>
            <span className="tiny">{ABILITY_SHORT[skill.ability]} · {rankLabel(character.system, skill.rank)}</span>
          </button>
          <button type="button" className="mod" data-testid={`roll-${skill.id}`} onClick={() => rollTo(character, skill.name, skill.mod)}>{fmt(skill.mod)}</button>
          <Info title={skill.name} text={sheetDnd(character)?.skills[skill.id]?.formula ?? skill.info} />
        </div>
      ))}
    </>
  );
}

function bodyOf(character: Character): Body {
  return {
    hpCurrent: character.hpCurrent,
    hpTemp: character.hpTemp,
    conditions: character.conditions,
    values: character.conditionValues,
    death: character.death ?? emptyDeath(),
  };
}

function withHarm(character: Character, preview: HarmPreview): Character {
  return {
    ...character,
    hpCurrent: preview.body.hpCurrent,
    hpTemp: preview.body.hpTemp,
    conditions: preview.body.conditions,
    conditionValues: preview.body.values,
    death: preview.body.death,
    undo: {
      hpCurrent: character.hpCurrent,
      hpTemp: character.hpTemp,
      conditions: [...character.conditions],
      conditionValues: { ...character.conditionValues },
      death: character.death ?? emptyDeath(),
      coins: { ...character.coins },
    },
  };
}

function Health({ character, commit }: { character: Character; commit: (next: Character) => void }) {
  const derived = sheetDerived(character);
  const dnd = sheetDnd(character);
  const max = derived?.hp.value ?? dnd?.hp.value ?? hpMax(character);
  const [amount, setAmount] = useState(1);
  const [crit, setCrit] = useState(false);
  const [nonlethal, setNonlethal] = useState(false);
  const [harmText, setHarmText] = useState("");
  const [bone, setBone] = useState("");
  const [confirmFull, setConfirmFull] = useState(false);
  const dying = character.conditionValues.dying ?? 0;
  function applyHarm(preview: HarmPreview) {
    setHarmText(preview.text);
    if (!preview.blocked) commit(withHarm(character, preview));
  }
  function rest(kind: "short" | "long") {
    const next: Character = {
      ...character,
      resources: character.resources.map((resource) => ({ ...resource })),
      slots: character.slots.map((slot) => ({ ...slot })),
      hitDice: { ...character.hitDice },
      focus: character.focus ? { ...character.focus } : null,
      conditionValues: { ...character.conditionValues },
      conditions: [...character.conditions],
    };
    if (character.system === "pf2e") {
      const heal = pfRestHeal(character.level, abilityMod(character, "con"));
      const preview = previewHeal("pf2e", bodyOf(character), heal, max);
      next.hpCurrent = preview.body.hpCurrent;
      next.conditions = preview.body.conditions;
      next.conditionValues = preview.body.values;
      next.death = preview.body.death;
      next.slots = next.slots.map((slot) => ({ ...slot, used: 0 }));
      next.resources = next.resources.map((resource) => ({ ...resource, current: resource.max }));
      if (next.focus) next.focus.current = next.focus.max;
      setHarmText(`Отдых Pathfinder лечит ${heal}, это уровень × максимум из 1 и Телосложения. Все хиты так не возвращаются.`);
      commit(next);
      return;
    }
    if (kind === "long") {
      next.hpCurrent = max;
      next.hpTemp = 0;
      next.death = emptyDeath();
      next.conditions = next.conditions.filter((id) => id !== "unconscious" && id !== "dead");
      next.slots = next.slots.map((slot) => ({ ...slot, used: 0 }));
      next.resources = next.resources.map((resource) => ({ ...resource, current: resource.max }));
      if (rulesOf(character).edition === "dnd-2014") {
        const regain = Math.max(1, Math.floor(next.hitDice.max / 2));
        next.hitDice.current = Math.min(next.hitDice.max, next.hitDice.current + regain);
      } else next.hitDice.current = next.hitDice.max;
      if (character.ancestryId === "human") next.hero = Math.max(1, next.hero);
      if (next.conditionValues.exhaustion) next.conditionValues.exhaustion = Math.max(0, next.conditionValues.exhaustion - 1);
      setHarmText("Долгий отдых возвращает все хиты. В правилах 2024 года возвращаются и все кости хитов.");
      commit(next);
      return;
    }
    if (next.spellcasting?.kind === "pact") next.slots = next.slots.map((slot) => ({ ...slot, used: 0 }));
    for (const id of ["wind", "rage"]) {
      const resource = next.resources.find((item) => item.id === id);
      if (resource) resource.current = Math.min(resource.max, resource.current + 1);
    }
    commit(next);
  }
  function spendHitDie() {
    if (character.hitDice.current <= 0) return;
    const roll = 1 + Math.floor(Math.random() * character.hitDice.sides);
    const heal = Math.max(1, roll + abilityMod(character, "con"));
    const preview = previewHeal("dnd5e", bodyOf(character), heal, max);
    commit({
      ...withHarm(character, preview),
      hitDice: { ...character.hitDice, current: character.hitDice.current - 1 },
    });
    setHarmText(`Кость хитов ${roll}. ${preview.text}`);
  }
  function fullRestore() {
    if (!confirmFull) {
      setConfirmFull(true);
      setHarmText("Полное восстановление сотрёт урон, временные хиты и счёт смерти. Нажмите ещё раз.");
      return;
    }
    setConfirmFull(false);
    commit({
      ...character,
      hpCurrent: max,
      hpTemp: 0,
      death: emptyDeath(),
      conditions: character.conditions.filter((id) => id !== "dying" && id !== "unconscious" && id !== "dead"),
      conditionValues: { ...character.conditionValues, dying: 0 },
    });
    setHarmText("Хиты восстановлены полностью. Это отдельное действие, не ночной отдых.");
  }
  return (
    <>
      <div className="hp-hero">
        <div className="tiny">сейчас</div>
        <strong>{character.hpCurrent}</strong>
        <div>из {max}{character.hpTemp ? ` + ${character.hpTemp} врем.` : ""}</div>
        {derived && <p className="tiny">{derived.hp.formula}</p>}
        {dnd && <p className="tiny">{dnd.hp.formula}</p>}
      </div>
      <label className="field">
        <span>На сколько</span>
        <input inputMode="numeric" data-testid="harm-amount" value={amount} onChange={(event) => setAmount(Math.max(1, Math.trunc(Number(event.target.value) || 1)))} />
      </label>
      <div className="row">
        <button type="button" className="btn" data-testid="apply-damage" onClick={() => applyHarm(previewDamage(character.system, bodyOf(character), amount, max, { crit, nonlethal }))}>Урон</button>
        <button type="button" className="btn" data-testid="apply-heal" onClick={() => applyHarm(previewHeal(character.system, bodyOf(character), amount, max))}>Лечение</button>
      </div>
      <div className="row">
        {character.system === "dnd5e" && character.classId === "barbarian" && (
          <button type="button" className={`pill ${(character.dnd ? character.dnd.toggles.includes("rage") : character.conditions.includes("rage")) ? "on" : ""}`} data-testid="toggle-rage" onClick={() => {
            if (character.dnd) {
              const on = character.dnd.toggles.includes("rage");
              const toggles = on ? character.dnd.toggles.filter((id) => id !== "rage") : [...character.dnd.toggles, "rage"];
              commit({ ...character, dnd: { ...character.dnd, toggles } });
              return;
            }
            const on = character.conditions.includes("rage");
            commit({ ...character, conditions: on ? character.conditions.filter((id) => id !== "rage") : [...character.conditions, "rage"] });
          }}>
            Ярость {(character.dnd ? character.dnd.toggles.includes("rage") : character.conditions.includes("rage")) ? "включена" : "выключена"}
          </button>
        )}
        <button type="button" className={`pill ${crit ? "on" : ""}`} onClick={() => setCrit((value) => !value)}>Критический</button>
        {character.system === "pf2e" && <button type="button" className={`pill ${nonlethal ? "on" : ""}`} onClick={() => setNonlethal((value) => !value)}>Несмертельный</button>}
        <button type="button" className="btn" data-testid="end-turn" onClick={() => applyHarm(endTurn(bodyOf(character)))}>Конец хода</button>
      </div>
      {character.undo && (
        <button type="button" className="btn" data-testid="undo-harm" onClick={() => commit({ ...character, ...character.undo, undo: null })}>Отменить последний урон или лечение</button>
      )}
      {harmText && <p className="tiny" data-testid="harm-preview">{harmText}</p>}
      {character.system === "pf2e" && dying > 0 && (
        <div className="card stack">
          <b>Умирание {dying}, ранение {character.conditionValues.wounded ?? 0}</b>
          <p className="tiny">Чистая кость к20, без навыка. СЛ {10 + dying}.</p>
          <input inputMode="numeric" data-testid="recovery-die" value={bone} onChange={(event) => setBone(event.target.value)} />
          <button type="button" className="btn" data-testid="recovery-check" onClick={() => applyHarm(recoveryCheck(bodyOf(character), Number(bone) || 1))}>Проверка восстановления</button>
        </div>
      )}
      {character.system === "dnd5e" && character.hpCurrent === 0 && !character.conditions.includes("dead") && (
        <div className="card stack">
          <b>Спасбросок от смерти</b>
          <p className="tiny">Успехи {character.death?.success ?? 0}/3 · провалы {character.death?.fail ?? 0}/3{character.death?.stable ? " · стабилен" : ""}</p>
          <input inputMode="numeric" data-testid="death-die" value={bone} onChange={(event) => setBone(event.target.value)} />
          <button type="button" className="btn" data-testid="death-save" onClick={() => applyHarm(deathSave(bodyOf(character), Number(bone) || 1, max))}>Записать кость</button>
        </div>
      )}
      <label className="field">
        <span>Временные хиты</span>
        <input inputMode="numeric" value={character.hpTemp} onChange={(event) => commit({ ...character, hpTemp: Math.max(0, Number(event.target.value) || 0) })} />
      </label>
      <p className="tiny">Урон сначала снимает временные хиты. Лечение их не трогает и не поднимает хиты выше максимума. Конец хода снижает только испуг.</p>
      {character.system === "dnd5e" && (
        <button type="button" className="btn" onClick={spendHitDie}>
          Кость хитов к{character.hitDice.sides}: {character.hitDice.current}/{character.hitDice.max}
        </button>
      )}
      <div className="grid-2">
        {character.system === "dnd5e" && <button type="button" className="btn" onClick={() => rest("short")}>Короткий отдых</button>}
        <button type="button" className="btn" onClick={() => rest("long")}>{character.system === "pf2e" ? "Ночной отдых" : "Долгий отдых"}</button>
        <button type="button" className="btn" data-testid="full-restore" onClick={fullRestore}>{confirmFull ? "Точно восстановить всё" : "Полностью восстановить"}</button>
      </div>
      {character.resources.map((resource) => (
        <div key={resource.id} className="skill">
          <div>
            <b>{resource.name}</b>
            <span className="tiny">{resource.current} / {resource.max}</span>
          </div>
          <div className="stepper">
            <button type="button" onClick={() => commit({ ...character, resources: character.resources.map((item) => item.id === resource.id ? { ...item, current: Math.max(0, item.current - 1) } : item) })}>−</button>
            <button type="button" onClick={() => commit({ ...character, resources: character.resources.map((item) => item.id === resource.id ? { ...item, current: Math.min(item.max, item.current + 1) } : item) })}>+</button>
          </div>
          <Info title={resource.name} text={resource.info} />
        </div>
      ))}
      <h2>Состояния</h2>
      {conditionList(character.system).map((condition) => {
        const on = character.conditions.includes(condition.id);
        return (
          <div key={condition.id} className="skill">
            <button type="button" className={`pill ${on ? "on" : ""}`} onClick={() => commit({ ...character, conditions: on ? character.conditions.filter((id) => id !== condition.id) : [...character.conditions, condition.id] })}>
              {condition.name}
            </button>
            {on && VALUED.has(condition.id) && (
              <input style={{ maxWidth: 72 }} inputMode="numeric" value={character.conditionValues[condition.id] ?? 1} onChange={(event) => commit({ ...character, conditionValues: { ...character.conditionValues, [condition.id]: Number(event.target.value) || 0 } })} />
            )}
            <Info title={condition.name} text={condition.info} />
          </div>
        );
      })}
    </>
  );
}

function Wallet({
  character,
  commit,
  setCoin,
}: {
  character: Character;
  commit: (next: Character) => void;
  setCoin: (key: keyof Character["coins"], value: number) => void;
}) {
  const [loot, setLoot] = useState("");
  const [note, setNote] = useState("");
  const [from, setFrom] = useState<keyof Character["coins"]>("gp");
  const [to, setTo] = useState<keyof Character["coins"]>("sp");
  const [count, setCount] = useState(1);
  const [price, setPrice] = useState(100);
  const [allowChange, setAllowChange] = useState(false);
  const names = { pp: "платиновые", gp: "золотые", ep: "электрум", sp: "серебро", cp: "медь" } as const;
  const keys = (["pp", "gp", "ep", "sp", "cp"] as const).filter((coin) => character.system === "dnd5e" || coin === "gp" || coin === "sp" || coin === "cp");
  const money = character.system === "pf2e" ? `объём монет ${pfCoinBulk(character.coins)}` : `фунты монет ${dndCoinPounds(character.coins).pounds}, ещё ${dndCoinPounds(character.coins).leftover}`;
  function rememberCoins(coins: Character["coins"], text: string) {
    setNote(text);
    commit({
      ...character,
      coins,
      undo: {
        hpCurrent: character.hpCurrent,
        hpTemp: character.hpTemp,
        conditions: [...character.conditions],
        conditionValues: { ...character.conditionValues },
        death: character.death ?? emptyDeath(),
        coins: { ...character.coins },
      },
    });
  }
  return (
    <div className="card stack" data-testid="wallet">
      <b>Кошелёк · {totalCopper(character.coins)} мм · {money}</b>
      <p className="tiny">Монеты лежат по номиналам. Добыча не разменивается сама. Сумма считается целыми медными.</p>
      {keys.map((coin) => (
        <label key={coin} className="field">
          <span>{names[coin]}</span>
          <input inputMode="numeric" value={character.coins[coin]} onChange={(event) => setCoin(coin, Math.max(0, Math.trunc(Number(event.target.value) || 0)))} />
        </label>
      ))}
      <label className="field">
        <span>Добыча, например 2 зм 5 см</span>
        <input data-testid="loot-text" value={loot} onChange={(event) => setLoot(event.target.value)} />
      </label>
      <button type="button" className="btn" data-testid="add-loot" onClick={() => {
        const parsed = parsePurse(loot);
        if ("error" in parsed) {
          setNote(parsed.error);
          return;
        }
        const coins = { ...character.coins };
        for (const key of keys) coins[key] += parsed[key];
        rememberCoins(coins, `Добавлено ${formatCoins(parsed)}. Размена не было.`);
        setLoot("");
      }}>Положить добычу</button>
      <div className="row">
        <select value={from} onChange={(event) => setFrom(event.target.value as keyof Character["coins"])}>
          {keys.map((key) => <option key={key} value={key}>{names[key]}</option>)}
        </select>
        <select value={to} onChange={(event) => setTo(event.target.value as keyof Character["coins"])}>
          {keys.map((key) => <option key={key} value={key}>{names[key]}</option>)}
        </select>
        <input inputMode="numeric" value={count} onChange={(event) => setCount(Math.max(1, Math.trunc(Number(event.target.value) || 1)))} />
      </div>
      <button type="button" className="btn" data-testid="exchange" onClick={() => {
        const result = exchange(character.coins, from, to, count);
        if (!result.ok) {
          setNote(result.error);
          return;
        }
        rememberCoins(result.coins, result.preview);
      }}>Разменять</button>
      <label className="field">
        <span>Цена в медных</span>
        <input inputMode="numeric" data-testid="price-cp" value={price} onChange={(event) => { setPrice(Math.max(0, Math.trunc(Number(event.target.value) || 0))); setAllowChange(false); }} />
      </label>
      <button type="button" className="btn" data-testid="pay" onClick={() => {
        const result = pay(character.coins, price, allowChange);
        if (!result.ok) {
          setNote(result.error);
          if (result.needExchange) setAllowChange(true);
          return;
        }
        setAllowChange(false);
        rememberCoins(result.coins, result.preview);
      }}>{allowChange ? "Оплатить со сдачей" : "Оплатить"}</button>
      {note && <p className="tiny" data-testid="wallet-note">{note}</p>}
    </div>
  );
}

function Inventory({ character, commit }: { character: Character; commit: (next: Character) => void }) {
  const derived = sheetDerived(character);
  const load = derived
    ? { current: derived.load.bulk, cap: derived.load.max, enc: derived.load.limit, unit: "объёма", text: `Объём ${derived.load.bulk}. Перегруз после ${derived.load.limit}, максимум ${derived.load.max}.` }
    : loadOf(character);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("1");
  function patchItem(uidValue: string, partial: Partial<ItemInst>) {
    commit({ ...character, items: character.items.map((item) => item.uid === uidValue ? { ...item, ...partial } : item) });
  }
  function equip(item: ItemInst) {
    const next = character.items.map((row) => {
      if (row.uid === item.uid) return { ...row, equipped: !row.equipped };
      if (item.kind === "armor" && row.kind === "armor") return { ...row, equipped: false };
      return row;
    });
    commit({ ...character, items: next });
  }
  function addCustom() {
    if (!name.trim()) return;
    const item: ItemInst = { uid: uid(), name: name.trim(), qty: 1, weight: Number(weight) || 0, equipped: false, kind: "gear", notes: "Своя запись" };
    commit({ ...character, items: [...character.items, item] });
    setName("");
  }
  function setCoin(key: keyof Character["coins"], value: number) {
    commit({ ...character, coins: { ...character.coins, [key]: Math.max(0, value) } });
  }
  return (
    <>
      <p className="tiny">{load.text}</p>
      <p><b>{load.current}</b> из {load.cap} {load.unit}{load.enc != null ? `, перегруз после ${load.enc}` : ""}</p>
      {character.items.map((item) => {
        const derivedAttack = derived?.attacks.find((row) => row.name === item.name);
        const dndAttack = sheetDnd(character)?.attacks.find((row) => row.name === item.name);
        const attack = derivedAttack
          ? { attack: derivedAttack.attack.value, damage: derivedAttack.damage, text: derivedAttack.attack.formula }
          : dndAttack
            ? { attack: dndAttack.attack.value, damage: dndAttack.damage, text: dndAttack.attack.formula }
            : attackFor(character, item);
        return (
          <div key={item.uid} className="card">
            <div className="row-between">
              <b>{item.name}</b>
              <Info title={item.name} text={item.notes || "Предмет в сумке."} />
            </div>
            {item.custom && <p className="tiny">Собственная запись{item.source ? ` · ${item.source}` : ""}{item.placement === "held" ? " · в руках" : item.placement === "worn" ? " · надето" : item.placement === "stowed" ? " · убрано" : ""}</p>}
            {item.shield && <p className="tiny">КБ +{item.shield.acBonus}, твёрдость {item.shield.hardness}, ПЗ {item.shield.hp}, порог поломки {item.shield.bt}.</p>}
            <div className="row">
              <span className="tiny">×</span>
              <div className="stepper">
                <button type="button" onClick={() => patchItem(item.uid, { qty: Math.max(1, item.qty - 1) })}>−</button>
                <span>{item.qty}</span>
                <button type="button" onClick={() => patchItem(item.uid, { qty: item.qty + 1 })}>+</button>
              </div>
              <span className="tiny">{item.weight} {character.system === "pf2e" ? "об." : "фнт"}</span>
            </div>
            {(item.kind === "armor" || item.kind === "shield" || item.kind === "weapon") && (
              <button type="button" className={`pill ${item.equipped ? "on" : ""}`} onClick={() => equip(item)}>
                {item.equipped ? "Надето" : "Надеть"}
              </button>
            )}
            {attack && <p className="tiny">Атака {fmt(attack.attack)}, урон {attack.damage}. {attack.text}</p>}
            {attack && (
              <button type="button" className="btn" onClick={() => rollTo(character, item.name, attack.attack)}>
                Бросить атаку
              </button>
            )}
            <button type="button" className="text-btn" onClick={() => commit({ ...character, items: character.items.filter((row) => row.uid !== item.uid) })}>
              Убрать
            </button>
          </div>
        );
      })}
      <Wallet character={character} commit={commit} setCoin={setCoin} />
      <div className="card stack">
        <b>Свой предмет</b>
        <input placeholder="Название" value={name} onChange={(event) => setName(event.target.value)} />
        <input inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} />
        <button type="button" className="btn" onClick={addCustom}>Положить</button>
      </div>
      {character.system === "pf2e" && (
        <button type="button" className={`pill ${character.shieldRaised ? "on" : ""}`} onClick={() => commit({ ...character, shieldRaised: !character.shieldRaised })}>
          Щит {character.shieldRaised ? "поднят" : "опущен"}
        </button>
      )}
    </>
  );
}

function Experience({ character, commit }: { character: Character; commit: (next: Character) => void }) {
  const need = xpToNext(character);
  const [mode, setMode] = useState<"average" | "roll">("average");
  const [boosts, setBoosts] = useState<Ability[]>([]);
  const [asiMode, setAsiMode] = useState<"two" | "pair" | "feat">("two");
  const [asiA, setAsiA] = useState<Ability>("str");
  const [asiB, setAsiB] = useState<Ability>("dex");
  const [featId, setFeatId] = useState("asi");
  const nextLevel = character.level + 1;
  const wantsBoosts = character.system === "pf2e" && [5, 10, 15, 20].includes(nextLevel);
  function level() {
    if (!canLevel(character)) return;
    if (wantsBoosts && boosts.length !== 4) return;
    const roll = mode === "average" ? "average" : 1 + Math.floor(Math.random() * character.hitDie);
    let next = applyLevelUp(character, roll, boosts);
    if (next.system === "dnd5e" && next.level === 3) {
      const cls = CL5.find((item) => item.id === next.classId);
      if (cls && !next.features.some((feature) => feature.name === cls.subclass.name)) {
        next = { ...next, subclassName: cls.subclass.name, features: [...next.features, { name: cls.subclass.name, info: cls.subclass.info }] };
      }
      if (next.dnd && !next.dnd.subclassId && next.subclassName) {
        const id = subclassIdOf(next.subclassName);
        if (id && id !== "other") next = { ...next, dnd: { ...next.dnd, subclassId: id } };
      }
    }
    if (next.system === "dnd5e" && [4, 8, 12, 16, 19].includes(next.level)) next = { ...next, pendingAsi: true };
    commit(next);
    setBoosts([]);
  }
  function applyAsi() {
    const abilities = { ...character.abilities };
    const cap = (ability: Ability, delta: number) => {
      abilities[ability] = Math.min(20, abilities[ability] + delta);
    };
    const feats = [...character.feats];
    if (asiMode === "two") cap(asiA, 2);
    if (asiMode === "pair") {
      cap(asiA, 1);
      cap(asiB, 1);
    }
    if (asiMode === "feat") {
      const feat = GENERAL_FEATS.find((item) => item.id === featId);
      if (feat) feats.push({ id: `${feat.id}-${character.level}`, name: feat.name, info: feat.info });
    }
    const next = { ...character, abilities, feats, pendingAsi: false };
    const max = hpMax(next);
    if (next.hpCurrent > max) next.hpCurrent = max;
    commit(next);
  }
  return (
    <>
      <label className="field">
        <span>Опыт</span>
        <input inputMode="numeric" value={character.xp} onChange={(event) => commit({ ...character, xp: Math.max(0, Number(event.target.value) || 0) })} />
      </label>
      <p>{need == null ? "Дальше 20-го уровня лист не ведёт." : `До следующего уровня: ${need}. Сейчас ${character.level}.`}</p>
      <Info title="Опыт" text={character.system === "pf2e" ? "В Pathfinder уровень стоит 1000 опыта. Когда набираете их, уровень растёт, а 1000 списываются. На 5, 10, 15 и 20-м уровне четыре повышения. До +4 это +1 к модификатору. На +4 первое повышение частичное: броски и хиты не меняются, пока следующее отдельное повышение той же характеристики не закроет его." : "Пороги опыта берутся из открытой таблицы. На новом уровне прибавляются хиты: среднее кости или ваш бросок, плюс Телосложение, минимум 1. На 4, 8, 12, 16 и 19-м — черта или прибавка характеристик. Подкласс открытого справочника записывается на 3-м уровне."} />
      {character.system === "dnd5e" && (
        <div className="seg">
          <button type="button" className={`pill ${mode === "average" ? "on" : ""}`} onClick={() => setMode("average")}>Средние хиты</button>
          <button type="button" className={`pill ${mode === "roll" ? "on" : ""}`} onClick={() => setMode("roll")}>Бросок кости</button>
        </div>
      )}
      {wantsBoosts && !character.progress && (
        <div className="wrap">
          {ABILITIES.map((ability) => (
            <button key={ability} type="button" className={`pill ${boosts.includes(ability) ? "on" : ""}`} onClick={() => setBoosts((prev) => prev.includes(ability) ? prev.filter((item) => item !== ability) : prev.length >= 4 ? prev : [...prev, ability])}>
              {ABILITY_SHORT[ability]}
            </button>
          ))}
        </div>
      )}
      {character.progress ? (
        <p className="tiny">Уровень и выборы ремастера открываются в разделе «Развитие». Эта кнопка не прибавляет характеристики вторым способом.</p>
      ) : (
      <button type="button" className="btn primary" disabled={!canLevel(character) || (wantsBoosts && boosts.length !== 4)} onClick={level}>
        Получить уровень
      </button>
      )}
      {character.pendingAsi && (
        <div className="card stack">
          <b>Прибавка или черта</b>
          <div className="seg">
            <button type="button" className={`pill ${asiMode === "two" ? "on" : ""}`} onClick={() => setAsiMode("two")}>+2</button>
            <button type="button" className={`pill ${asiMode === "pair" ? "on" : ""}`} onClick={() => setAsiMode("pair")}>+1 и +1</button>
            <button type="button" className={`pill ${asiMode === "feat" ? "on" : ""}`} onClick={() => setAsiMode("feat")}>Черта</button>
          </div>
          {asiMode !== "feat" && (
            <div className="wrap">
              {ABILITIES.map((ability) => (
                <button key={ability} type="button" className={`pill ${asiA === ability ? "on" : ""}`} onClick={() => setAsiA(ability)}>{ABILITY_SHORT[ability]}</button>
              ))}
            </div>
          )}
          {asiMode === "pair" && (
            <div className="wrap">
              {ABILITIES.filter((ability) => ability !== asiA).map((ability) => (
                <button key={ability} type="button" className={`pill ${asiB === ability ? "on" : ""}`} onClick={() => setAsiB(ability)}>{ABILITY_SHORT[ability]}</button>
              ))}
            </div>
          )}
          {asiMode === "feat" && GENERAL_FEATS.map((feat) => (
            <button key={feat.id} type="button" className={`pill ${featId === feat.id ? "on" : ""}`} onClick={() => setFeatId(feat.id)}>{feat.name}</button>
          ))}
          <button type="button" className="btn primary" onClick={applyAsi}>Записать</button>
        </div>
      )}
    </>
  );
}

function Hero({ character, commit }: { character: Character; commit: (next: Character) => void }) {
  const cap = character.system === "pf2e" ? 3 : 5;
  const title = character.system === "pf2e" ? "Очки героизма" : "Героическое вдохновение";
  const info = character.system === "pf2e"
    ? "Обычно в начале сессии у вас 1 очко, максимум 3. Потратить можно, чтобы перебросить проверку, или отдать союзнику. Мастер выдаёт очко за подвиг и за отыгрыш изъяна. После траты бросьте снова и возьмите второй результат."
    : "Вдохновение позволяет перебросить любой бросок к20, который вы делаете, и взять второй результат. Человек получает его после каждого долгого отдыха. Мастер может выдать ещё за смелую игру. Обычно держат одно.";
  return (
    <div className="card stack">
      <div className="row-between">
        <h2>{title}</h2>
        <Info title={title} text={info} />
      </div>
      <div className="hp-hero"><strong>{character.hero}</strong></div>
      <div className="hp-actions">
        <button type="button" onClick={() => commit({ ...character, hero: Math.min(cap, character.hero + 1) })}>+</button>
        <button type="button" className="ghost" onClick={() => commit({ ...character, hero: Math.max(0, character.hero - 1) })}>−</button>
      </div>
      {character.system === "pf2e" && (
        <button type="button" className="btn" onClick={() => commit({ ...character, hero: 1 })}>
          Начало сессии: поставить 1
        </button>
      )}
    </div>
  );
}

function Spells({ character, commit }: { character: Character; commit: (next: Character) => void }) {
  const numbers = spellNumbers(character);
  const dc = classDc(character);
  if (!character.spellcasting && character.spells.length === 0) {
    return <p>У этого персонажа нет заклинаний. Черты и классовые умения лежат в заметках.</p>;
  }
  function useSlot(index: number, delta: number) {
    const slots = character.slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, used: Math.max(0, Math.min(slot.max, slot.used + delta)) } : slot);
    commit({ ...character, slots });
  }
  return (
    <>
      {numbers && (
        <div className="quick">
          <Stat label="Атака" value={fmt(numbers.attack)} info={numbers.text} />
          <Stat label="СЛ" value={String(numbers.dc)} info={`Сложность заклинаний: ${numbers.text}.`} />
          {dc != null && <Stat label="СЛ класса" value={String(dc)} info="10 + ключевая характеристика + владение классом. Ею закрывают умения вроде деморализации воина, если стол так ведёт." />}
        </div>
      )}
      {character.spellcasting && (
        <p className="tiny">
          {character.spellcasting.kind === "prepared" ? "Подготовленный" : character.spellcasting.kind === "book" ? "Книга" : character.spellcasting.kind === "pact" ? "Пакт" : "Спонтанный"} заклинатель, {ABILITY_NAME[character.spellcasting.ability]}.
        </p>
      )}
      {character.slots.map((slot, index) => (
        <div key={`${slot.rank}-${slot.note ?? index}`} className="skill">
          <div>
            <b>{slot.rank} круг{slot.note ? ` · ${slot.note}` : ""}</b>
            <span className="tiny">потрачено {slot.used} из {slot.max}</span>
          </div>
          <div className="stepper">
            <button type="button" onClick={() => useSlot(index, -1)}>−</button>
            <button type="button" onClick={() => useSlot(index, 1)}>+</button>
          </div>
          <Info title={`Ячейки ${slot.rank} круга`} text="Ячейка тратится, когда вы творите заклинание этого круга. Отдых возвращает их. Заговор ячейку не тратит." />
        </div>
      ))}
      {character.focus && (
        <div className="skill">
          <b>Фокус {character.focus.current}/{character.focus.max}</b>
          <div className="stepper">
            <button type="button" onClick={() => commit({ ...character, focus: { ...character.focus!, current: Math.max(0, character.focus!.current - 1) } })}>−</button>
            <button type="button" onClick={() => commit({ ...character, focus: { ...character.focus!, current: Math.min(character.focus!.max, character.focus!.current + 1) } })}>+</button>
          </div>
          <Info title="Очки фокуса" text="Фокус-заклинание тратит очко, а не ячейку. Десять минут на подготовке или на природе возвращают одно." />
        </div>
      )}
      <button type="button" className="btn" onClick={() => commit(refreshSlots(character))}>Пересчитать ячейки по уровню</button>
      {character.spells.map((spell) => {
        const prepared = character.preparedIds.includes(spell.id) || character.bonusSpellIds.includes(spell.id);
        return (
          <div key={spell.id} className="spell-row">
            <div>
              <b>{spell.name}</b>
              <span className="tiny">{spell.level === 0 ? "заговор" : `${spell.level} круг`} · {spell.school} {prepared ? "· подготовлено" : ""}</span>
            </div>
            <Info title={spell.name} text={`${spell.time}, ${spell.range}, ${spell.duration}. ${spell.info}`} />
            {spell.level > 0 && character.spellcasting && (character.spellcasting.kind === "prepared" || character.spellcasting.kind === "book") && (
              <button type="button" className={`pill ${prepared ? "on" : ""}`} onClick={() => {
                const ids = character.preparedIds.includes(spell.id) ? character.preparedIds.filter((id) => id !== spell.id) : [...character.preparedIds, spell.id];
                commit({ ...character, preparedIds: ids });
              }}>
                Готово
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

function Notes({ character, commit }: { character: Character; commit: (next: Character) => void }) {
  return (
    <>
      <p className="tiny">{character.ancestryName}. {character.size}, {character.senses}. Языки: {character.languages}</p>
      <Info title={character.ancestryName} text={character.ancestryInfo} />
      <Info title={character.backgroundName} text={character.backgroundInfo} />
      <Info title={character.className} text={character.classInfo} />
      <h2>Умения</h2>
      {character.features.map((feature) => (
        <div key={feature.name} className="row-between">
          <b>{feature.name}</b>
          <Info title={feature.name} text={feature.info} />
        </div>
      ))}
      <h2>Черты</h2>
      {character.feats.map((feat) => (
        <div key={feat.id} className="row-between">
          <b>{feat.name}</b>
          <Info title={feat.name} text={feat.info} />
        </div>
      ))}
      <label className="field">
        <span>Заметки</span>
        <textarea value={character.notes} onChange={(event) => commit({ ...character, notes: event.target.value })} />
      </label>
      <p className="tiny">Навык без карточки в списке можно помнить здесь. Открытые списки не покрывают все инструменты и имена богов.</p>
      {SK5.length > 0 && character.system === "dnd5e" && <p className="tiny">Пассивная внимательность: {10 + (skillRows(character).find((skill) => skill.id === "perception")?.mod ?? 0)}.</p>}
    </>
  );
}
