import { SKILLS as DND_SKILLS } from "../data/dnd5e";
import { rulesOf } from "../data/editions";
import { ANCESTRIES, SKILLS as PF_SKILLS } from "../data/pf2e";
import { VERSATILE } from "../data/versatile";
import { sheetDnd } from "../dnd/build";
import { compressImage } from "../image";
import { appendRoll } from "../play/log";
import { conditionList } from "../create";
import { armorClass, initiativeOf, saveMod, skillRows, speedOf, xpToNext } from "../rules";
import {
  ABILITIES,
  ABILITY_NAME,
  ABILITY_SHORT,
  type Character,
  fmt,
  mod,
  uid,
} from "../types";
import { PORTRAIT_PROVENANCE, portraitSrc } from "./art";
import { go, useInfo } from "./common";
import { sheetDerived } from "./remaster";
import { TurnHints } from "./beginner";

const PF_RANKS = ["untrained", "trained", "expert", "master", "legendary"] as const;
const PIP_LETTER = ["О", "Э", "М", "Л"];

export function CharacterBoard({ character, commit, hints = false }: { character: Character; commit: (next: Character) => void; hints?: boolean }) {
  const open = useInfo();
  const derived = sheetDerived(character);
  const dnd = sheetDnd(character);
  const pf = character.system === "pf2e";

  function tell(title: string, text: string) {
    open(title, text);
  }

  function roll(label: string, modifier: number) {
    const die = 1 + Math.floor(Math.random() * 20);
    const total = die + modifier;
    commit({
      ...character,
      rolls: appendRoll(character.rolls, {
        id: uid(),
        at: Date.now(),
        system: character.system,
        edition: rulesOf(character).edition,
        action: label,
        dice: [die],
        kept: die,
        modifier,
        total,
        dc: null,
        verdict: "",
      }),
    });
    tell(label, `Кость к20: ${die}. Модификатор ${fmt(modifier)}. Итог ${total}.`);
  }

  const ancestry = ANCESTRIES.find((item) => item.id === character.ancestryId);
  const heritage = ancestry?.heritages.find((item) => item.id === character.progress?.heritageId)?.name ?? "";
  const versatileId = character.versatileHeritageId || character.progress?.versatileHeritageId || "";
  const versatile = VERSATILE.find((item) => item.id === versatileId)?.name ?? "";
  const heritageLine = [heritage, versatile].filter(Boolean).join(", ") || (pf ? "наследие не выбрано" : character.subclassName || "подкласс не выбран");
  const maxHp = derived?.hp.value ?? dnd?.hp.value ?? character.hpCurrent;
  const ac = derived
    ? { value: derived.ac.value, text: [derived.ac.formula, ...derived.ac.aside].join("\n") }
    : dnd
      ? { value: dnd.ac.value, text: [dnd.ac.formula, ...dnd.ac.aside].join("\n") }
      : armorClass(character);
  const speed = derived
    ? { value: derived.speed.value, text: derived.speed.formula }
    : dnd
      ? { value: dnd.speed.value, text: dnd.speed.formula }
      : speedOf(character);
  const perception = derived
    ? { value: derived.perception.value, text: derived.perception.formula, rank: derived.perception.rank }
    : { value: dnd?.initiative.value ?? initiativeOf(character).value, text: dnd?.initiative.formula ?? initiativeOf(character).text, rank: character.perceptionRank || "untrained" };
  const wornArmor = character.items.find((item) => item.kind === "armor" && item.equipped);
  const shield = character.items.find((item) => item.kind === "shield");
  const dying = character.conditionValues.dying ?? 0;
  const wounded = character.conditionValues.wounded ?? 0;
  const skills = skillLines(character, derived, dnd);
  const strikes = strikeLines(character, derived, dnd);
  const melee = strikes.filter((row) => !row.ranged).slice(0, 3);
  const ranged = strikes.filter((row) => row.ranged).slice(0, 2);
  const conditionText = conditionSummary(character);

  function setNumber(partial: Partial<Character>) {
    commit({ ...character, ...partial });
  }

  function setTrack(id: "dying" | "wounded", value: number) {
    const conditionValues = { ...character.conditionValues };
    const conditions = character.conditions.filter((item) => item !== id);
    if (value > 0) {
      conditionValues[id] = value;
      conditions.push(id);
    } else delete conditionValues[id];
    commit({ ...character, conditionValues, conditions });
  }

  const attack = melee[0]?.attack ?? ranged[0]?.attack ?? 0;
  return (
    <section className="character-board" data-testid="character-board">
      {hints && <TurnHints pf={pf} attack={attack} onRoll={roll} onGrowth={() => go(`#/c/${character.id}/growth`)} />}
      <header className="board-head">
        <label className="board-portrait" title="Портрет">
          {(character.photo || portraitSrc(character.ancestryId, character.classId)) ? (
            <img src={character.photo || portraitSrc(character.ancestryId, character.classId) || ""} alt="" title={PORTRAIT_PROVENANCE} data-provenance={PORTRAIT_PROVENANCE} />
          ) : (
            <span aria-hidden>⚔</span>
          )}
          <input
            type="file"
            accept="image/*"
            data-testid="sheet-photo"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void compressImage(file).then((photo) => setNumber({ photo })).catch(() => undefined);
            }}
          />
        </label>
        <label className="board-name">
          <span>Имя</span>
          <input data-testid="sheet-name" value={character.name} onChange={(event) => setNumber({ name: event.target.value })} />
        </label>
        <label className="board-name">
          <span>Игрок</span>
          <input data-testid="sheet-player" value={character.player ?? ""} placeholder="имя за столом" onChange={(event) => setNumber({ player: event.target.value })} />
        </label>
        <div className="board-level">
          <b>{character.level}</b>
          <span>уровень</span>
        </div>
        <button type="button" className="num" data-testid="num-xp" onClick={() => tell("Опыт", pf ? `До следующего уровня ${xpToNext(character)} опыта. Сейчас ${character.xp} из 1000.` : `Опыт ${character.xp}. Следующий уровень по таблице книги.`)}>
          <b>{character.xp}</b>
          <span>опыт</span>
        </button>
        <div className="hexes" aria-label={pf ? "Очки героизма" : "Вдохновение"}>
          {(pf ? [0, 1, 2] : [0]).map((index) => (
            <button
              key={index}
              type="button"
              className={`hex ${character.hero > index ? "on" : ""}`}
              aria-pressed={character.hero > index}
              data-testid={`hero-hex-${index}`}
              onClick={() => setNumber({ hero: character.hero === index + 1 ? index : index + 1 })}
            >
              {pf ? "◆" : "★"}
            </button>
          ))}
        </div>
      </header>

      <div className="board-meta">
        <Field label={pf ? "Народ" : "Вид"} value={character.ancestryName} onOpen={() => tell(character.ancestryName, character.ancestryInfo || "Народ листа.")} />
        <Field label={pf ? "Наследие и размер" : "Происхождение"} value={pf ? `${heritageLine} · ${character.size || "размер не задан"}` : character.backgroundName} onOpen={() => tell(pf ? "Наследие" : "Происхождение", pf ? `${heritageLine}. Размер: ${character.size}.` : character.backgroundInfo)} />
        <Field label={pf ? "Происхождение" : "Класс"} value={pf ? character.backgroundName : `${character.className}${character.subclassName ? ` · ${character.subclassName}` : ""}`} onOpen={() => tell(pf ? character.backgroundName : character.className, pf ? character.backgroundInfo : `${character.classInfo}\n${character.subclassName}`)} />
        <Field label={pf ? "Класс" : "Подкласс"} value={pf ? character.className : character.subclassName || "—"} onOpen={() => tell(character.className, character.classInfo)} />
      </div>

      <div className="board-abil">
        {ABILITIES.map((ability) => {
          const row = derived?.abilities[ability] ?? dnd?.abilities[ability];
          const score = row?.score ?? character.abilities[ability];
          const value = row?.mod ?? mod(score);
          const partial = derived?.abilities[ability].partial ?? false;
          return (
            <div key={ability} className="abil">
              <span>{ABILITY_SHORT[ability]}</span>
              <button type="button" className="num" data-testid={`num-${ability}`} onClick={() => tell(ABILITY_NAME[ability], row && "formula" in row ? row.formula : `${ABILITY_NAME[ability]} ${score}, модификатор ${fmt(value)}.`)}>
                {fmt(value)}
              </button>
              <small>{score}{partial ? " ◇" : ""}</small>
            </div>
          );
        })}
      </div>

      <div className="board-defense">
        <div className="ac-box">
          <button type="button" className="num big-num" data-testid="num-ac" onClick={() => tell("Класс брони", ac.text)}>
            {ac.value}
          </button>
          <div>
            <b>КБ</b>
            <Pips rank={derived?.armorRank ?? (character.armorTraining.length ? "trained" : "untrained")} letters={pf} />
            <small>{derived?.armorName ?? wornArmor?.name ?? "без доспеха"}</small>
          </div>
          <button type="button" className={`shield ${character.shieldRaised ? "on" : ""}`} data-testid="shield-toggle" onClick={() => setNumber({ shieldRaised: !character.shieldRaised })}>
            Щит {shield ? fmt(shield.shield?.acBonus ?? 2) : "—"}
            {character.shieldRaised ? " поднят" : ""}
          </button>
        </div>
        {pf ? (
          (["fort", "ref", "will"] as const).map((key) => {
            const save = derived?.saves[key];
            const name = key === "fort" ? "Стойкость" : key === "ref" ? "Рефлексы" : "Воля";
            const ability = key === "fort" ? "con" : key === "ref" ? "dex" : "wis";
            const value = save?.value ?? saveMod(character, key, ability);
            return (
              <div key={key} className="save-row">
                <span>{name}</span>
                <button type="button" className="num" data-testid={`num-${key}`} onClick={() => tell(name, save ? [save.formula, ...save.aside].join("\n") : "Испытание.")}>{fmt(value)}</button>
                <Pips rank={save?.rank ?? character.saves[key] ?? "untrained"} letters />
              </div>
            );
          })
        ) : (
          <div className="save-row dnd-saves">
            {ABILITIES.map((ability) => {
              const save = dnd?.saves[ability];
              const value = save?.value ?? saveMod(character, ability, ability);
              return (
                <button key={ability} type="button" className="num" data-testid={`num-save-${ability}`} onClick={() => tell(`Спасбросок ${ABILITY_NAME[ability]}`, save?.formula ?? "Спасбросок.")}>
                  {ABILITY_SHORT[ability]} {fmt(value)}{save?.proficient ? " ●" : ""}
                </button>
              );
            })}
          </div>
        )}
        <div className="hp-box">
          <button type="button" className="num" data-testid="num-hp" onClick={() => tell("Хиты", derived?.hp.formula ?? dnd?.hp.formula ?? `Максимум ${maxHp}.`)}>
            макс {maxHp}
          </button>
          <label>
            Сейчас
            <input data-testid="hp-current" inputMode="numeric" value={character.hpCurrent} onChange={(event) => setNumber({ hpCurrent: Number(event.target.value) || 0 })} />
          </label>
          <label>
            Врем.
            <input data-testid="hp-temp" inputMode="numeric" value={character.hpTemp} onChange={(event) => setNumber({ hpTemp: Number(event.target.value) || 0 })} />
          </label>
          {pf ? (
            <>
              <span className="track" aria-label="Умирание">
                {[1, 2, 3, 4].map((step) => (
                  <button key={step} type="button" className={dying >= step ? "on" : ""} data-testid={`dying-${step}`} onClick={() => setTrack("dying", dying === step ? step - 1 : step)} />
                ))}
                <small>умирание</small>
              </span>
              <button type="button" className="num" data-testid="num-wounded" onClick={() => setTrack("wounded", (wounded + 1) % 4)}>
                раны {wounded}
              </button>
            </>
          ) : (
            <span className="track" aria-label="Спасброски от смерти">
              {[1, 2, 3].map((step) => (
                <button key={`s${step}`} type="button" className={(character.death?.success ?? 0) >= step ? "on" : ""} onClick={() => setNumber({ death: { success: (character.death?.success ?? 0) === step ? step - 1 : step, fail: character.death?.fail ?? 0, stable: character.death?.stable ?? false } })} />
              ))}
              {[1, 2, 3].map((step) => (
                <button key={`f${step}`} type="button" className={`fail ${(character.death?.fail ?? 0) >= step ? "on" : ""}`} onClick={() => setNumber({ death: { fail: (character.death?.fail ?? 0) === step ? step - 1 : step, success: character.death?.success ?? 0, stable: character.death?.stable ?? false } })} />
              ))}
              <small>смерть</small>
            </span>
          )}
        </div>
        <div className="sense-row">
          <button type="button" className="num" data-testid="num-perception" onClick={() => tell(pf ? "Восприятие" : "Инициатива", perception.text)}>{fmt(perception.value)}</button>
          <span>{pf ? "Восприятие" : "Инициатива"}</span>
          {pf && <Pips rank={perception.rank} letters />}
          <small>{character.senses || (pf ? "чувства не записаны" : "пассивная внимательность рядом")}</small>
          <button type="button" className="num" data-testid="num-speed" onClick={() => tell("Скорость", speed.text)}>{speed.value}</button>
          <span>футов</span>
        </div>
        <label className="line-field">
          <span>Сопротивления</span>
          <input value={character.resistances ?? ""} placeholder="нет в полях" onChange={(event) => setNumber({ resistances: event.target.value })} />
        </label>
        <button type="button" className="line-btn" data-testid="conditions-line" onClick={() => tell("Состояния", conditionText || "Сейчас состояний нет. Умирание и раны ставятся кружками выше.")}>
          {conditionText || "Состояний нет"}
        </button>
      </div>

      <div className="board-skills">
        <b>Навыки</b>
        <div className="skill-grid">
          {skills.map((skill) => (
            <div key={skill.id} className="skill-line" data-testid={`skill-${skill.id}`}>
              <button type="button" className="skill-roll" onClick={() => roll(skill.name, skill.value)}>{skill.name}</button>
              <small>{ABILITY_SHORT[skill.ability]}</small>
              <button type="button" className="num" data-testid={`num-skill-${skill.id}`} onClick={() => tell(skill.name, skill.formula)}>{fmt(skill.value)}</button>
              <Pips rank={skill.rank} letters={pf} />
            </div>
          ))}
        </div>
        <label className="line-field">
          <span>Языки</span>
          <input data-testid="sheet-languages" value={character.languages} onChange={(event) => setNumber({ languages: event.target.value })} />
        </label>
      </div>

      <div className="board-strikes">
        <StrikeList title="Ближние удары" rows={melee} onTell={tell} />
        <StrikeList title="Дальние удары" rows={ranged} onTell={tell} />
        {derived?.classDc && (
          <div className="save-row">
            <span>Классовая СЛ</span>
            <button type="button" className="num" data-testid="num-class-dc" onClick={() => tell("Классовая СЛ", derived.classDc?.formula ?? "")}>{derived.classDc.value}</button>
            <Pips rank={derived.classDc.rank} letters />
          </div>
        )}
        {dnd && character.spellcasting && (
          <div className="save-row">
            <span>СЛ заклинаний</span>
            <button type="button" className="num" data-testid="num-spell-dc" onClick={() => tell("СЛ заклинаний", `8 + бонус мастерства ${dnd.pb} + ${ABILITY_NAME[character.spellcasting?.ability ?? "wis"]} ${fmt(dnd.abilities[character.spellcasting?.ability ?? "wis"].mod)}.`)}>
              {8 + dnd.pb + dnd.abilities[character.spellcasting.ability].mod}
            </button>
          </div>
        )}
        {derived && (
          <p className="tiny-ranks">
            Оружие: простое {rankShort(derived.weaponRanks.simple)}, воинское {rankShort(derived.weaponRanks.martial)}, без оружия {rankShort(derived.weaponRanks.unarmed)}, продвинутое {rankShort(derived.weaponRanks.advanced)}
          </p>
        )}
      </div>

      <footer className="board-foot">
        <p>
          {pf
            ? "Необучен — только модификатор. Обучен — уровень +2. Эксперт +4. Мастер +6. Легенда +8."
            : `Бонус мастерства ${dnd?.pb ?? ""}. Кружок — владение, два кружка — экспертиза.`}
        </p>
        <p className="actions-legend" aria-label="Цена действий">
          <span>◆ 1</span>
          <span>◆◆ 2</span>
          <span>◆◆◆ 3</span>
          <span>↺ реакция</span>
          <span>◇ свободное</span>
        </p>
      </footer>
    </section>
  );
}

export function FeatsPage({ character }: { character: Character }) {
  const rows = [
    ...character.features.map((item) => ({ id: item.name, name: item.name, info: item.info })),
    ...character.feats.map((item) => ({ id: item.id, name: item.name, info: item.info })),
  ];
  return (
    <div className="stack" data-testid="feats-page">
      <p className="tiny">Черты и умения листа. Число меняется только там, где оно уже есть в формуле.</p>
      {rows.length === 0 && <p>Черты ещё не записаны.</p>}
      {rows.map((row) => (
        <article key={row.id} className="card">
          <b>{row.name}</b>
          <p className="tiny">{row.info}</p>
        </article>
      ))}
    </div>
  );
}

function Field({ label, value, onOpen }: { label: string; value: string; onOpen: () => void }) {
  return (
    <button type="button" className="meta-field" onClick={onOpen}>
      <span>{label}</span>
      <b>{value || "—"}</b>
    </button>
  );
}

function Pips({ rank, letters }: { rank: string; letters: boolean }) {
  if (!letters) {
    const filled = rank === "expertise" ? 2 : rank === "proficient" || rank === "trained" ? 1 : 0;
    return (
      <span className="pips" aria-label={rank}>
        {[0, 1].map((index) => <i key={index} className={index < filled ? "on" : ""} />)}
      </span>
    );
  }
  const at = PF_RANKS.indexOf(rank as (typeof PF_RANKS)[number]);
  return (
    <span className="pips" aria-label={rankShort(rank)}>
      {PIP_LETTER.map((letter, index) => <i key={letter} className={index < at ? "on" : ""}>{letter}</i>)}
    </span>
  );
}

function StrikeList({ title, rows, onTell }: { title: string; rows: StrikeRow[]; onTell: (title: string, text: string) => void }) {
  return (
    <div className="strike-block">
      <b>{title}</b>
      {rows.length === 0 && <p className="tiny">Нет оружия в сумке.</p>}
      {rows.map((row) => (
        <button key={row.name} type="button" className="strike" onClick={() => onTell(row.name, `${row.formula}\nУрон ${row.damage}${row.traits ? `\nСвойства: ${row.traits}` : ""}`)}>
          <span>{row.name}</span>
          <b>{fmt(row.attack)}</b>
          <small>{row.damage}</small>
          <small>{row.traits}</small>
        </button>
      ))}
    </div>
  );
}

interface StrikeRow {
  name: string;
  attack: number;
  damage: string;
  traits: string;
  ranged: boolean;
  formula: string;
}

function strikeLines(character: Character, derived: ReturnType<typeof sheetDerived>, dnd: ReturnType<typeof sheetDnd>): StrikeRow[] {
  if (derived) {
    return derived.attacks.map((row) => ({
      name: row.name,
      attack: row.attack.value,
      damage: row.damage,
      traits: row.traits,
      ranged: row.ranged,
      formula: [row.attack.formula, ...row.attack.aside].join("\n"),
    }));
  }
  if (dnd) {
    return dnd.attacks.map((row) => ({
      name: row.name,
      attack: row.attack.value,
      damage: row.damage,
      traits: row.traits,
      ranged: row.ranged,
      formula: [row.attack.formula, ...row.attack.aside].join("\n"),
    }));
  }
  return character.items.filter((item) => item.kind === "weapon").map((item) => ({
    name: item.name,
    attack: 0,
    damage: item.weapon?.damage ?? "",
    traits: item.weapon?.traits ?? "",
    ranged: Boolean(item.weapon?.ranged),
    formula: item.notes ?? item.name,
  }));
}

function skillLines(character: Character, derived: ReturnType<typeof sheetDerived>, dnd: ReturnType<typeof sheetDnd>) {
  if (derived) {
    const known = new Set(PF_SKILLS.map((skill) => skill.id));
    const extra = Object.keys(derived.skills).filter((id) => !known.has(id)).slice(0, 2);
    return [...PF_SKILLS.map((skill) => skill.id), ...extra].map((id) => {
      const row = derived.skills[id];
      const named = PF_SKILLS.find((skill) => skill.id === id)?.name;
      const head = (row?.formula ?? id).split(" = ")[0] ?? id;
      const name = named ?? head.replace(/\s[+\u2212-]?\d+$/, "");
      return { id, name, ability: row?.ability ?? "int", value: row?.value ?? 0, rank: row?.rank ?? "untrained", formula: row?.formula ?? name };
    });
  }
  if (dnd) {
    return DND_SKILLS.map((skill) => {
      const row = dnd.skills[skill.id];
      const formula = row ? [row.formula, ...row.aside].filter(Boolean).join("\n") : skill.name;
      return { id: skill.id, name: skill.name, ability: skill.ability, value: row?.value ?? 0, rank: row?.rank ?? "untrained", formula };
    });
  }
  return skillRows(character).map((skill) => ({ id: skill.id, name: skill.name, ability: skill.ability, value: skill.mod, rank: skill.rank, formula: skill.info }));
}

function conditionSummary(character: Character): string {
  const names = new Map(conditionList(character.system).map((item) => [item.id, item.name]));
  const parts = Object.entries(character.conditionValues).filter(([, value]) => value > 0).map(([id, value]) => `${names.get(id) ?? id} ${value}`);
  const flags = character.conditions.filter((id) => (character.conditionValues[id] ?? 0) <= 0).map((id) => names.get(id) ?? id);
  return [...parts, ...flags].join(", ");
}

function rankShort(rank: string): string {
  if (rank === "trained") return "обучен";
  if (rank === "expert") return "эксперт";
  if (rank === "master") return "мастер";
  if (rank === "legendary") return "легенда";
  if (rank === "proficient") return "владеет";
  if (rank === "expertise") return "экспертиза";
  return "необучен";
}
