import { useState } from "react";
import { GENERAL_FEATS, ITEMS, ORIGIN_FEATS, SKILLS, STYLE_FEATS } from "../data/dnd5e";
import { actionSurge, attackPreview, bonusAction, emptyDndCombat, newRound, openHelp, secondWind, spendAttack, spendResource, spendSlot, useReaction } from "../dnd/combat";
import { describeDndChoice, sheetDnd, snapshotDnd, slotsForProgress } from "../dnd/build";
import type { Ability, Character, DndCombat, FeatInst, FeatureInst, ItemInst, StructuredEffect } from "../types";
import { ABILITY_NAME, fmt, uid } from "../types";
import { useCompact } from "./common";

export function DndBanner({ character }: { character: Character }) {
  const derived = sheetDnd(character);
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

export function DndAdvance({ character, onChange }: { character: Character; onChange: (next: Character) => void }) {
  const progress = character.dnd;
  const [view, setView] = useState(character.level);
  const [entry, setEntry] = useState<CustomEntry>(blankCustom());
  if (!progress) return <p>У этого листа нет истории уровней. Числа всё равно разбираются по текущим полям.</p>;
  const live = sheetDnd(character);
  const preview = sheetDnd(character, view);
  if (!live || !preview) return null;
  const slots = slotsForProgress(progress, character.level);
  const open = slots.filter((slot) => !progress.choices.some((choice) => choice.id === slot.id));

  function commit(next: Character) {
    onChange(snapshotDnd(next));
  }

  function fill(slot: { id: string; level: number; source: string }, pick: string) {
    if (!progress || !pick) return;
    const [value, ability] = pick.split("|");
    commit({
      ...character,
      dnd: {
        ...progress,
        choices: [...progress.choices, {
          id: slot.id,
          level: slot.level,
          source: slot.source,
          pick: value,
          detail: ability ? { ability } : undefined,
        }],
      },
    });
  }

  function addEntry() {
    const name = entry.name.trim() || "Своя запись";
    const effect = structured(name, entry);
    if (entry.category === "feat" || entry.category === "feature") {
      const row = { name, info: entry.notes.trim() || "Своя запись. Текст в механику не разбирается.", custom: true, source: "своя", effects: effect ? [effect] : [] };
      if (entry.category === "feat") {
        const feat: FeatInst = { id: uid(), ...row };
        commit({ ...character, feats: [...character.feats, feat] });
      } else {
        const feature: FeatureInst = row;
        commit({ ...character, features: [...character.features, feature] });
      }
      setEntry(blankCustom());
      return;
    }
    const magic = Number(entry.magic) || 0;
    const item: ItemInst = {
      uid: uid(),
      name,
      qty: Math.max(1, Number(entry.qty) || 1),
      weight: Number(entry.weight) || 0,
      equipped: entry.category === "armor" || entry.category === "shield" || entry.category === "weapon",
      kind: entry.category === "weapon" ? "weapon" : entry.category === "shield" ? "shield" : entry.category === "tool" ? "tool" : entry.category === "armor" ? "armor" : "gear",
      custom: true,
      magicBonus: magic,
      priceCp: Math.round((Number(entry.price) || 0) * 100),
      placement: entry.placement,
      notes: entry.notes.trim() || "Собственная запись. Текст в механику не разбирается.",
    };
    if (item.kind === "armor") item.armor = { ac: Number(entry.ac) || 10, dexCap: entry.dex === "" ? null : Number(entry.dex), category: "heavy" };
    if (item.kind === "weapon") {
      const hands: 1 | 2 = Number(entry.hands) >= 2 ? 2 : 1;
      item.weapon = { damage: entry.damage.trim() || "1d8", attr: entry.attr, category: "martial", hands, twoHanded: hands === 2, ranged: entry.ranged };
    }
    if (item.kind === "shield") item.shield = { acBonus: Number(entry.shieldAc) || 2, hardness: 0, hp: 0, bt: 0 };
    const items = item.kind === "armor" || item.kind === "shield"
      ? character.items.map((row) => row.kind === item.kind ? { ...row, equipped: false } : row)
      : character.items;
    commit({ ...character, items: [...items, item] });
    setEntry(blankCustom());
  }

  return (
    <div className="stack">
      <p className="lead">Уровень {character.level}. Просмотр другого уровня не стирает план и не тратит опыт.</p>
      <label className="field">
        <span>Посмотреть уровень</span>
        <input type="number" min={1} max={character.level} value={view} onChange={(event) => setView(Math.max(1, Math.min(character.level, Number(event.target.value) || 1)))} />
      </label>
      {view !== character.level && (
        <div className="card stack">
          <b>Просмотр {view} уровня</b>
          <p>ПЗ {preview.hp.value}. КБ {preview.ac.value}. Атака {fmt(preview.attacks.find((attack) => attack.equipped)?.attack.value ?? 0)}. Атак за действие {preview.attacksPerAction}.</p>
          <p className="tiny">Текущий лист остаётся {character.level} уровня.</p>
        </div>
      )}
      <p className="tiny">{live.ac.formula}</p>
      <p className="tiny">{live.hp.formula}</p>
      {open.length > 0 && <h2>Открытые выборы</h2>}
      {open.map((slot) => (
        <label key={slot.id} className="field">
          <span>{slot.level}. {slot.label}</span>
          <select value="" onChange={(event) => fill(slot, event.target.value)}>
            <option value="">Выбрать</option>
            {optionsFor(slot.source).map((option) => <option key={option.pick} value={option.pick}>{option.name}</option>)}
          </select>
        </label>
      ))}
      <h2>Сделанные выборы</h2>
      {progress.choices.slice().sort((a, b) => a.level - b.level).map((choice) => (
        <div key={choice.id} className="row-between">
          <span>{choice.level}. {describeDndChoice(choice)}</span>
          <button type="button" className="text-btn" onClick={() => commit({ ...character, dnd: { ...progress, choices: progress.choices.filter((item) => item.id !== choice.id) } })}>Убрать</button>
        </div>
      ))}
      <CustomForm entry={entry} setEntry={setEntry} onAdd={addEntry} />
      <DndCombatPanel character={character} onChange={onChange} />
    </div>
  );
}

export function DndCombatPanel({ character, onChange }: { character: Character; onChange: (next: Character) => void }) {
  const derived = sheetDnd(character);
  const [note, setNote] = useState("");
  const [compact, toggleCompact] = useCompact();
  if (!derived) return null;
  const combat: DndCombat = { ...emptyDndCombat(derived.resources, derived.slots), ...character.dndCombat };
  const sword = derived.attacks.find((attack) => attack.equipped) ?? derived.attacks[0];
  function apply(step: { state: DndCombat; note: string; spent: boolean }) {
    setNote(step.note);
    if (!step.spent) return;
    onChange({ ...character, dndCombat: step.state });
  }
  return (
    <div className={`card stack combat-board ${compact ? "compact" : ""}`} data-testid="dnd-combat">
      <div className="row-between">
        <b>Боевой экран</b>
        <button type="button" className={`pill ${compact ? "on" : ""}`} aria-pressed={compact} onClick={toggleCompact}>
          {compact ? "Компактно" : "Обычный вид"}
        </button>
      </div>
      <p>Действие {combat.action ? "есть" : "нет"} · бонусное {combat.bonus ? "есть" : "нет"} · реакция {combat.reaction ? "есть" : "нет"} · атак {combat.attacks}/{derived.attacksPerAction}{combat.extraAction ? " и ещё действие" : ""}</p>
      {derived.resources.length > 0 && (
        <p>{derived.resources.map((resource) => `${resource.name} ${combat.resources[resource.id] ?? 0} из ${resource.max}`).join(" · ")}</p>
      )}
      {sword && <p className="combat-figure" data-testid="dnd-preview">{attackPreview(sword.attack.value)} Урон {sword.damage}. Крит {derived.crit}.</p>}
      <div className="row">
        <button type="button" className="btn" data-testid="dnd-attack" onClick={() => apply(spendAttack(combat, derived.attacksPerAction))}>Атака</button>
        <button type="button" className="btn" onClick={() => apply(useReaction(combat))}>Реакция</button>
      </div>
      <div className="row">
        <button type="button" className="btn" data-testid="dnd-wind" onClick={() => apply(secondWind(combat))}>Второе дыхание</button>
        <button type="button" className="btn" data-testid="dnd-surge" onClick={() => apply(actionSurge(combat))}>Всплеск действий</button>
      </div>
      <button type="button" className="btn" onClick={() => apply(bonusAction(combat, "Бонусное действие потрачено."))}>Бонусное действие</button>
      {derived.resources.filter((resource) => resource.id !== "wind" && resource.id !== "surge").map((resource) => (
        <button key={resource.id} type="button" className="btn" onClick={() => apply(spendResource(combat, resource.id, resource.name))}>
          {resource.name}, осталось {combat.resources[resource.id] ?? 0}
        </button>
      ))}
      {derived.slots.map((slot) => (
        <button key={slot.rank} type="button" className="btn" onClick={() => apply(spendSlot(combat, slot.rank, slot.max))}>
          Ячейка {slot.rank} круга, потрачено {combat.slotsUsed[String(slot.rank)] ?? 0} из {slot.max}
        </button>
      ))}
      <button type="button" className="text-btn" data-testid="dnd-help" onClick={() => setNote(openHelp(combat).note)}>Справка по экрану</button>
      <button type="button" className="text-btn" onClick={() => { const step = newRound(combat); setNote(step.note); onChange({ ...character, dndCombat: step.state }); }}>Новый раунд</button>
      {note && <p className="tiny" data-testid="dnd-note">{note}</p>}
    </div>
  );
}

const ABILITIES: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];

interface CustomEntry {
  category: "weapon" | "armor" | "shield" | "tool" | "other" | "feat" | "feature";
  name: string;
  qty: string;
  weight: string;
  price: string;
  notes: string;
  placement: "worn" | "held" | "stowed";
  ac: string;
  dex: string;
  magic: string;
  damage: string;
  attr: "str" | "dex" | "finesse";
  hands: string;
  ranged: boolean;
  shieldAc: string;
  effectTarget: "" | "ac" | "speed" | "hp";
  effectValue: string;
  implemented: boolean;
}

function blankCustom(): CustomEntry {
  return {
    category: "armor",
    name: "",
    qty: "1",
    weight: "1",
    price: "0",
    notes: "",
    placement: "worn",
    ac: "16",
    dex: "0",
    magic: "0",
    damage: "1d8",
    attr: "str",
    hands: "1",
    ranged: false,
    shieldAc: "2",
    effectTarget: "",
    effectValue: "0",
    implemented: false,
  };
}

function structured(name: string, entry: CustomEntry): StructuredEffect | null {
  if (!entry.effectTarget) return null;
  return {
    label: name,
    target: entry.effectTarget,
    type: "untyped",
    value: Number(entry.effectValue) || 0,
    implemented: entry.implemented,
  };
}

function optionsFor(source: string): { pick: string; name: string }[] {
  if (source === "skill") return SKILLS.map((skill) => ({ pick: skill.id, name: skill.name }));
  if (source === "style") return [...STYLE_FEATS.map((feat) => ({ pick: feat.id, name: feat.name })), { pick: "dueling", name: "Дуэль" }, { pick: "protection", name: "Защита" }];
  if (source === "feat") return [...ORIGIN_FEATS, ...GENERAL_FEATS].map((feat) => ({ pick: `feat:${feat.id}`, name: feat.name }));
  if (source === "mastery") return ITEMS.filter((item) => item.kind === "weapon").map((item) => ({ pick: item.id, name: item.name }));
  if (source === "epic") return ABILITIES.map((ability) => ({ pick: `boon:combat-prowess|${ability}`, name: `+1 к ${ABILITY_NAME[ability]}` }));
  if (source === "asi") {
    const list = ABILITIES.map((ability) => ({ pick: `${ability}+2`, name: `${ABILITY_NAME[ability]} +2` }));
    for (let i = 0; i < ABILITIES.length; i += 1) {
      for (let j = i + 1; j < ABILITIES.length; j += 1) {
        list.push({ pick: `${ABILITIES[i]}+1,${ABILITIES[j]}+1`, name: `${ABILITY_NAME[ABILITIES[i]]} +1 и ${ABILITY_NAME[ABILITIES[j]]} +1` });
      }
    }
    list.push({ pick: "feat:grappler|str", name: "Черта: Борец, Сила" }, { pick: "feat:grappler|dex", name: "Черта: Борец, Ловкость" }, { pick: "feat:tough", name: "Черта: Живучесть" }, { pick: "feat:alert", name: "Черта: Бдительный" });
    return list;
  }
  return [];
}

function CustomForm({ entry, setEntry, onAdd }: { entry: CustomEntry; setEntry: (next: CustomEntry) => void; onAdd: () => void }) {
  const set = (partial: Partial<CustomEntry>) => setEntry({ ...entry, ...partial });
  return (
    <div className="card stack">
      <b>Своя запись</b>
      <label className="field">
        <span>Категория</span>
        <select value={entry.category} onChange={(event) => set({ category: event.target.value as CustomEntry["category"] })}>
          <option value="weapon">Оружие</option>
          <option value="armor">Доспех</option>
          <option value="shield">Щит</option>
          <option value="tool">Инструмент</option>
          <option value="other">Прочее</option>
          <option value="feat">Черта</option>
          <option value="feature">Особенность</option>
        </select>
      </label>
      <label className="field"><span>Название</span><input value={entry.name} onChange={(event) => set({ name: event.target.value })} /></label>
      <label className="field"><span>Описание</span><input value={entry.notes} onChange={(event) => set({ notes: event.target.value })} /></label>
      {entry.category !== "feat" && entry.category !== "feature" && (
        <>
          <label className="field"><span>Количество</span><input value={entry.qty} onChange={(event) => set({ qty: event.target.value })} /></label>
          <label className="field"><span>Вес, фунты</span><input value={entry.weight} onChange={(event) => set({ weight: event.target.value })} /></label>
          <label className="field"><span>Цена, золотые</span><input value={entry.price} onChange={(event) => set({ price: event.target.value })} /></label>
          <label className="field">
            <span>Где лежит</span>
            <select value={entry.placement} onChange={(event) => set({ placement: event.target.value as CustomEntry["placement"] })}>
              <option value="worn">Надето</option>
              <option value="held">В руках</option>
              <option value="stowed">В сумке</option>
            </select>
          </label>
          <label className="field"><span>Магический бонус</span><input value={entry.magic} onChange={(event) => set({ magic: event.target.value })} /></label>
        </>
      )}
      {entry.category === "armor" && (
        <>
          <label className="field"><span>Класс брони</span><input value={entry.ac} onChange={(event) => set({ ac: event.target.value })} /></label>
          <label className="field"><span>Предел Ловкости</span><input value={entry.dex} onChange={(event) => set({ dex: event.target.value })} /></label>
        </>
      )}
      {entry.category === "shield" && (
        <label className="field"><span>Бонус КБ щита</span><input value={entry.shieldAc} onChange={(event) => set({ shieldAc: event.target.value })} /></label>
      )}
      {entry.category === "weapon" && (
        <>
          <label className="field"><span>Урон</span><input value={entry.damage} onChange={(event) => set({ damage: event.target.value })} /></label>
          <label className="field">
            <span>Характеристика атаки</span>
            <select value={entry.attr} onChange={(event) => set({ attr: event.target.value as CustomEntry["attr"] })}>
              <option value="str">Сила</option>
              <option value="dex">Ловкость</option>
              <option value="finesse">Фехтовальное</option>
            </select>
          </label>
          <label className="field"><span>Число рук</span><input value={entry.hands} onChange={(event) => set({ hands: event.target.value })} /></label>
        </>
      )}
      {(entry.category === "feat" || entry.category === "feature") && (
        <>
          <label className="field">
            <span>Куда прибавлять число</span>
            <select value={entry.effectTarget} onChange={(event) => set({ effectTarget: event.target.value as CustomEntry["effectTarget"] })}>
              <option value="">Только описание</option>
              <option value="ac">Класс брони</option>
              <option value="speed">Скорость</option>
              <option value="hp">Хиты</option>
            </select>
          </label>
          {entry.effectTarget && <label className="field"><span>Величина</span><input value={entry.effectValue} onChange={(event) => set({ effectValue: event.target.value })} /></label>}
          <label className="row">
            <input type="checkbox" checked={entry.implemented} onChange={(event) => set({ implemented: event.target.checked })} />
            <span>Эффект включён в расчёт</span>
          </label>
        </>
      )}
      <button type="button" className="btn" data-testid="add-custom-entry" onClick={onAdd}>Добавить свою запись</button>
    </div>
  );
}
