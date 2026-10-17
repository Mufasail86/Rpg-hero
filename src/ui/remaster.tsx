import { useState } from "react";
import { attackPreview, battleMedicine, doctorsVisit, emptyCombat, handsLine, knockdown, mapPenalty, newRound, openHelp, parry, reactiveStrike, strike, strikeCount } from "../pf2e/combat";
import { choiceCaption, derive, effectsFrom, optionsForSlot, slotsForProgress, snapshot } from "../pf2e/build";
import { SKILLS } from "../data/pf2e";
import { rulesCatalog } from "../data/catalog";
import type { Character, CombatState, ItemInst, Placement, StructuredEffect } from "../types";
import { fmt, uid } from "../types";
import { refreshSlots } from "../rules";
import { useCompact } from "./common";
import { PickList } from "./feat-picker";

function detailFor(pick: string): Record<string, string> | undefined {
  if (pick === "canny-acumen") return { defense: "will" };
  if (pick === "assurance") return { skill: "athletics" };
  if (pick === "skill-mastery") return { toMaster: "acrobatics", toExpert: "thievery", feat: "pickpocket" };
  if (pick === "rogue-dedication") return { primary: "society", extra: "survival", feat: "dubious" };
  return undefined;
}

export function sheetDerived(character: Character, level = character.level) {
  if (character.system !== "pf2e" || !character.progress) return null;
  return derive({
    progress: character.progress,
    items: character.items,
    conditions: character.conditionValues,
    level,
    toggles: character.progress.toggles,
    shieldRaised: character.shieldRaised,
    customEffects: effectsFrom(character),
  });
}

export function WarningBanner({ character }: { character: Character }) {
  const derived = sheetDerived(character);
  if (!derived) return null;
  const build = derived.issues.filter((issue) => issue.kind === "build");
  const limits = derived.issues.filter((issue) => issue.kind === "limit");
  return (
    <>
      {build.length > 0 && (
        <div className="warn">
          <b>Ошибка сборки.</b> {build.map((issue) => issue.message).join(" ")}
        </div>
      )}
      {limits.length > 0 && (
        <div className="warn">
          Лист настроен частично. Следующие показатели требуют ручной проверки: {limits.map((issue) => issue.message).join(" ")}
        </div>
      )}
    </>
  );
}

export function AdvancePanel({ character, onChange }: { character: Character; onChange: (next: Character) => void }) {
  const progress = character.progress;
  const [view, setView] = useState(character.level);
  const [entry, setEntry] = useState(blankEntry());
  if (!progress) return <p>Этот лист ещё на старом расчёте. Контрольный воин на главной уже ведётся ремастером.</p>;
  const live = sheetDerived(character);
  const preview = sheetDerived(character, view);
  if (!live || !preview) return null;
  const slots = slotsForProgress(progress, character.level);
  const open = slots.filter((slot) => !progress.choices.some((choice) => choice.id === slot.id));

  function commit(next: Character) {
    onChange(snapshot(next));
  }

  function remove(id: string) {
    commit({ ...character, progress: { ...progress!, choices: progress!.choices.filter((choice) => choice.id !== id) } });
  }

  function fill(slot: (typeof slots)[number], pick: string) {
    const detail = detailFor(pick);
    commit({
      ...character,
      progress: { ...progress!, choices: [...progress!.choices, { id: slot.id, level: slot.level, source: slot.source, pick, ...(detail ? { detail } : {}) }] },
    });
  }

  function setDetail(id: string, key: string, value: string) {
    commit({
      ...character,
      progress: {
        ...progress!,
        choices: progress!.choices.map((choice) => choice.id === id ? { ...choice, detail: { ...choice.detail, [key]: value } } : choice),
      },
    });
  }

  function toggle(id: string) {
    const toggles = progress!.toggles.includes(id) ? progress!.toggles.filter((item) => item !== id) : [...progress!.toggles, id];
    onChange({ ...character, progress: { ...progress!, toggles } });
  }

  function levelUp() {
    if (character.xp < 1000 || character.level >= 20) return;
    commit(refreshSlots({ ...character, level: character.level + 1, xp: character.xp - 1000 }));
  }

  function addEntry() {
    const name = entry.name.trim();
    if (!name) return;
    const price = Number(entry.price) || 0;
    const unit = entry.currency === "gp" ? 100 : entry.currency === "sp" ? 10 : 1;
    const placement = entry.placement;
    const equipped = placement !== "stowed";
    if (entry.category === "feat" || entry.category === "feature") {
      const effect: StructuredEffect | null = entry.implemented
        ? { label: name, target: entry.target, type: entry.bonusType, value: Number(entry.amount) || 0, implemented: true }
        : null;
      if (entry.category === "feat") {
        commit({
          ...character,
          feats: [...character.feats, { id: uid(), name, info: entry.description, custom: true, source: entry.source, effects: effect ? [effect] : [] }],
        });
      } else {
        commit({
          ...character,
          features: [...character.features, { name, info: entry.description, custom: true, source: entry.source, effects: effect ? [effect] : [] }],
        });
      }
      setEntry(blankEntry());
      return;
    }
    const kind = entry.category === "other" ? "gear" : entry.category;
    const item: ItemInst = {
      uid: uid(),
      name,
      qty: Math.max(1, Number(entry.qty) || 1),
      weight: Number(entry.bulk) || 0,
      equipped: kind === "armor" || kind === "weapon" || kind === "shield" ? equipped : placement === "worn",
      kind,
      notes: entry.description,
      custom: true,
      priceCp: Math.round(price * unit),
      placement,
      source: entry.source,
    };
    if (kind === "weapon") {
      item.weapon = {
        damage: entry.damage || "1d6",
        attr: entry.attr,
        category: entry.proficiency,
        group: entry.group,
        hands: entry.hands,
        traits: entry.traits,
        range: Number(entry.range) || undefined,
        reach: Number(entry.reach) || undefined,
        ranged: entry.attr === "dex",
        twoHanded: entry.hands === 2,
      };
      item.runes = { potency: Number(entry.potency) || 0, striking: Number(entry.striking) || 0 };
    }
    if (kind === "armor") {
      item.armor = {
        bonus: Number(entry.acBonus) || 0,
        dexCap: entry.dexCap === "" ? null : Number(entry.dexCap),
        category: entry.armorCategory,
        strReq: Number(entry.strReq) || 0,
        checkPenalty: Number(entry.checkPenalty) || 0,
        speedPenalty: Number(entry.speedPenalty) || 0,
      };
      item.runes = { potency: Number(entry.potency) || 0, resilient: Number(entry.resilient) || 0 };
    }
    if (kind === "shield") {
      item.shield = {
        acBonus: Number(entry.acBonus) || 0,
        hardness: Number(entry.hardness) || 0,
        hp: Number(entry.shieldHp) || 0,
        bt: Number(entry.bt) || 0,
      };
    }
    const items = kind === "armor" && item.equipped
      ? character.items.map((row) => row.kind === "armor" ? { ...row, equipped: false } : row)
      : character.items;
    commit({ ...character, items: [...items, item] });
    setEntry(blankEntry());
  }

  return (
    <div className="stack">
      <p className="lead">Уровень {character.level}, опыт {character.xp} / 1000. Просмотр другого уровня не стирает план и не меняет текущий лист.</p>
      <label className="field">
        <span>Посмотреть уровень</span>
        <input type="number" min={1} max={character.level} value={view} onChange={(event) => setView(Math.max(1, Math.min(character.level, Number(event.target.value) || 1)))} />
      </label>
      {view !== character.level && preview && (
        <div className="card stack">
          <b>Просмотр {view} уровня</b>
          <p>ПЗ {preview.hp.value}. КБ {preview.ac.value}. Скорость {preview.speed.value}. Атлетика {fmt(preview.skills.athletics?.value ?? 0)}.</p>
          <p className="tiny">Текущий лист остаётся {character.level} уровня. Опыт не списан.</p>
        </div>
      )}
      <button type="button" className="btn primary" disabled={character.xp < 1000 || character.level >= 20} onClick={levelUp}>
        Получить уровень
      </button>
      <h2>Условные эффекты</h2>
      <button type="button" className={`pill ${progress.toggles.includes("dueling-parry") ? "on" : ""}`} onClick={() => toggle("dueling-parry")}>
        Дуэльное парирование {progress.toggles.includes("dueling-parry") ? "включено" : "выключено"}
      </button>
      {progress.classId === "barbarian" && (
        <button type="button" className={`pill ${progress.toggles.includes("rage") ? "on" : ""}`} data-testid="toggle-rage" onClick={() => toggle("rage")}>
          Ярость {progress.toggles.includes("rage") ? "включена" : "выключена"}
        </button>
      )}
      {progress.classId === "monk" && (
        <button type="button" className={`pill ${progress.toggles.includes("qi") ? "on" : ""}`} data-testid="toggle-qi" onClick={() => toggle("qi")}>
          Заклинания ци {progress.toggles.includes("qi") ? "есть" : "нет"}
        </button>
      )}
      {progress.classId === "ranger" && (
        <button type="button" className={`pill ${progress.toggles.includes("warden") ? "on" : ""}`} data-testid="toggle-warden" onClick={() => toggle("warden")}>
          Заклинания смотрителя {progress.toggles.includes("warden") ? "есть" : "нет"}
        </button>
      )}
      {progress.classId === "oracle" && (
        <div className="card stack">
          <b>Ступень проклятия</b>
          <p className="tiny">Предел сейчас {Math.min(4, character.level >= 17 ? 4 : character.level >= 11 ? 3 : 2)}. Числа берутся из текста выбранной тайны.</p>
          <div className="stepper">
            <button type="button" data-testid="curse-down" onClick={() => onChange({ ...character, progress: { ...progress, cursebound: Math.max(0, (progress.cursebound ?? 0) - 1) } })}>−</button>
            <span data-testid="curse-value">{progress.cursebound ?? 0}</span>
            <button type="button" data-testid="curse-up" onClick={() => {
              const cap = character.level >= 17 ? 4 : character.level >= 11 ? 3 : 2;
              onChange({ ...character, progress: { ...progress, cursebound: Math.min(cap, (progress.cursebound ?? 0) + 1) } });
            }}>+</button>
          </div>
        </div>
      )}
      <p className="tiny">{live.ac.formula}</p>
      {live.ac.aside.map((line) => <p key={line} className="tiny">{line}</p>)}
      <h2>Открытые выборы</h2>
      {open.length === 0 && <p className="tiny">Все положенные слоты до {character.level} уровня закрыты.</p>}
      {open.map((slot) => {
        const options = optionsForSlot(slot.source, { classId: progress.classId, ancestryId: progress.ancestryId, level: slot.level });
        const featLike = slot.source.endsWith("-feat") || slot.source === "free-archetype";
        if (featLike) {
          return (
            <PickList
              key={slot.id}
              title={`${slot.label}, уровень ${slot.level}`}
              testId={`slot-${slot.id}`}
              rows={options.map((option) => ({ id: option.pick, name: option.name, info: `${slot.label}. Уровень ${slot.level}.` }))}
              selected=""
              onPick={(row) => fill(slot, row.id)}
            />
          );
        }
        return (
          <label key={slot.id} className="field">
            <span>{slot.label}, уровень {slot.level}</span>
            <select data-testid={`slot-${slot.id}`} value="" onChange={(event) => { if (event.target.value) fill(slot, event.target.value); }}>
              <option value="">Выбрать</option>
              {options.map((option) => <option key={option.pick} value={option.pick}>{option.name}</option>)}
            </select>
          </label>
        );
      })}
      <h2>Сделанные выборы</h2>
      <p className="tiny">Убрать ранний выбор и взять другой заново проверяет всё, что от него зависит. Просмотр уровня выше этого не делает.</p>
      {progress.choices.slice().sort((a, b) => a.level - b.level || a.source.localeCompare(b.source)).map((choice) => (
        <div key={choice.id} className="card stack">
          <div className="row-between">
            <span>{choice.level}. {choiceCaption(choice)}</span>
            <button type="button" className="text-btn" onClick={() => remove(choice.id)}>Убрать</button>
          </div>
          {choice.pick === "canny-acumen" && (
            <label className="field">
              <span>Что поднимает дальновидность</span>
              <select value={choice.detail?.defense ?? "will"} onChange={(event) => setDetail(choice.id, "defense", event.target.value)}>
                <option value="fort">Стойкость</option>
                <option value="ref">Рефлексы</option>
                <option value="will">Воля</option>
                <option value="perception">Восприятие</option>
              </select>
            </label>
          )}
          {choice.pick === "skill-mastery" && (
            <>
              <label className="field">
                <span>С эксперта до мастера</span>
                <select value={choice.detail?.toMaster ?? ""} onChange={(event) => setDetail(choice.id, "toMaster", event.target.value)}>
                  {SKILLS.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>С обученного до эксперта</span>
                <select value={choice.detail?.toExpert ?? ""} onChange={(event) => setDetail(choice.id, "toExpert", event.target.value)}>
                  {SKILLS.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                </select>
              </label>
            </>
          )}
        </div>
      ))}
      {progress.classId === "fighter" && character.level >= 9 && (
        <label className="field">
          <span>Боевая гибкость на сегодня</span>
          <select value={progress.dailyFeats[0] ?? ""} onChange={(event) => onChange({ ...character, progress: { ...progress, dailyFeats: event.target.value ? [event.target.value] : [] } })}>
            <option value="">Не выбрана</option>
            {optionsForSlot("class-feat", { classId: progress.classId, level: character.level }).map((option) => <option key={option.pick} value={option.pick}>{option.name}</option>)}
          </select>
        </label>
      )}
      <CustomEntry entry={entry} setEntry={setEntry} onAdd={addEntry} />
      <CombatTracker character={character} onChange={onChange} />
      <h2>Действия</h2>
      {live.actions.map((action) => (
        <article key={action.id} className="card stack">
          <b>{action.name}</b>
          <p>{action.cost}. {action.traits}</p>
          <p className="tiny">{action.effect}</p>
        </article>
      ))}
    </div>
  );
}

function blankEntry() {
  return {
    category: "armor" as "weapon" | "armor" | "shield" | "tool" | "other" | "feat" | "feature",
    name: "Свой доспех",
    description: "",
    qty: "1",
    price: "4",
    currency: "gp" as "gp" | "sp" | "cp",
    bulk: "2",
    placement: "worn" as Placement,
    source: "своя запись",
    proficiency: "martial" as "simple" | "martial" | "unarmed" | "advanced",
    group: "sword",
    damage: "1d8",
    attr: "str" as "str" | "dex" | "finesse",
    hands: 1 as 1 | 2,
    traits: "",
    range: "",
    reach: "5",
    potency: "0",
    striking: "0",
    resilient: "0",
    acBonus: "3",
    dexCap: "2",
    armorCategory: "medium" as "light" | "medium" | "heavy",
    strReq: "14",
    checkPenalty: "2",
    speedPenalty: "5",
    hardness: "5",
    shieldHp: "20",
    bt: "10",
    implemented: false,
    target: "ac" as StructuredEffect["target"],
    bonusType: "untyped" as StructuredEffect["type"],
    amount: "1",
  };
}

function CustomEntry({ entry, setEntry, onAdd }: { entry: ReturnType<typeof blankEntry>; setEntry: (next: ReturnType<typeof blankEntry>) => void; onAdd: () => void }) {
  const set = (partial: Partial<ReturnType<typeof blankEntry>>) => setEntry({ ...entry, ...partial });
  const item = entry.category !== "feat" && entry.category !== "feature";
  return (
    <div className="card stack">
      <b>Своя запись</b>
      <p className="tiny">Все поля подписаны. Запись помечается как собственная. Текст описания в расчёт не разбирается.</p>
      <label className="field">
        <span>Категория</span>
        <select value={entry.category} onChange={(event) => set({ category: event.target.value as ReturnType<typeof blankEntry>["category"] })}>
          <option value="weapon">Оружие</option>
          <option value="armor">Доспех</option>
          <option value="shield">Щит</option>
          <option value="tool">Инструмент</option>
          <option value="other">Прочее</option>
          <option value="feat">Черта</option>
          <option value="feature">Особенность</option>
        </select>
      </label>
      <Field label="Название" value={entry.name} onChange={(name) => set({ name })} />
      <Field label="Описание" value={entry.description} onChange={(description) => set({ description })} />
      {item && (
        <>
          <Field label="Количество" value={entry.qty} onChange={(qty) => set({ qty })} />
          <Field label="Цена" value={entry.price} onChange={(price) => set({ price })} />
          <label className="field">
            <span>Валюта</span>
            <select value={entry.currency} onChange={(event) => set({ currency: event.target.value as "gp" | "sp" | "cp" })}>
              <option value="gp">Золотые</option>
              <option value="sp">Серебро</option>
              <option value="cp">Медь</option>
            </select>
          </label>
          <Field label="Объём" value={entry.bulk} onChange={(bulk) => set({ bulk })} />
          <label className="field">
            <span>Положение</span>
            <select value={entry.placement} onChange={(event) => set({ placement: event.target.value as Placement })}>
              <option value="worn">Надето</option>
              <option value="held">В руках</option>
              <option value="stowed">Убрано</option>
            </select>
          </label>
        </>
      )}
      <Field label="Источник" value={entry.source} onChange={(source) => set({ source })} />
      {entry.category === "weapon" && (
        <>
          <label className="field">
            <span>Владение</span>
            <select value={entry.proficiency} onChange={(event) => set({ proficiency: event.target.value as ReturnType<typeof blankEntry>["proficiency"] })}>
              <option value="simple">Простое</option>
              <option value="martial">Воинское</option>
              <option value="unarmed">Безоружное</option>
              <option value="advanced">Продвинутое</option>
            </select>
          </label>
          <Field label="Группа" value={entry.group} onChange={(group) => set({ group })} />
          <Field label="Урон" value={entry.damage} onChange={(damage) => set({ damage })} />
          <label className="field">
            <span>Характеристика урона</span>
            <select value={entry.attr} onChange={(event) => set({ attr: event.target.value as "str" | "dex" | "finesse" })}>
              <option value="str">Сила</option>
              <option value="dex">Ловкость</option>
              <option value="finesse">Фехтовальное</option>
            </select>
          </label>
          <label className="field">
            <span>Руки</span>
            <select value={String(entry.hands)} onChange={(event) => set({ hands: Number(event.target.value) === 2 ? 2 : 1 })}>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
          <Field label="Свойства" value={entry.traits} onChange={(traits) => set({ traits })} />
          <Field label="Дистанция" value={entry.range} onChange={(range) => set({ range })} />
          <Field label="Досягаемость" value={entry.reach} onChange={(reach) => set({ reach })} />
          <Field label="Руна мощи" value={entry.potency} onChange={(potency) => set({ potency })} />
          <Field label="Руна ударов" value={entry.striking} onChange={(striking) => set({ striking })} />
        </>
      )}
      {entry.category === "armor" && (
        <>
          <label className="field">
            <span>Категория доспеха</span>
            <select value={entry.armorCategory} onChange={(event) => set({ armorCategory: event.target.value as "light" | "medium" | "heavy" })}>
              <option value="light">Лёгкий</option>
              <option value="medium">Средний</option>
              <option value="heavy">Тяжёлый</option>
            </select>
          </label>
          <Field label="Бонус КБ" value={entry.acBonus} onChange={(acBonus) => set({ acBonus })} />
          <Field label="Предел Ловкости" value={entry.dexCap} onChange={(dexCap) => set({ dexCap })} />
          <Field label="Порог Силы" value={entry.strReq} onChange={(strReq) => set({ strReq })} />
          <Field label="Штраф проверки" value={entry.checkPenalty} onChange={(checkPenalty) => set({ checkPenalty })} />
          <Field label="Штраф скорости" value={entry.speedPenalty} onChange={(speedPenalty) => set({ speedPenalty })} />
          <Field label="Руна мощи" value={entry.potency} onChange={(potency) => set({ potency })} />
          <Field label="Руна устойчивости" value={entry.resilient} onChange={(resilient) => set({ resilient })} />
        </>
      )}
      {entry.category === "shield" && (
        <>
          <Field label="Бонус КБ" value={entry.acBonus} onChange={(acBonus) => set({ acBonus })} />
          <Field label="Твёрдость" value={entry.hardness} onChange={(hardness) => set({ hardness })} />
          <Field label="ПЗ щита" value={entry.shieldHp} onChange={(shieldHp) => set({ shieldHp })} />
          <Field label="Порог поломки" value={entry.bt} onChange={(bt) => set({ bt })} />
        </>
      )}
      {(entry.category === "feat" || entry.category === "feature") && (
        <>
          <label className="field">
            <span>Эффект входит в расчёт</span>
            <select value={entry.implemented ? "yes" : "no"} onChange={(event) => set({ implemented: event.target.value === "yes" })}>
              <option value="no">Нет, только описание</option>
              <option value="yes">Да, структурированный бонус</option>
            </select>
          </label>
          {entry.implemented && (
            <>
              <label className="field">
                <span>Показатель</span>
                <select value={entry.target} onChange={(event) => set({ target: event.target.value as StructuredEffect["target"] })}>
                  <option value="ac">КБ</option>
                  <option value="speed">Скорость</option>
                  <option value="hp">ПЗ</option>
                </select>
              </label>
              <label className="field">
                <span>Тип бонуса</span>
                <select value={entry.bonusType} onChange={(event) => set({ bonusType: event.target.value as StructuredEffect["type"] })}>
                  <option value="untyped">Без типа</option>
                  <option value="item">Предмет</option>
                  <option value="status">Статус</option>
                  <option value="circumstance">Обстоятельство</option>
                </select>
              </label>
              <Field label="Величина" value={entry.amount} onChange={(amount) => set({ amount })} />
            </>
          )}
        </>
      )}
      <button type="button" className="btn" data-testid="add-custom-entry" onClick={onAdd}>Добавить свою запись</button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function CombatTracker({ character, onChange }: { character: Character; onChange: (next: Character) => void }) {
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [compact, toggleCompact] = useCompact();
  const combat: CombatState = { ...emptyCombat(), ...character.combat, immunity: character.combat?.immunity ?? [] };
  const derived = sheetDerived(character);
  const sword = derived?.attacks.find((attack) => attack.equipped) ?? derived?.attacks[0];
  function apply(step: { state: CombatState; note: string; spent: boolean }, progress = character.progress) {
    setNote(step.note);
    if (!step.spent && step.state === combat) return;
    onChange({ ...character, combat: step.state, progress });
  }
  function withToggle(on: boolean) {
    if (!character.progress) return character.progress;
    const toggles = on
      ? [...new Set([...character.progress.toggles, "dueling-parry"])]
      : character.progress.toggles.filter((item) => item !== "dueling-parry");
    return { ...character.progress, toggles };
  }
  return (
    <div className={`card stack combat-board ${compact ? "compact" : ""}`} data-testid="combat-screen">
      <div className="row-between">
        <b>Боевой экран</b>
        <button type="button" className={`pill ${compact ? "on" : ""}`} aria-pressed={compact} onClick={toggleCompact}>
          {compact ? "Компактно" : "Обычный вид"}
        </button>
      </div>
      <p data-testid="map-line">Действия {combat.actions}/3 · реакция {combat.reaction ? "есть" : "нет"} · атак в ход {strikeCount(combat)} · обычный штраф {combat.map} · быстрый {mapPenalty(strikeCount(combat), true)} · усилие {combat.flourish ? "потрачено" : "свободно"}</p>
      <p className="tiny">{handsLine(character.items)}</p>
      {sword && <p className="combat-figure" data-testid="attack-preview">{attackPreview(sword.attack.value, combat.map)}</p>}
      <div className="row">
        <button type="button" className="btn" data-testid="combat-strike" onClick={() => apply(strike(combat))}>Удар</button>
        <button type="button" className="btn" data-testid="combat-agile" onClick={() => apply(strike(combat, { agile: true }))}>Быстрый удар</button>
        <button type="button" className="btn" data-testid="combat-reactive" disabled={!combat.reaction} onClick={() => apply(reactiveStrike(combat))}>Внеочередная атака</button>
      </div>
      <div className="row">
        <button type="button" className="btn" data-testid="combat-knockdown" onClick={() => apply(knockdown(combat))}>Нокдаун</button>
        <button type="button" className="btn" data-testid="combat-parry" onClick={() => {
          const step = parry(combat);
          apply(step, step.spent ? withToggle(true) : character.progress);
        }}>Парирование</button>
      </div>
      <div className="row">
        <button type="button" className="btn" data-testid="visit-1" onClick={() => apply(doctorsVisit(combat, 1))}>Визит, 1 действие</button>
        <button type="button" className="btn" data-testid="visit-2" onClick={() => apply(doctorsVisit(combat, 2))}>Визит, 2 действия</button>
      </div>
      <label className="field">
        <span>Цель Боевой медицины</span>
        <input data-testid="medicine-target" value={target} onChange={(event) => setTarget(event.target.value)} />
      </label>
      <button type="button" className="btn" data-testid="battle-medicine" onClick={() => apply(battleMedicine(combat, target))}>Лечить эту цель</button>
      <button type="button" className="text-btn" data-testid="combat-help" onClick={() => setNote(openHelp(combat).note)}>Справка по экрану</button>
      {combat.immunity.length > 0 && <p className="tiny" data-testid="immunity-list">Иммунитет: {combat.immunity.map((row) => row.target).join(", ")}</p>}
      <button type="button" className="text-btn" data-testid="new-round" onClick={() => {
        const step = newRound(combat);
        apply(step, withToggle(false));
      }}>Новый раунд</button>
      {note && <p className="tiny" data-testid="combat-note">{note}</p>}
    </div>
  );
}

const FUNDAMENTAL = new Set([
  "striking", "striking-greater", "striking-major",
  "resilient", "resilient-greater", "resilient-major",
  "weapon-potency-1", "weapon-potency-2", "weapon-potency-3",
  "armor-potency-1", "armor-potency-2", "armor-potency-3",
]);

const PROPERTY_RUNES = rulesCatalog()
  .filter((entry) => entry.edition === "pf-remaster" && entry.category === "rune" && !FUNDAMENTAL.has(entry.localId))
  .map((entry) => ({ id: entry.localId, name: entry.name }));

export function Etch({ item, onChange }: { item: ItemInst; onChange: (runes: NonNullable<ItemInst["runes"]>) => void }) {
  const runes = item.runes ?? {};
  const property = runes.property ?? [];
  const cap = runes.potency ?? 0;
  function set(partial: NonNullable<ItemInst["runes"]>) {
    const next = { ...runes, ...partial };
    if ((next.property?.length ?? 0) > (next.potency ?? 0)) next.property = (next.property ?? []).slice(0, next.potency ?? 0);
    onChange(next);
  }
  return (
    <div className="stack" data-testid={`etch-${item.uid}`}>
      {item.kind === "weapon" && (
        <>
          <label className="field">
            <span>Руна мощи</span>
            <select data-testid="etch-potency" value={String(runes.potency ?? 0)} onChange={(event) => set({ potency: Number(event.target.value) })}>
              <option value="0">Нет</option>
              <option value="1">+1, одно свойство</option>
              <option value="2">+2, два свойства</option>
              <option value="3">+3, три свойства</option>
            </select>
          </label>
          <label className="field">
            <span>Руна ударов</span>
            <select data-testid="etch-striking" value={String(runes.striking ?? 0)} onChange={(event) => set({ striking: Number(event.target.value) })}>
              <option value="0">Нет, одна кость</option>
              <option value="1">Удары, две кости</option>
              <option value="2">Большие удары, три кости</option>
              <option value="3">Высшие удары, четыре кости</option>
            </select>
          </label>
        </>
      )}
      {item.kind === "armor" && (
        <>
          <label className="field">
            <span>Руна мощи доспеха</span>
            <select data-testid="etch-potency" value={String(runes.potency ?? 0)} onChange={(event) => set({ potency: Number(event.target.value) })}>
              <option value="0">Нет</option>
              <option value="1">+1 к КБ, одно свойство</option>
              <option value="2">+2 к КБ, два свойства</option>
              <option value="3">+3 к КБ, три свойства</option>
            </select>
          </label>
          <label className="field">
            <span>Руна устойчивости</span>
            <select data-testid="etch-resilient" value={String(runes.resilient ?? 0)} onChange={(event) => set({ resilient: Number(event.target.value) })}>
              <option value="0">Нет</option>
              <option value="1">+1 к испытаниям</option>
              <option value="2">+2 к испытаниям</option>
              <option value="3">+3 к испытаниям</option>
            </select>
          </label>
        </>
      )}
      <label className="field">
        <span>Свойство, мест {property.length} из {cap}</span>
        <select data-testid="etch-property" value="" onChange={(event) => {
          const id = event.target.value;
          if (!id || property.length >= cap || property.some((rune) => rune.id === id)) return;
          const found = PROPERTY_RUNES.find((rune) => rune.id === id);
          if (!found) return;
          set({ property: [...property, found] });
        }}>
          <option value="">{cap === 0 ? "Сначала руна мощи" : "Добавить карточку"}</option>
          {PROPERTY_RUNES.map((rune) => <option key={rune.id} value={rune.id}>{rune.name}</option>)}
        </select>
      </label>
      {property.map((rune) => (
        <button key={rune.id} type="button" className="text-btn" onClick={() => set({ property: property.filter((row) => row.id !== rune.id) })}>
          Убрать {rune.name}
        </button>
      ))}
    </div>
  );
}
