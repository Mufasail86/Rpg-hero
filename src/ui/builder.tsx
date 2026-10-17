import { useEffect, useMemo, useState } from "react";
import { VERSATILE } from "../data/versatile";
import { CALLINGS, COMPANIONS, englishName } from "../data/roster";
import { featChoices, featInfo } from "../data/pf-index";
import { rulesCatalog } from "../data/catalog";
import { ruSort } from "../sort";
import { PickList } from "./feat-picker";
import { EDITION_NAME, PACKS, editionsFor, filledEdition, resolveEdition, type RulesEdition } from "../data/editions";
import { ART, artSrc, portraitSrc } from "./art";
import { BACKGROUNDS as BG5, BACKGROUNDS_2014 as BG2014, CLASSES as CL5, GENERAL_FEATS, MASTERY, SKILLS as SK5, SPECIES, SPELLS as SP5, STANDARD_ARRAY } from "../data/dnd5e";
import { ANCESTRIES, BACKGROUNDS as BG2, CLASSES as CL2, SKILLS as SK2, SPELLS as SP2, TRADITION_NAME } from "../data/pf2e";
import {
  blankScoresFor,
  catalog,
  notedGear,
  classKey,
  createCharacter,
  creationMeters,
  fixedSkills,
  gearPreview,
  originAbilities,
  scoresOf,
  skillNeed,
  spellBudget,
  STEP_HINT,
  STEP_TITLE,
  stepsFor,
  STYLE_FEATS,
  SKILL_FEATS,
  ORIGIN_FEATS,
  validateStep,
} from "../create";
import { compressImage } from "../image";
import { PF_STANDARD, POINT_BUY_BUDGET, pointBuySpent, roll4d6 } from "../rules";
import { loadDraft, saveDraft } from "../storage";
import {
  ABILITIES,
  ABILITY_INFO,
  ABILITY_NAME,
  ABILITY_SHORT,
  type Ability,
  blankDraft,
  type Character,
  type Draft,
} from "../types";
import { GENERAL_FEAT_IDS, skillFeatBlock } from "../pf2e/eligibility";
import { systemTitle } from "../labels";
import { Choice, go, Info, money } from "./common";
import { Advise, classHint, FillButton, orderedIds, reasonFor, StepExplain } from "./beginner";
import { ancestryAdvice, backgroundAdvice, featAdvice, recommendedBoosts, spellAdvice } from "../beginner";

const ORDER5 = {
  cleric: [
    {
      id: "protector",
      name: "Защитник",
      short: "Жрец в тяжёлом доспехе и с воинским оружием, число заклинаний то же.",
      info: "Божественный порядок защитника. Вы владеете воинским оружием и тяжёлыми доспехами. Число заговоров и подготовленных заклинаний остаётся таким же, как у обычного жреца: порядок не отнимает магию ради брони. На старте это выбор вместо чудотворца, не вместо домена.",
    },
    {
      id: "thaumaturge",
      name: "Чудотворец",
      short: "Лишний заговор жреца и навык Магия, доспех не тяжелее среднего.",
      info: "Божественный порядок чудотворца. Вы знаете ещё один заговор из списка жреца и владеете навыком Магия. Доспехи остаются лёгкими и средними, тяжёлых порядок не даёт. Заклинаний 1-го круга от этого выбора не прибавляется.",
    },
  ],
  druid: [
    {
      id: "magician",
      name: "Маг",
      short: "Лишний заговор друида. Доспех остаётся лёгким.",
      info: "Первозданный порядок мага. Вы знаете ещё один заговор из списка друида. Владение доспехами остаётся лёгким, средние и тяжёлые этот порядок не открывает. Оружие тоже не расширяется до всего воинского списка.",
    },
    {
      id: "warden",
      name: "Страж",
      short: "Воинское оружие и средние доспехи вместо лишнего заговора.",
      info: "Первозданный порядок стража. Вы владеете воинским оружием и средними доспехами. Лишнего заговора, как у мага, нет. Тяжёлые доспехи порядок не даёт. Металл в ремастере тут ни при чём: это порядок правил 2024 года.",
    },
  ],
};

export function Builder({ onDone }: { onDone: (character: Character) => void }) {
  const [draft, setDraft] = useState<Draft>(() => loadDraft() ?? blankDraft());
  const [stepIndex, setStepIndex] = useState(0);
  const [finishError, setFinishError] = useState("");
  const steps = stepsFor(draft);
  const index = Math.min(stepIndex, steps.length - 1);
  const step = steps[index];
  const error = validateStep(draft, step);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  function update(partial: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function setChoice(key: string, value: string) {
    setDraft((prev) => ({ ...prev, choices: { ...prev.choices, [key]: value } }));
  }

  function toggleMulti(key: string, id: string, max: number) {
    setDraft((prev) => {
      const current = prev.multi[key] ?? [];
      const next = current.includes(id) ? current.filter((item) => item !== id) : current.length >= max ? current : [...current, id];
      return { ...prev, multi: { ...prev.multi, [key]: next } };
    });
  }

  function chooseSystem(system: "dnd5e" | "pf2e") {
    if (draft.system === system) return;
    const next = blankDraft();
    next.system = system;
    next.edition = system === "dnd5e" ? "dnd-2024" : "pf-remaster";
    next.name = draft.name;
    setDraft(next);
    setStepIndex(0);
  }

  function chooseEdition(edition: RulesEdition) {
    if (!draft.system || resolveEdition(draft.system, draft.edition) === edition) return;
    const next = blankDraft();
    next.system = draft.system;
    next.edition = edition;
    next.name = draft.name;
    setDraft(next);
  }

  function goNext() {
    if (error) return;
    if (index >= steps.length - 1) return;
    setStepIndex(index + 1);
  }

  function finish() {
    const made = createCharacter(draft);
    if (!made.ok) {
      setFinishError(made.error);
      return;
    }
    made.character.readiness = "built";
    saveDraft(null);
    onDone(made.character);
  }

  function keepDraft() {
    const made = createCharacter(draft);
    if (!made.ok) {
      setFinishError("Черновик шагов остаётся в браузере. Лист появится, когда обязательные выборы закрыты. Это не проверенный лист.");
      return;
    }
    made.character.readiness = "draft";
    saveDraft(null);
    onDone(made.character);
  }

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="На главную" onClick={() => go("#/")}>
          ←
        </button>
        <div className="grow">
          <h1>{STEP_TITLE[step]}</h1>
          <div className="tiny">
            Шаг {index + 1} из {steps.length}. {STEP_HINT[step]}
          </div>
        </div>
      </header>
      <div className="progress" style={{ margin: "0 16px" }}>
        <i style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
      </div>
      <main className="screen pad-dock stack">
        <StepExplain step={step} />
        {(step === "abilities" || step === "skills" || step === "feats" || step === "spells" || step === "gear") && (
          <FillButton draft={draft} step={step} onFill={update} />
        )}
        {step === "system" && (
          <SystemStep
            system={draft.system}
            edition={draft.system ? resolveEdition(draft.system, draft.edition) : ""}
            onPick={chooseSystem}
            onEdition={chooseEdition}
          />
        )}
        {step === "name" && (
          <label className="field">
            <span>Как зовут героя</span>
            <input data-testid="character-name" value={draft.name} autoComplete="off" onChange={(event) => update({ name: event.target.value })} />
          </label>
        )}
        {step === "ancestry" && <AncestryStep draft={draft} update={update} setChoice={setChoice} toggleMulti={toggleMulti} />}
        {step === "background" && <BackgroundStep draft={draft} update={update} setChoice={setChoice} />}
        {step === "class" && <ClassStep draft={draft} update={update} setChoice={setChoice} />}
        {step === "abilities" && <AbilityStep draft={draft} update={update} setChoice={setChoice} toggleMulti={toggleMulti} />}
        {step === "skills" && <SkillStep draft={draft} toggleMulti={toggleMulti} />}
        {step === "feats" && <FeatStep draft={draft} update={update} setChoice={setChoice} toggleMulti={toggleMulti} />}
        {step === "gear" && <GearStep draft={draft} update={update} />}
        {step === "spells" && <SpellStep draft={draft} update={update} />}
        {(step === "abilities" || step === "skills" || step === "feats" || step === "spells") && <Meters draft={draft} />}
        {step === "review" && <ReviewStep draft={draft} update={update} error={finishError} />}
        {error && step !== "review" && (
          <p className="warn" data-testid="step-error">
            {error}
          </p>
        )}
      </main>
      <div className="dock">
        <button type="button" className="btn" data-testid="back" onClick={() => (index === 0 ? go("#/") : setStepIndex(index - 1))}>
          Назад
        </button>
        {step === "review" ? (
          <>
            <button type="button" className="btn" data-testid="save-draft" onClick={keepDraft}>
              Черновик
            </button>
            <button type="button" className="btn primary" data-testid="finish" disabled={Boolean(error)} onClick={finish}>
              Создать лист
            </button>
          </>
        ) : (
          <button type="button" className="btn primary" data-testid="next" disabled={Boolean(error)} onClick={goNext}>
            Дальше
          </button>
        )}
      </div>
    </div>
  );
}

function SystemStep({
  system,
  edition,
  onPick,
  onEdition,
}: {
  system: Draft["system"];
  edition: RulesEdition | "";
  onPick: (system: "dnd5e" | "pf2e") => void;
  onEdition: (edition: RulesEdition) => void;
}) {
  return (
    <>
      <figure className="figure-card">
        <img src={artSrc(ART.castle)} alt="Ночной замок, свой рисунок" />
      </figure>
      <p className="lead">Выберите игру и редакцию. Дальше шаги идут по порядку: имя, народ, происхождение, класс, числа, навыки, черты, вещи.</p>
      <p className="tiny">Характеристика, навык, черта и владение — разные слова. <Info title="Как читать лист" text="Характеристика — Сила, Ловкость, Телосложение, Интеллект, Мудрость или Харизма. Навык — подготовка в одном деле. Черта — отдельное правило. Владение — бонус за обучение. Если на листе уже +7, к кости к20 прибавьте только 7. к20 — двадцатигранная кость, 2к6 — две шестигранные. СЛ — сложность, КБ — защита, ПЗ — здоровье. КБ и СЛ сами не бросают." /></p>
      <Choice
        id="dnd5e"
        testId="system-dnd5e"
        name="D&D"
        hint="открытый справочник, две редакции отдельно"
        info="Кость к20, модификатор характеристики, бонус мастерства и преимущество или помеха. Справочник 5.2, правила 2024 года, и справочник 5.1, правила 2014 года, лежат отдельно. Конструктор считает лист по правилам 2024 года и не подставляет список 2014 года."
        on={system === "dnd5e"}
        onPick={() => onPick("dnd5e")}
      />
      <Choice
        id="pf2e"
        testId="system-pf2e"
        name="Pathfinder"
        hint="ремастер и отдельно правила до него"
        info={`Три действия в ход, четыре ступени успеха и владение от необученного до легенды. В конструкторе ${ANCESTRIES.length} народов и ${CL2.length} классов ремастера. Правила до ремастера — другой пакет и другая лицензия, их сюда не подмешивают. Предания мира — на своём экране, не в правилах.`}
        on={system === "pf2e"}
        onPick={() => onPick("pf2e")}
      />
      {system && (
        <>
          <p className="kicker">Редакция</p>
          <div className="seg" role="group" aria-label="Редакция">
            {editionsFor(system).map((id) => (
              <button key={id} type="button" className={`pill ${edition === id ? "on" : ""}`} aria-pressed={edition === id} data-testid={`edition-${id}`} onClick={() => onEdition(id)}>
                {EDITION_NAME[id]}
              </button>
            ))}
          </div>
          {edition && !filledEdition(edition) && <p className="tiny">{edition === "pf-legacy" ? "Карточки до ремастера лежат в справочнике. Конструктор их в расчёт не подставляет, чтобы не смешать с ремастером." : "Народы и классы 2014 года в расчёт не входят. Происхождение справочника 5.1 выбирается отдельно и с правилами 2024 года не смешивается."}</p>}
          {edition && <BookLine edition={edition} />}
        </>
      )}
    </>
  );
}

function BookLine({ edition }: { edition: RulesEdition }) {
  const books = PACKS.filter((pack) => pack.edition === edition);
  return (
    <p className="tiny" data-testid="book-count">
      Книг этой редакции: {books.length}. {books.map((pack) => pack.title).join(" · ") || "Список пуст."}
    </p>
  );
}

function Meters({ draft }: { draft: Draft }) {
  const rows = creationMeters(draft);
  if (!rows.length) return null;
  return (
    <div className="chips" data-testid="choice-meters">
      {rows.map((row) => (
        <span key={row.id} className={`chip ${row.have === row.need ? "on" : ""}`} data-testid={`meter-${row.id}`}>
          {row.label}: {row.have} из {row.need}
        </span>
      ))}
    </div>
  );
}

function UnfilledNote({ edition }: { edition: RulesEdition }) {
  const text = edition === "dnd-2014"
    ? "Правила 2014 года лежат в справочнике отдельно. Конструктор их в расчёт не подставляет, чтобы не смешать с правилами 2024 года. Здесь можно завести свою запись."
    : "Правила до ремастера лежат в справочнике отдельным пакетом. Конструктор этот список в расчёт не подставляет, чтобы не смешать с ремастером. Здесь можно завести свою запись.";
  return (
    <p className="lead" data-testid="edition-empty">
      {text}
    </p>
  );
}

function AncestryStep({
  draft,
  update,
  setChoice,
  toggleMulti,
}: {
  draft: Draft;
  update: (partial: Partial<Draft>) => void;
  setChoice: (key: string, value: string) => void;
  toggleMulti: (key: string, id: string, max: number) => void;
}) {
  if (draft.system === "dnd5e") {
    const edition = resolveEdition("dnd5e", draft.edition);
    if (!filledEdition(edition)) {
      return (
        <>
          <UnfilledNote edition={edition} />
          <Choice id="custom" name="Своя запись" hint="Народ, которого нет в открытом справочнике" info="Вы сами пишете название, скорость и размер. Прибавки к характеристикам всё равно даёт происхождение, как в правилах 2024 года." on={draft.ancestryId === "custom"} onPick={() => update({ ancestryId: "custom" })} />
          {draft.ancestryId === "custom" && <CustomAncestry draft={draft} update={update} speedLabel="Скорость, футы" />}
        </>
      );
    }
    const species = SPECIES.find((item) => item.id === draft.ancestryId);
    const people = ruSort(SPECIES, (item) => item.name);
    const advised = new Set(ancestryAdvice("dnd5e").map((item) => item.id));
    return (
      <>
        <p className="kicker">Советуем новичку</p>
        {people.filter((item) => advised.has(item.id)).map((item) => (
          <Choice key={`top-${item.id}`} id={item.id} name={item.name} hint={item.hint} reason={reasonFor("ancestry", "dnd5e", item.id)} info={item.info} short={item.short} art={portraitSrc(item.id) ?? undefined} on={draft.ancestryId === item.id} onPick={() => update({ ancestryId: item.id, choices: { ...draft.choices, lineage: "", lineageAbility: "", elfSkill: "", size: "" } })} />
        ))}
        <p className="kicker">Все народы</p>
        {people.filter((item) => !advised.has(item.id)).map((item) => (
          <Choice key={item.id} id={item.id} name={item.name} hint={item.hint} info={item.info} short={item.short} art={portraitSrc(item.id) ?? undefined} on={draft.ancestryId === item.id} onPick={() => update({ ancestryId: item.id, choices: { ...draft.choices, lineage: "", lineageAbility: "", elfSkill: "", size: "" } })} />
        ))}
        <Choice id="custom" name="Своя запись" hint="Народ, которого нет в открытом справочнике" info="Вы сами пишете название, скорость и размер. Прибавки к характеристикам всё равно даёт происхождение, как в правилах 2024 года." on={draft.ancestryId === "custom"} onPick={() => update({ ancestryId: "custom" })} />
        {species?.lineage && (
          <>
            <p className="kicker">Наследие</p>
            {species.lineage.map((item) => (
              <Choice key={item.id} id={item.id} name={item.name} hint={item.hint} info={item.info} short={item.short} on={draft.choices.lineage === item.id} onPick={() => setChoice("lineage", item.id)} />
            ))}
          </>
        )}
        {species && species.id !== "dragonborn" && species.id !== "goliath" && species.lineage && (
          <AbilityRow label="Характеристика заклинаний наследия" value={draft.choices.lineageAbility ?? ""} allowed={["int", "wis", "cha"]} onPick={(ability) => setChoice("lineageAbility", ability)} />
        )}
        {species?.sizeChoice && (
          <div className="seg">
            {["Средний", "Малый"].map((size) => (
              <button key={size} type="button" className={`pill ${draft.choices.size === size ? "on" : ""}`} data-testid={`opt-size-${size}`} onClick={() => setChoice("size", size)}>
                {size}
              </button>
            ))}
          </div>
        )}
        {species?.skillChoice && (
          <>
            <p className="kicker">Острые чувства</p>
            {species.skillChoice.map((id) => {
              const skill = SK5.find((item) => item.id === id);
              return skill ? <Choice key={id} id={id} name={skill.name} info={skill.info} short={skill.short} on={draft.choices.elfSkill === id} onPick={() => setChoice("elfSkill", id)} /> : null;
            })}
          </>
        )}
        {species?.originFeat && (
          <>
            <p className="kicker">Навык человека</p>
            {SK5.map((skill) => (
              <Choice key={skill.id} id={`human-${skill.id}`} name={skill.name} hint={ABILITY_SHORT[skill.ability]} info={skill.info} short={skill.short} on={draft.choices.humanSkill === skill.id} onPick={() => setChoice("humanSkill", skill.id)} />
            ))}
          </>
        )}
        {draft.ancestryId === "custom" && <CustomAncestry draft={draft} update={update} speedLabel="Скорость, футы" />}
      </>
    );
  }

  const edition = resolveEdition("pf2e", draft.edition);
  if (!filledEdition(edition)) {
    return (
      <>
        <UnfilledNote edition={edition} />
        <Choice id="custom" name="Своя запись" hint="Свой народ" info="Название, хиты народа, скорость и размер. Два свободных повышения без изъяна задаются на шаге характеристик." on={draft.ancestryId === "custom"} onPick={() => update({ ancestryId: "custom", heritageId: "custom", choices: { ...draft.choices, ancestryMode: "free" } })} />
        {draft.ancestryId === "custom" && <CustomAncestry draft={draft} update={update} speedLabel="Скорость, футы" />}
      </>
    );
  }

  const ancestry = ANCESTRIES.find((item) => item.id === draft.ancestryId);
  const free = !ancestry || ancestry.boosts.length === 0 || draft.choices.ancestryMode === "free" || draft.ancestryId === "custom";
  const people = ruSort(ANCESTRIES, (item) => item.name);
  const advised = new Set(ancestryAdvice("pf2e").map((item) => item.id));
  return (
    <div data-testid="ancestry-list">
      <p className="kicker">Советуем новичку</p>
      {people.filter((item) => advised.has(item.id)).map((item) => (
        <Choice key={`top-${item.id}`} id={item.id} name={item.name} hint={item.hint} reason={reasonFor("ancestry", "pf2e", item.id)} english={englishName(item.id)} info={item.info} short={item.short} art={portraitSrc(item.id) ?? undefined} on={draft.ancestryId === item.id} onPick={() => update({ ancestryId: item.id, heritageId: "", choices: { ...draft.choices, ancestryMode: item.boosts.length ? "listed" : "free", ancFree: "" } })} />
      ))}
      <p className="kicker">Все народы</p>
      {people.filter((item) => !advised.has(item.id)).map((item) => (
        <Choice key={item.id} id={item.id} name={item.name} hint={item.hint} english={englishName(item.id)} info={item.info} short={item.short} art={portraitSrc(item.id) ?? undefined} on={draft.ancestryId === item.id} onPick={() => update({ ancestryId: item.id, heritageId: "", choices: { ...draft.choices, ancestryMode: item.boosts.length ? "listed" : "free", ancFree: "" } })} />
      ))}
      <Choice id="custom" name="Своя запись" hint="Свой народ" info="Название, хиты народа, скорость и размер. Два свободных повышения без изъяна задаются на шаге характеристик." on={draft.ancestryId === "custom"} onPick={() => update({ ancestryId: "custom", heritageId: "custom", choices: { ...draft.choices, ancestryMode: "free" } })} />
      {ancestry && (
        <>
          <p className="kicker">Наследие</p>
          {ancestry.heritages.map((item) => (
            <Choice key={item.id} id={item.id} name={item.name} info={item.info} short={item.short} on={draft.heritageId === item.id} onPick={() => update({ heritageId: item.id })} />
          ))}
          {ancestry.boosts.length > 0 && (
            <div className="seg">
              <button type="button" className={`pill ${draft.choices.ancestryMode !== "free" ? "on" : ""}`} onClick={() => setChoice("ancestryMode", "listed")}>
                Повышения из списка
              </button>
              <button type="button" className={`pill ${draft.choices.ancestryMode === "free" ? "on" : ""}`} onClick={() => setChoice("ancestryMode", "free")}>
                Два свободных, без изъяна
              </button>
            </div>
          )}
          {!free && (
            <AbilityRow label="Свободное повышение народа" value={draft.choices.ancFree ?? ""} blocked={ancestry.boosts} onPick={(ability) => setChoice("ancFree", ability)} />
          )}
          {free && draft.ancestryId !== "custom" && (
            <MultiAbilities group="anc" label="Два свободных повышения" picked={draft.multi.ancestryBoosts ?? []} max={2} onToggle={(ability) => toggleMulti("ancestryBoosts", ability, 2)} />
          )}
          <p className="kicker">Универсальное наследие</p>
          <p className="tiny">Оно складывается с народом и обычным наследием и не заменяет их. Наследие гнома «Сумеречный» — это тёмное зрение, сюда оно не подставляется.</p>
          <Choice id="versatile-none" name="Без универсального наследия" info="Народ и его обычное наследие остаются единственными. Универсальный слой не выбран." on={draft.versatileHeritageId === ""} onPick={() => update({ versatileHeritageId: "" })} />
          {VERSATILE.length === 0 && <p data-testid="versatile-empty">В открытых книгах ремастера, которые уже заведены, универсальных наследий ещё нет. Выбрать нечего, и чужой список не подмешивается.</p>}
          {ruSort(VERSATILE, (item) => item.name).map((item) => (
            <Choice key={item.id} id={item.id} name={item.name} hint={item.originalName} info={item.info} short={item.short} on={draft.versatileHeritageId === item.id} onPick={() => update({ versatileHeritageId: item.id })} />
          ))}
          {draft.heritageId === "skilled" && (
            <>
              <p className="kicker">Навык умелого наследия</p>
              {SK2.map((skill) => (
                <Choice key={skill.id} id={`h2-${skill.id}`} name={skill.name} info={skill.info} short={skill.short} on={draft.choices.humanSkill === skill.id} onPick={() => setChoice("humanSkill", skill.id)} />
              ))}
            </>
          )}
        </>
      )}
      {draft.ancestryId === "custom" && <CustomAncestry draft={draft} update={update} speedLabel="Скорость, футы" />}
    </div>
  );
}

function CustomAncestry({ draft, update, speedLabel }: { draft: Draft; update: (partial: Partial<Draft>) => void; speedLabel: string }) {
  const custom = draft.customAncestry;
  function set(key: keyof Draft["customAncestry"], value: string) {
    update({ customAncestry: { ...custom, [key]: value } });
  }
  return (
    <div className="card stack">
      <label className="field"><span>Название</span><input value={custom.name} onChange={(event) => set("name", event.target.value)} /></label>
      <label className="field"><span>{speedLabel}</span><input inputMode="numeric" value={custom.speed} onChange={(event) => set("speed", event.target.value)} /></label>
      <label className="field"><span>Размер</span><input value={custom.size} onChange={(event) => set("size", event.target.value)} /></label>
      {draft.system === "pf2e" && <label className="field"><span>Хиты народа</span><input inputMode="numeric" value={custom.hp} onChange={(event) => set("hp", event.target.value)} /></label>}
      <label className="field"><span>Как это работает</span><textarea value={custom.info} onChange={(event) => set("info", event.target.value)} /></label>
    </div>
  );
}

function BackgroundStep({ draft, update, setChoice }: { draft: Draft; update: (partial: Partial<Draft>) => void; setChoice: (key: string, value: string) => void }) {
  const edition = draft.system ? resolveEdition(draft.system, draft.edition) : "dnd-2024";
  const legacyDnd = edition === "dnd-2014";
  const unfilled = Boolean(draft.system && !filledEdition(edition) && !legacyDnd);
  const source = draft.system === "pf2e" ? BG2 : legacyDnd ? BG2014 : BG5;
  const list = unfilled ? [] : [...source].sort((left, right) => left.name.localeCompare(right.name, "ru") || left.id.localeCompare(right.id));
  const picked = draft.system === "pf2e" ? BG2.find((item) => item.id === draft.backgroundId) : undefined;
  const skillOptions = picked?.skillChoices.includes("*") ? SK2.map((skill) => skill.id) : picked?.skillChoices ?? [];
  const game = draft.system === "dnd5e" ? "dnd5e" : "pf2e";
  const advice = backgroundAdvice(game);
  const advised = new Set(advice.map((item) => item.id));
  return (
    <>
      {legacyDnd && <p className="lead">В справочнике 5.1 одно происхождение. Классы 2014 года в расчёт не входят и с правилами 2024 года не смешиваются.</p>}
      {unfilled && <UnfilledNote edition={edition} />}
      <p className="kicker">Советуем новичку</p>
      {list.filter((item) => advised.has(item.id)).map((item) => (
        <Choice key={`top-${item.id}`} id={item.id} name={item.name} hint={item.hint} reason={reasonFor("background", game, item.id)} english={"originalName" in item ? item.originalName : undefined} info={item.info} short={item.short} on={draft.backgroundId === item.id} onPick={() => update({ backgroundId: item.id, choices: { ...draft.choices, bgSkill: "", bgFeat: "", bgCraft: "" } })} />
      ))}
      <p className="kicker">Все происхождения</p>
      {list.filter((item) => !advised.has(item.id)).map((item) => (
        <Choice key={item.id} id={item.id} name={item.name} hint={item.hint} english={"originalName" in item ? item.originalName : undefined} info={item.info} short={item.short} on={draft.backgroundId === item.id} onPick={() => update({ backgroundId: item.id, choices: { ...draft.choices, bgSkill: "", bgFeat: "", bgCraft: "" } })} />
      ))}
      {picked && skillOptions.length > 0 && (
        <>
          <p className="kicker">Навык происхождения</p>
          {skillOptions.map((id) => {
            const skill = SK2.find((item) => item.id === id);
            return skill ? <Choice key={id} id={`bg-skill-${id}`} name={skill.name} info={skill.info} short={skill.short} on={draft.choices.bgSkill === id} onPick={() => setChoice("bgSkill", id)} /> : null;
          })}
        </>
      )}
      {picked && picked.featChoices.length > 0 && (
        <>
          <p className="kicker">Черта происхождения</p>
          {picked.featChoices.map((feat) => (
            <Choice key={feat.id} id={`bg-feat-${feat.id}`} name={feat.name} info="Одна черта из поля происхождения. Если у неё нет отдельного числа, лист его не выдумывает." on={draft.choices.bgFeat === feat.id} onPick={() => setChoice("bgFeat", feat.id)} />
          ))}
        </>
      )}
      {picked && picked.craftChoices.length > 0 && (
        <>
          <p className="kicker">Специальность ремесла</p>
          {picked.craftChoices.map((craft) => (
            <Choice key={craft.id} id={`bg-craft-${craft.id}`} name={craft.name} info="Узкое ремесло записывает эту специальность. Цену изделия лист сам не меняет." on={draft.choices.bgCraft === craft.id} onPick={() => setChoice("bgCraft", craft.id)} />
          ))}
        </>
      )}
      <Choice id="custom" name="Своя запись" info="Своё происхождение. Для правил 2024 года укажите три характеристики, если хотите прибавки +2/+1 или +1 трижды. Для ремастера — две характеристики и навык." on={draft.backgroundId === "custom"} onPick={() => update({ backgroundId: "custom" })} />
      {draft.backgroundId === "custom" && draft.system === "dnd5e" && (
        <div className="card stack">
          <label className="field"><span>Название</span><input value={draft.customBackground.name} onChange={(event) => update({ customBackground: { ...draft.customBackground, name: event.target.value } })} /></label>
          <button type="button" className={`pill ${draft.choices.noBoost === "yes" ? "on" : ""}`} onClick={() => setChoice("noBoost", draft.choices.noBoost === "yes" ? "" : "yes")}>
            Без прибавок к характеристикам
          </button>
          {draft.choices.noBoost !== "yes" && (
            <>
              <AbilityRow label="Первая" value={draft.choices.cba ?? ""} onPick={(ability) => setChoice("cba", ability)} />
              <AbilityRow label="Вторая" value={draft.choices.cbb ?? ""} onPick={(ability) => setChoice("cbb", ability)} />
              <AbilityRow label="Третья" value={draft.choices.cbc ?? ""} onPick={(ability) => setChoice("cbc", ability)} />
            </>
          )}
          <label className="field"><span>Описание</span><textarea value={draft.customBackground.info} onChange={(event) => update({ customBackground: { ...draft.customBackground, info: event.target.value } })} /></label>
        </div>
      )}
      {draft.backgroundId === "custom" && draft.system === "pf2e" && (
        <div className="card stack">
          <label className="field"><span>Название</span><input value={draft.customBackground.name} onChange={(event) => update({ customBackground: { ...draft.customBackground, name: event.target.value } })} /></label>
          <AbilityRow label="Первая характеристика" value={draft.choices.cba ?? ""} onPick={(ability) => setChoice("cba", ability)} />
          <AbilityRow label="Вторая характеристика" value={draft.choices.cbb ?? ""} onPick={(ability) => setChoice("cbb", ability)} />
          {!unfilled && (
            <>
              <p className="kicker">Навык</p>
              {SK2.map((skill) => (
                <Choice key={skill.id} id={`bg-${skill.id}`} name={skill.name} info={skill.info} short={skill.short} on={draft.choices.customSkill === skill.id} onPick={() => setChoice("customSkill", skill.id)} />
              ))}
            </>
          )}
          <label className="field"><span>Описание</span><textarea value={draft.customBackground.info} onChange={(event) => update({ customBackground: { ...draft.customBackground, info: event.target.value } })} /></label>
        </div>
      )}
    </>
  );
}

function ClassStep({ draft, update, setChoice }: { draft: Draft; update: (partial: Partial<Draft>) => void; setChoice: (key: string, value: string) => void }) {
  const edition = draft.system ? resolveEdition(draft.system, draft.edition) : "dnd-2024";
  if (draft.system && !filledEdition(edition)) {
    return (
      <>
        <UnfilledNote edition={edition} />
        <CustomClassCard draft={draft} update={update} />
      </>
    );
  }
  if (draft.system === "dnd5e") {
    const orders = ORDER5[draft.classId as keyof typeof ORDER5];
    const sorted = ruSort(CL5, (item) => item.name);
    const { top, rest } = orderedIds("dnd5e", sorted.map((item) => item.id));
    const byId = new Map(sorted.map((item) => [item.id, item]));
    function card(id: string, recommended: boolean) {
      const item = byId.get(id);
      if (!item) return null;
      return (
        <Choice key={id} id={item.id} name={item.name} hint={classHint("dnd5e", item.id, `${item.hint} · ${item.subclass.name}`)} info={`${item.info} Подкласс справочника: ${item.subclass.name}. ${item.subclass.info}`} short={item.short} on={draft.classId === item.id} onPick={() => update({ classId: item.id, gearMode: "", knownSpells: [], preparedSpells: [], multi: { ...draft.multi, skills: [], mastery: [], expertise: [] } })} testId={recommended ? `advise-${item.id}` : undefined} />
      );
    }
    return (
      <>
        <div data-testid="class-list">
          <p className="kicker">Советуем новичку</p>
          {top.map((id) => card(id, true))}
          <p className="kicker">Все классы</p>
          {rest.map((id) => card(id, false))}
        </div>
        <CustomClassCard draft={draft} update={update} />
        {orders && (
          <>
            <p className="kicker">Порядок</p>
            {orders.map((item) => (
              <Choice key={item.id} id={item.id} name={item.name} info={item.info} short={item.short} on={draft.choices.order === item.id} onPick={() => setChoice("order", item.id)} />
            ))}
          </>
        )}
      </>
    );
  }
  const cls = CL2.find((item) => item.id === draft.classId);
  const sorted = ruSort(CL2, (item) => item.name);
  const { top, rest } = orderedIds("pf2e", sorted.map((item) => item.id));
  const byId = new Map(sorted.map((item) => [item.id, item]));
  function card(id: string, recommended: boolean) {
    const item = byId.get(id);
    if (!item) return null;
    return (
      <Choice key={id} id={item.id} name={item.name} hint={classHint("pf2e", item.id, item.hint ?? "")} english={englishName(item.id)} info={item.info} short={item.short} on={draft.classId === item.id} onPick={() => update({ classId: item.id, gearMode: "", knownSpells: [], preparedSpells: [], multi: { ...draft.multi, skills: [] } })} testId={recommended ? `advise-${item.id}` : undefined} />
    );
  }
  return (
    <>
      <div data-testid="class-list">
        <p className="kicker">Советуем новичку</p>
        {top.map((id) => card(id, true))}
        <p className="kicker">Все классы</p>
        {rest.map((id) => card(id, false))}
      </div>
      <CustomClassCard draft={draft} update={update} />
      {cls?.choices.map((choice) => (
        <div key={choice.id} className="stack">
          <p className="kicker">{choice.title}</p>
          {choice.options.map((item) => (
            <Choice key={item.id} id={`${choice.id}-${item.id}`} name={item.name} hint={item.hint} info={item.info} short={item.short} on={draft.choices[choice.id] === item.id} onPick={() => setChoice(choice.id, item.id)} />
          ))}
        </div>
      ))}
      {cls?.id === "fighter" && (
        <>
          <p className="kicker">Навык воина</p>
          {["acrobatics", "athletics"].map((id) => {
            const skill = SK2.find((item) => item.id === id);
            return skill ? <Choice key={id} id={`fight-${id}`} name={skill.name} info={skill.info} short={skill.short} on={draft.choices.fighterSkill === id} onPick={() => setChoice("fighterSkill", id)} /> : null;
          })}
        </>
      )}
      {cls?.id === "cleric" && (draft.choices.deity === "knowledge" || draft.choices.deity === "secret") && (
        <>
          <p className="kicker">Навык покровителя</p>
          {SK2.map((skill) => (
            <Choice key={skill.id} id={`deity-${skill.id}`} name={skill.name} info={skill.info} short={skill.short} on={draft.choices.deitySkill === skill.id} onPick={() => setChoice("deitySkill", skill.id)} />
          ))}
        </>
      )}
      {(draft.choices.racket === "ruffian" || draft.choices.racket === "scoundrel") && (
        <AbilityRow label="Ключ плута вместо Ловкости" value={draft.choices.rogueKey ?? ""} allowed={draft.choices.racket === "ruffian" ? ["str", "dex"] : ["cha", "dex"]} onPick={(ability) => setChoice("rogueKey", ability)} />
      )}
      {cls && cls.key.length > 1 && (
        <AbilityRow label="Ключ класса" value={draft.choices.key ?? ""} allowed={cls.key} onPick={(ability) => setChoice("key", ability)} />
      )}
      <PickList
        title="Звериные спутники, фамильяры и спутники"
        testId="companion-picker"
        rows={ruSort(COMPANIONS, (item) => item.name).map((item) => ({ id: item.id, name: item.name, info: item.info, hint: item.title }))}
        selected={draft.choices.companion ?? ""}
        onPick={(row) => setChoice("companion", row.id)}
        note="Список снят с полей ORC. Отдельные блоки животных в выгрузке не лежат, поэтому порода не выдумана."
      />
      <PickList
        title="Мифические призвания"
        testId="calling-picker"
        rows={ruSort(CALLINGS, (item) => item.name).map((item) => ({ id: item.id, name: item.name, info: item.info }))}
        selected={draft.choices.calling ?? ""}
        onPick={(row) => setChoice("calling", row.id)}
      />
    </>
  );
}

function CustomClassCard({ draft, update }: { draft: Draft; update: (partial: Partial<Draft>) => void }) {
  const custom = draft.customClass;
  return (
    <>
      <Choice id="custom" name="Своя запись" info="Свой класс: кость хитов или хиты класса, ключевая характеристика и есть ли заклинания." on={draft.classId === "custom"} onPick={() => update({ classId: "custom" })} />
      {draft.classId === "custom" && (
        <div className="card stack">
          <label className="field"><span>Название</span><input value={custom.name} onChange={(event) => update({ customClass: { ...custom, name: event.target.value } })} /></label>
          <label className="field"><span>{draft.system === "pf2e" ? "Хиты класса" : "Кость хитов"}</span><input inputMode="numeric" value={draft.system === "pf2e" ? custom.hp : custom.hit} onChange={(event) => update({ customClass: { ...custom, [draft.system === "pf2e" ? "hp" : "hit"]: event.target.value } })} /></label>
          <AbilityRow label="Ключевая характеристика" value={custom.key} onPick={(ability) => update({ customClass: { ...custom, key: ability } })} />
          <label className="field">
            <span>Заклинания</span>
            <select value={custom.caster} onChange={(event) => update({ customClass: { ...custom, caster: event.target.value } })}>
              <option value="none">Нет</option>
              <option value="prepared">Подготовленные</option>
              <option value="known">Известные</option>
              <option value="book">Книга</option>
              <option value="pact">Пакт</option>
            </select>
          </label>
          <label className="field"><span>Описание</span><textarea value={custom.info} onChange={(event) => update({ customClass: { ...custom, info: event.target.value } })} /></label>
        </div>
      )}
    </>
  );
}

function AbilityStep({
  draft,
  update,
  setChoice,
  toggleMulti,
}: {
  draft: Draft;
  update: (partial: Partial<Draft>) => void;
  setChoice: (key: string, value: string) => void;
  toggleMulti: (key: string, id: string, max: number) => void;
}) {
  const method = draft.choices.abilityMethod ?? "";
  const scored = scoresOf(draft);
  function methodOf(next: string) {
    if (!draft.system) return;
    update({
      choices: { ...draft.choices, abilityMethod: next },
      scores: blankScoresFor(next, draft.system),
      pool: [],
    });
  }
  return (
    <>
      <div className="row-between">
        <p className="kicker">Способ</p>
        <Info title="Характеристики" text={draft.system === "dnd5e" ? "Покупка тратит 27 очков, значения 8–15. Стандартный набор — 15, 14, 13, 12, 10, 8. Бросок — 4d6, меньшая кость отбрасывается. Потом происхождение даёт +2 и +1 или +1 трём своим характеристикам." : "Официальный путь — повышения: старт 10, повышение даёт +2, а если значение уже 18 или выше — только +1. Есть народ, происхождение, ключ класса и четыре свободных. Набор 18, 14, 14, 12, 10, 10 — договорённость стола, не правило книги. Бросок 4d6 тоже помечайте как правило стола."} />
      </div>
      {draft.system === "dnd5e" ? (
        <div className="seg">
          <button type="button" className={`pill ${method === "pointbuy" ? "on" : ""}`} data-testid="method-pointbuy" onClick={() => methodOf("pointbuy")}>Покупка</button>
          <button type="button" className={`pill ${method === "standard" ? "on" : ""}`} data-testid="method-standard" onClick={() => methodOf("standard")}>Набор</button>
          <button type="button" className={`pill ${method === "roll" ? "on" : ""}`} data-testid="method-roll" onClick={() => methodOf("roll")}>Бросок</button>
        </div>
      ) : (
        <div className="seg">
          <button type="button" className={`pill ${method === "boost" ? "on" : ""}`} data-testid="method-boost" onClick={() => methodOf("boost")}>Повышения</button>
          <button type="button" className={`pill ${method === "standard" ? "on" : ""}`} data-testid="method-standard" onClick={() => methodOf("standard")}>Набор</button>
          <button type="button" className={`pill ${method === "roll" ? "on" : ""}`} data-testid="method-roll" onClick={() => methodOf("roll")}>Бросок</button>
        </div>
      )}
      {method === "pointbuy" && <PointBuy draft={draft} update={update} />}
      {(method === "standard" || method === "roll") && <ArrayAssign draft={draft} update={update} />}
      {method === "boost" && <Boosts draft={draft} setChoice={setChoice} toggleMulti={toggleMulti} />}
      {draft.classId && <p className="tiny">Для этого класса советуем поднять: {recommendedBoosts(draft).map((ability) => ABILITY_NAME[ability]).join(" и ") || "ключ класса"}.</p>}
      {draft.system === "dnd5e" && method && <BackgroundBoosts draft={draft} setChoice={setChoice} />}
      <div className="card">
        <b>Итог</b>
        {scored.ok ? (
          <div className="quick">
            {ABILITIES.map((ability) => (
              <div key={ability} className="stat">
                <b>{scored.scores[ability]}</b>
                <span>{ABILITY_SHORT[ability]}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="tiny">{scored.error}</p>
        )}
      </div>
    </>
  );
}

function PointBuy({ draft, update }: { draft: Draft; update: (partial: Partial<Draft>) => void }) {
  const spent = pointBuySpent(draft.scores);
  function set(ability: Ability, value: number) {
    update({ scores: { ...draft.scores, [ability]: value } });
  }
  return (
    <div className="card">
      <p>Потрачено {spent} из {POINT_BUY_BUDGET}. От 8 до 15. Цена шага растёт: 14 стоит 7, 15 стоит 9.</p>
      {ABILITIES.map((ability) => (
        <div key={ability} className="ability">
          <div>
            <b>{ABILITY_NAME[ability]}</b>
            <Info title={ABILITY_NAME[ability]} text={ABILITY_INFO[ability]} />
          </div>
          <div className="stepper">
            <button type="button" aria-label="Меньше" onClick={() => set(ability, Math.max(8, draft.scores[ability] - 1))}>−</button>
            <b>{draft.scores[ability]}</b>
            <button type="button" aria-label="Больше" onClick={() => set(ability, Math.min(15, draft.scores[ability] + 1))}>+</button>
          </div>
          <span className="mod">{draft.scores[ability]}</span>
        </div>
      ))}
    </div>
  );
}

function ArrayAssign({ draft, update }: { draft: Draft; update: (partial: Partial<Draft>) => void }) {
  const source = draft.choices.abilityMethod === "roll" ? draft.pool : draft.system === "pf2e" ? PF_STANDARD : STANDARD_ARRAY;
  function place(ability: Ability, value: number) {
    const scores = { ...draft.scores };
    if (scores[ability] === value) return;
    const donor = ABILITIES.find((other) => other !== ability && scores[other] === value);
    if (!donor) {
      scores[ability] = value;
    } else {
      const mine = scores[ability];
      scores[ability] = scores[donor];
      scores[donor] = mine;
    }
    update({ scores });
  }
  function roll() {
    const rolled = Array.from({ length: 6 }, () => roll4d6());
    const pool = rolled.map((item) => item.total);
    const scores = { str: pool[0], dex: pool[1], con: pool[2], int: pool[3], wis: pool[4], cha: pool[5] };
    update({ pool, scores });
  }
  const options = [...new Set(source)];
  return (
    <div className="card stack">
      {draft.choices.abilityMethod === "roll" && (
        <button type="button" className="btn" data-testid="roll-scores" onClick={roll}>
          Бросить 4d6 шесть раз
        </button>
      )}
      <p className="tiny">Числа набора: {source.length ? source.join(", ") : "ещё не брошены"}. Выбор меняет местами две характеристики.</p>
      {ABILITIES.map((ability) => (
        <label key={ability} className="field">
          <span>{ABILITY_NAME[ability]}</span>
          <select data-testid={`score-${ability}`} value={draft.scores[ability]} onChange={(event) => place(ability, Number(event.target.value))}>
            {options.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function Boosts({
  draft,
  setChoice,
  toggleMulti,
}: {
  draft: Draft;
  setChoice: (key: string, value: string) => void;
  toggleMulti: (key: string, id: string, max: number) => void;
}) {
  const ancestry = ANCESTRIES.find((item) => item.id === draft.ancestryId);
  const free = draft.ancestryId === "custom" || draft.choices.ancestryMode === "free" || !ancestry || ancestry.boosts.length === 0;
  const options = originAbilities(draft);
  const key = classKey(draft);
  const marks = recommendedBoosts(draft);
  const background = BG2.find((item) => item.id === draft.backgroundId);
  const backgroundFrees = background?.freeBoosts ?? 1;
  return (
    <div className="stack">
      <div className="card stack">
        <b>Народ</b>
        {free ? (
          <MultiAbilities group="anc" label="Два разных повышения" picked={draft.multi.ancestryBoosts ?? []} max={2} marks={marks} onToggle={(ability) => toggleMulti("ancestryBoosts", ability, 2)} />
        ) : (
          <>
            <p className="tiny">Уже дано: {ancestry?.boosts.map((ability) => ABILITY_NAME[ability]).join(", ")}. Изъян: {ancestry?.flaw ? ABILITY_NAME[ancestry.flaw] : "нет"}.</p>
            <AbilityRow label="Свободное, не из списка" value={draft.choices.ancFree ?? ""} blocked={ancestry?.boosts} marks={marks} onPick={(ability) => setChoice("ancFree", ability)} />
          </>
        )}
      </div>
      <div className="card stack">
        <b>Происхождение</b>
        {background && background.abilities.length !== 2 ? (
          <>
            {background.abilities.length > 0 && (
              <AbilityRow label="Из списка происхождения" value={draft.choices.bgFixed ?? ""} allowed={background.abilities} marks={marks} onPick={(ability) => setChoice("bgFixed", ability)} />
            )}
            {Array.from({ length: backgroundFrees }, (_, index) => {
              const keyName = (["bgFree", "bgFree2", "bgFree3"] as const)[index];
              const blocked = (["bgFixed", "bgFree", "bgFree2", "bgFree3"] as const)
                .filter((key) => key !== keyName)
                .map((key) => draft.choices[key])
                .filter((value): value is Ability => Boolean(value));
              return (
                <AbilityRow
                  key={keyName}
                  label={backgroundFrees > 1 ? `Свободное ${index + 1}` : "Свободное"}
                  value={draft.choices[keyName] ?? ""}
                  blocked={blocked}
                  marks={marks}
                  onPick={(ability) => setChoice(keyName, ability)}
                />
              );
            })}
          </>
        ) : (
          <>
            <AbilityRow label="Одно из двух" value={draft.choices.bgFixed ?? ""} allowed={options} marks={marks} onPick={(ability) => setChoice("bgFixed", ability)} />
            <AbilityRow label="Другое свободное" value={draft.choices.bgFree ?? ""} blocked={draft.choices.bgFixed ? [draft.choices.bgFixed as Ability] : []} marks={marks} onPick={(ability) => setChoice("bgFree", ability)} />
          </>
        )}
      </div>
      <div className="card">
        <b>Ключ класса: {key ? ABILITY_NAME[key] : "ещё не выбран"}</b>
        <p className="tiny">Повышение ключа применяется само. У воина и следопыта ключ выбирается на шаге класса.</p>
      </div>
      <div className="card">
        <MultiAbilities group="free" label="Четыре свободных в разные характеристики" picked={draft.multi.freeBoosts ?? []} max={4} marks={marks} onToggle={(ability) => toggleMulti("freeBoosts", ability, 4)} />
      </div>
    </div>
  );
}

function BackgroundBoosts({ draft, setChoice }: { draft: Draft; setChoice: (key: string, value: string) => void }) {
  const abilities = originAbilities(draft);
  if (abilities.length < 3) return null;
  return (
    <div className="card stack">
      <b>Прибавка происхождения</b>
      <p className="tiny">Можно дать +2 и +1 двум из трёх или +1 всем: {abilities.map((ability) => ABILITY_NAME[ability]).join(", ")}.</p>
      <div className="seg">
        <button type="button" className={`pill ${draft.choices.boostMode === "split" ? "on" : ""}`} data-testid="boost-split" onClick={() => setChoice("boostMode", "split")}>+2 и +1</button>
        <button type="button" className={`pill ${draft.choices.boostMode === "all" ? "on" : ""}`} data-testid="boost-all" onClick={() => setChoice("boostMode", "all")}>+1 всем трём</button>
      </div>
      {draft.choices.boostMode === "split" && (
        <>
          <AbilityRow label="+2" value={draft.choices.boost2 ?? ""} allowed={abilities} onPick={(ability) => setChoice("boost2", ability)} />
          <AbilityRow label="+1" value={draft.choices.boost1 ?? ""} allowed={abilities.filter((ability) => ability !== draft.choices.boost2)} onPick={(ability) => setChoice("boost1", ability)} />
        </>
      )}
    </div>
  );
}

function SkillStep({ draft, toggleMulti }: { draft: Draft; toggleMulti: (key: string, id: string, max: number) => void }) {
  const edition = draft.system ? resolveEdition(draft.system, draft.edition) : "dnd-2024";
  if (draft.system && !filledEdition(edition)) return <UnfilledNote edition={edition} />;
  const scored = scoresOf(draft);
  const need = scored.ok ? skillNeed(draft, scored.scores) : 0;
  const fixed = new Set(fixedSkills(draft));
  const picked = draft.multi.skills ?? [];
  const skills = draft.system === "pf2e" ? SK2 : SK5;
  const cls = CL5.find((item) => item.id === draft.classId);
  const allowed = draft.system === "dnd5e" && cls && cls.skillChoices !== "any" ? new Set(cls.skillChoices) : null;
  return (
    <>
      <p className="lead">Нужно выбрать {need}. Уже дано и повторно брать нельзя: {[...fixed].map((id) => skills.find((skill) => skill.id === id)?.name ?? id).join(", ") || "пока ничего"}.</p>
      {ruSort(skills.filter((skill) => !allowed || allowed.has(skill.id)), (skill) => skill.name).map((skill) => (
        <Choice
          key={skill.id}
          id={skill.id}
          name={skill.name}
          hint={fixed.has(skill.id) ? "уже есть" : ABILITY_SHORT[skill.ability]}
          info={skill.info} short={skill.short}
          on={picked.includes(skill.id)}
          onPick={() => {
            if (fixed.has(skill.id)) return;
            toggleMulti("skills", skill.id, need);
          }}
        />
      ))}
    </>
  );
}

const FEAT_SLOT: Record<string, string> = {
  "sudden-charge": "classFeat",
  "reactive-shield": "classFeat",
  exacting: "classFeat",
  "shield-block": "generalFeat",
  fleet: "generalFeat",
  toughness: "generalFeat",
  "battle-medicine": "skillFeat",
  "natural-ambition": "ancestryFeat",
  defense: "style",
  alert: "humanFeat",
};

const FEAT_NAME: Record<string, string> = {
  "sudden-charge": "Внезапный рывок",
  "reactive-shield": "Реактивный щит",
  exacting: "Точный замах",
  "shield-block": "Блок щитом",
  fleet: "Быстроногий",
  toughness: "Живучесть",
  "battle-medicine": "Боевая медицина",
  "natural-ambition": "Природная амбиция",
  defense: "Оборона",
  alert: "Бдительный",
};

function FeatAdvise({ draft, setChoice }: { draft: Draft; setChoice: (key: string, value: string) => void }) {
  const rows = featAdvice().filter((row) => draft.system === "dnd5e" ? row.id === "defense" || row.id === "alert" : row.id !== "defense" && row.id !== "alert").slice(0, 5);
  return (
    <Advise
      items={rows.map((row) => ({ id: row.id, name: FEAT_NAME[row.id] ?? row.id }))}
      advice={rows}
      onPick={(id) => setChoice(FEAT_SLOT[id] ?? "classFeat", id)}
    />
  );
}

function FeatStep({
  draft,
  update,
  setChoice,
  toggleMulti,
}: {
  draft: Draft;
  update: (partial: Partial<Draft>) => void;
  setChoice: (key: string, value: string) => void;
  toggleMulti: (key: string, id: string, max: number) => void;
}) {
  const [featLevel, setFeatLevel] = useState(1);
  const [archetypeLevel, setArchetypeLevel] = useState(2);
  const edition = draft.system ? resolveEdition(draft.system, draft.edition) : "dnd-2024";
  if (draft.system && !filledEdition(edition)) return <UnfilledNote edition={edition} />;
  if (draft.system === "dnd5e") {
    const cls = CL5.find((item) => item.id === draft.classId);
    const bg = BG5.find((item) => item.id === draft.backgroundId);
    const proficient = [...new Set([...fixedSkills(draft), ...(draft.multi.skills ?? [])])];
    return (
      <>
        <FeatAdvise draft={draft} setChoice={setChoice} />
        {bg && <p className="tiny">Происхождение уже даёт черту. Её не выбирают второй раз, если народ не человек.</p>}
        {draft.ancestryId === "human" && (
          <>
            <p className="kicker">Вторая черта происхождения</p>
            {ORIGIN_FEATS.map((feat) => (
              <Choice key={feat.id} id={feat.id} name={feat.name} hint={feat.hint} info={feat.info} short={feat.short} on={draft.choices.humanFeat === feat.id} onPick={() => setChoice("humanFeat", feat.id)} />
            ))}
            {draft.choices.humanFeat === "skilled" && (
              <>
                <p className="kicker">Три навыка одарённого</p>
                {SK5.filter((skill) => !new Set([...fixedSkills({ ...draft, choices: { ...draft.choices, humanFeat: "" } }), ...(draft.multi.skills ?? [])]).has(skill.id)).map((skill) => (
                  <Choice key={skill.id} id={`gift-${skill.id}`} name={skill.name} info={skill.info} short={skill.short} on={(draft.multi.hskilled ?? []).includes(skill.id)} onPick={() => toggleMulti("hskilled", skill.id, 3)} />
                ))}
              </>
            )}
            <MagicPicks draft={draft} featId={draft.choices.humanFeat ?? ""} prefix="h" setChoice={setChoice} />
          </>
        )}
        {bg && <MagicPicks draft={draft} featId={bg.feat} prefix="bg" setChoice={setChoice} />}
        {cls?.fightingStyle && (
          <>
            <p className="kicker">Боевой стиль</p>
            {STYLE_FEATS.map((feat) => (
              <Choice key={feat.id} id={feat.id} name={feat.name} info={feat.info} short={feat.short} on={draft.choices.style === feat.id} onPick={() => setChoice("style", feat.id)} />
            ))}
          </>
        )}
        {cls?.mastery && (
          <>
            <p className="kicker">Мастерство оружия: {draft.multi.mastery?.length ?? 0} из {cls.mastery}</p>
            {catalog("dnd5e")
              .filter((item) => item.kind === "weapon" && item.weapon?.mastery && (cls.id !== "rogue" || item.weapon.category === "simple" || (item.weapon.category === "martial" && (item.weapon.finesse || item.weapon.light))))
              .map((item) => (
                <Choice key={item.id} id={item.id} name={item.name} hint={MASTERY[item.weapon?.mastery ?? ""]?.name} info={`${item.info} ${MASTERY[item.weapon?.mastery ?? ""]?.info ?? ""}`} short={item.short ?? MASTERY[item.weapon?.mastery ?? ""]?.short} on={(draft.multi.mastery ?? []).includes(item.id)} onPick={() => toggleMulti("mastery", item.id, cls.mastery ?? 0)} />
              ))}
          </>
        )}
        {cls?.expertise && (
          <>
            <p className="kicker">Экспертиза, два навыка которыми уже владеете</p>
            {proficient.map((id) => {
              const skill = SK5.find((item) => item.id === id);
              return (
                <Choice key={id} id={`exp-${id}`} name={skill?.name ?? "неизвестный навык"} info={skill?.info ?? "Навык, которым вы владеете."} short={skill?.short} on={(draft.multi.expertise ?? []).includes(id)} onPick={() => toggleMulti("expertise", id, 2)} />
              );
            })}
          </>
        )}
        <PickList
          title="Черты справочника"
          testId="feat-picker"
          rows={ruSort([...ORIGIN_FEATS, ...GENERAL_FEATS, ...STYLE_FEATS], (item) => item.name).map((item) => ({ id: item.id, name: item.name, info: item.info, hint: item.hint }))}
          selected={draft.choices.humanFeat || draft.choices.style || ""}
          onPick={(row) => {
            if (draft.ancestryId === "human" && ORIGIN_FEATS.some((item) => item.id === row.id)) setChoice("humanFeat", row.id);
            else if (STYLE_FEATS.some((item) => item.id === row.id)) setChoice("style", row.id);
            else update({ customFeats: [...draft.customFeats, { name: row.name, info: row.info }] });
          }}
          note="Происхождение, общие черты и боевые стили открытого справочника. Подкласс класса уже подписан на шаге класса."
        />
        <CustomFeats draft={draft} update={update} />
      </>
    );
  }
  const ancestry = ANCESTRIES.find((item) => item.id === draft.ancestryId);
  const cls = CL2.find((item) => item.id === draft.classId);
  const ambition = draft.choices.ancestryFeat === "natural-ambition";
  const trained = new Set([...fixedSkills(draft), ...(draft.multi.skills ?? [])]);
  const generalSlot = draft.heritageId === "versatile" || draft.choices.ancestryFeat === "general-training";
  const skillRows = [
    ...SKILL_FEATS.filter((feat) => !GENERAL_FEAT_IDS.has(feat.id)).map((feat) => ({ id: feat.id, name: feat.name, info: feat.info, level: 1 })),
    ...featChoices({ kind: "skill", level: featLevel || undefined }).map((feat) => ({ id: feat.id, name: feat.name, info: featInfo(feat), hint: `Уровень ${feat.level}`, level: feat.level })),
  ];
  const generalRows = [
    ...SKILL_FEATS.filter((feat) => GENERAL_FEAT_IDS.has(feat.id)).map((feat) => ({ id: feat.id, name: feat.name, info: feat.info, level: 1 })),
    { id: "fleet", name: "Быстроногий", info: "Скорость +5 футов.", level: 1 },
    { id: "canny-acumen", name: "Дальновидность", info: "Выбранное испытание или Восприятие становится экспертом, а с 17 уровня — мастером.", level: 1 },
    { id: "breath-control", name: "Контроль дыхания", info: "Вы дольше задерживаете дыхание и легче переносите вдыхаемые угрозы.", level: 1 },
    ...featChoices({ kind: "general", level: featLevel || undefined }).map((feat) => ({ id: feat.id, name: feat.name, info: featInfo(feat), hint: `Уровень ${feat.level}`, level: feat.level })),
  ];
  const ancestryRows = [
    ...(ancestry?.feats ?? []).map((feat) => ({ id: feat.id, name: feat.name, info: feat.info, level: feat.level })),
    ...featChoices({ kind: "ancestry", ancestryId: draft.ancestryId, level: featLevel || undefined }).map((feat) => ({ id: feat.id, name: feat.name, info: featInfo(feat), hint: `Уровень ${feat.level}`, level: feat.level })),
  ];
  const classRows = [
    ...(cls?.feats ?? []).map((feat) => ({ id: feat.id, name: feat.name, info: feat.info, level: 1 })),
    ...(cls ? featChoices({ kind: "class", classId: cls.id, level: featLevel || undefined }).map((feat) => ({ id: feat.id, name: feat.name, info: featInfo(feat), hint: `Уровень ${feat.level}`, level: feat.level })) : []),
  ];
  const archetypeRows = featChoices({ kind: "archetype", level: archetypeLevel || undefined }).map((feat) => ({ id: feat.id, name: feat.name, info: featInfo(feat), hint: `Уровень ${feat.level}`, level: feat.level }));
  function remember(row: { name: string; info: string }) {
    update({ customFeats: [...draft.customFeats, { name: row.name, info: row.info }] });
  }
  return (
    <>
      <FeatAdvise draft={draft} setChoice={setChoice} />
      {draft.heritageId === "skilled" && <p className="tiny">Навык умелого наследия выбирается на шаге народа.</p>}
      <p className="tiny">Черта 1 уровня закрывает слот создания. Черта другого уровня записывается на лист текстом и не подменяет слот 1 уровня.</p>
      <PickList
        title="Черта народа"
        testId="feat-picker"
        rows={ancestryRows}
        selected={draft.choices.ancestryFeat ?? ""}
        level={featLevel}
        onLevel={setFeatLevel}
        onPick={(row) => { if ((row.level ?? 1) <= 1) setChoice("ancestryFeat", row.id); else remember(row); }}
        empty="У этого народа в выбранном уровне нет черты. Поставьте другой уровень."
      />
      <PickList
        title="Черта навыка"
        testId="skill-feat-picker"
        rows={skillRows}
        selected={draft.choices.skillFeat ?? ""}
        level={featLevel}
        onLevel={setFeatLevel}
        note="Если черта серая в коротком списке, не хватает навыка. Остальные черты книги выбираются по имени."
        onPick={(row) => {
          const reason = skillFeatBlock(row.id, trained);
          if (reason) return;
          if ((row.level ?? 1) <= 1) setChoice("skillFeat", row.id);
          else remember(row);
        }}
      />
      <PickList
        title="Общие черты"
        testId="general-feat-picker"
        rows={generalRows}
        selected={draft.choices.generalFeat ?? ""}
        level={featLevel}
        onLevel={setFeatLevel}
        note={generalSlot ? "Общий слот открыт." : "Без универсального наследия или «Общей подготовки» общий слот 1 уровня закрыт. Черту всё равно можно записать на лист."}
        onPick={(row) => {
          if (generalSlot && (row.level ?? 1) <= 1) setChoice("generalFeat", row.id);
          else remember(row);
        }}
      />
      <PickList
        title="Черта класса"
        testId="class-feat-picker"
        rows={classRows}
        selected={draft.choices.classFeat ?? ""}
        level={featLevel}
        onLevel={setFeatLevel}
        note={(cls?.featLevel1 || ambition) ? "На 1 уровне этому классу нужна черта класса." : "На 1 уровне отдельный слот класса может быть закрыт. Черты следующих уровней всё равно открыты."}
        empty="На этом уровне у класса нет черты. Выберите другой уровень: список не пустой на тех ступенях, где книга даёт черту."
        onPick={(row) => {
          if ((row.level ?? 1) <= 1 && (cls?.featLevel1 || ambition)) setChoice("classFeat", row.id);
          else remember(row);
        }}
      />
      <PickList
        title="Архетипы и посвящения"
        testId="archetype-picker"
        rows={archetypeRows}
        selected={draft.choices.archetype ?? ""}
        level={archetypeLevel}
        onLevel={setArchetypeLevel}
        note="Посвящение обычно берётся со 2 уровня. Здесь его можно выбрать и записать на лист."
        onPick={(row) => { setChoice("archetype", row.id); remember(row); }}
      />
      <CustomFeats draft={draft} update={update} />
    </>
  );
}

function MagicPicks({ draft, featId, prefix, setChoice }: { draft: Draft; featId: string; prefix: string; setChoice: (key: string, value: string) => void }) {
  if (!featId.startsWith("magic")) return null;
  const list = featId.endsWith("wizard") ? "wizard" : featId.endsWith("druid") ? "druid" : "cleric";
  const cantrips = SP5.filter((spell) => spell.level === 0 && spell.classes.includes(list));
  const spells = SP5.filter((spell) => spell.level === 1 && spell.classes.includes(list));
  return (
    <div className="card stack">
      <b>Посвящение в магию</b>
      <p className="kicker">Заговоры</p>
      {cantrips.map((spell) => (
        <div key={spell.id} className="row">
          <button type="button" className={`pill ${(draft.choices[`${prefix}c1`] === spell.id || draft.choices[`${prefix}c2`] === spell.id) ? "on" : ""}`} onClick={() => {
            if (!draft.choices[`${prefix}c1`]) setChoice(`${prefix}c1`, spell.id);
            else if (draft.choices[`${prefix}c1`] === spell.id) setChoice(`${prefix}c1`, "");
            else if (!draft.choices[`${prefix}c2`]) setChoice(`${prefix}c2`, spell.id);
            else if (draft.choices[`${prefix}c2`] === spell.id) setChoice(`${prefix}c2`, "");
            else setChoice(`${prefix}c2`, spell.id);
          }}>
            {spell.name}
          </button>
          <Info title={spell.name} text={spell.info} />
        </div>
      ))}
      <p className="kicker">Заклинание 1-го круга</p>
      {spells.map((spell) => (
        <Choice key={spell.id} id={`${prefix}-${spell.id}`} name={spell.name} info={spell.info} short={spell.short} on={draft.choices[`${prefix}Spell`] === spell.id} onPick={() => setChoice(`${prefix}Spell`, spell.id)} />
      ))}
      <AbilityRow label="Характеристика" value={draft.choices[`${prefix}Ability`] ?? ""} allowed={["int", "wis", "cha"]} onPick={(ability) => setChoice(`${prefix}Ability`, ability)} />
    </div>
  );
}

function CustomFeats({ draft, update }: { draft: Draft; update: (partial: Partial<Draft>) => void }) {
  return (
    <div className="card stack">
      <b>Своя черта</b>
      {draft.customFeats.map((feat, index) => (
        <p key={index} className="tiny">{feat.name}</p>
      ))}
      <FeatForm onAdd={(feat) => update({ customFeats: [...draft.customFeats, feat] })} />
    </div>
  );
}

function FeatForm({ onAdd }: { onAdd: (feat: { name: string; info: string }) => void }) {
  const [name, setName] = useState("");
  const [info, setInfo] = useState("");
  return (
    <>
      <input placeholder="Название" value={name} onChange={(event) => setName(event.target.value)} />
      <textarea placeholder="Что делает" value={info} onChange={(event) => setInfo(event.target.value)} />
      <button type="button" className="btn" onClick={() => { if (!name.trim()) return; onAdd({ name: name.trim(), info }); setName(""); setInfo(""); }}>
        Добавить черту
      </button>
    </>
  );
}

function GearStep({ draft, update }: { draft: Draft; update: (partial: Partial<Draft>) => void }) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(24);
  const edition = draft.system ? resolveEdition(draft.system, draft.edition) : "dnd-2024";
  if (draft.system && !filledEdition(edition)) {
    return (
      <>
        <UnfilledNote edition={edition} />
        <Choice id="gold" name="Без лавки другой редакции" info="Снаряжение этого пакета ещё не заведено. Чужой список вещей не предлагается. Свои предметы можно дописать ниже." on={draft.gearMode === "gold" || draft.gearMode === "shop"} onPick={() => update({ gearMode: draft.system === "pf2e" ? "shop" : "gold" })} />
        <CustomItems draft={draft} update={update} />
      </>
    );
  }
  const preview = gearPreview(draft);
  const cls5 = CL5.find((item) => item.id === draft.classId);
  const needle = query.trim().toLocaleLowerCase("ru");
  const items = ruSort(catalog(draft.system).filter((item) => item.name.toLocaleLowerCase("ru").includes(needle)), (item) => item.name);
  const notes = ruSort(notedGear(draft.system).filter((item) => item.name.toLocaleLowerCase("ru").includes(needle)), (item) => item.name);
  function buy(id: string, delta: number) {
    const bought = draft.bought.map((row) => ({ ...row }));
    const row = bought.find((item) => item.id === id);
    if (!row && delta > 0) bought.push({ id, qty: 1 });
    else if (row) row.qty += delta;
    update({ bought: bought.filter((item) => item.qty > 0) });
  }
  return (
    <>
      {draft.system === "dnd5e" && cls5 && (
        <>
          {cls5.packages.map((pack) => (
            <Choice key={pack.id} id={pack.id} name={pack.name} hint={`${pack.gp} зм впридачу`} info={pack.items.length ? `Набор класса. Монеты после покупок показывает строка ниже.` : "Вместо вещей класса берёте монеты и докупаете сами."} on={draft.gearMode === pack.id} onPick={() => update({ gearMode: pack.id })} />
          ))}
          <Choice id="gold" name="Только монеты класса" info="Если у класса есть пустой набор, он и так в списке. Эта кнопка оставляет покупки без фиксированного пакета." on={draft.gearMode === "gold"} onPick={() => update({ gearMode: "gold" })} />
          <div className="seg">
            <button type="button" className={`pill ${draft.choices.bgGear !== "gold" ? "on" : ""}`} onClick={() => update({ choices: { ...draft.choices, bgGear: "" } })}>Пакет происхождения</button>
            <button type="button" className={`pill ${draft.choices.bgGear === "gold" ? "on" : ""}`} onClick={() => update({ choices: { ...draft.choices, bgGear: "gold" } })}>50 зм вместо пакета</button>
          </div>
        </>
      )}
      {draft.system === "pf2e" && (
        <>
          <Choice id="kit" name="Набор класса" hint="Укладывается в 15 зм" info="Готовый комплект класса: доспех, оружие и мелочь. Остаток 15 золотых можно добрать в лавке." on={draft.gearMode === "kit"} onPick={() => update({ gearMode: "kit" })} />
          <Choice id="shop" name="Только лавка" info="Все 15 зм тратите сами. Ниже список открытых предметов." on={draft.gearMode === "shop"} onPick={() => update({ gearMode: "shop" })} />
        </>
      )}
      {draft.classId === "custom" && draft.system === "dnd5e" && draft.gearMode === "" && (
        <button type="button" className="btn" onClick={() => update({ gearMode: "gold" })}>Взять монеты и лавку</button>
      )}
      <p className={preview.ok ? "ok" : "bad"}>{preview.ok ? `Останется ${money(preview.copper)}` : preview.error}</p>
      <input className="search" type="search" placeholder="Найти предмет" value={query} onChange={(event) => { setQuery(event.target.value); setShown(24); }} />
      <p className="tiny">Показано {Math.min(shown, items.length)} из {items.length}</p>
      {items.slice(0, shown).map((item) => {
        const qty = draft.bought.find((row) => row.id === item.id)?.qty ?? 0;
        return (
          <div key={item.id} className="item-row">
            <div>
              <b>{item.name}</b>
              <span className="tiny">{money(item.costCp)} · {item.weight} {draft.system === "pf2e" ? "об." : "фнт"}</span>
            </div>
            <Info title={item.name} text={item.info} />
            <div className="stepper">
              <button type="button" onClick={() => buy(item.id, -1)}>−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => buy(item.id, 1)}>+</button>
            </div>
          </div>
        );
      })}
      {shown < items.length && (
        <button type="button" className="btn" data-testid="gear-more" onClick={() => setShown((value) => value + 24)}>
          Показать ещё
        </button>
      )}
      <details className="card">
        <summary>Без цены в поле, {notes.length}</summary>
        <div className="stack">
          {notes.slice(0, shown).map((item) => (
            <div key={item.id} className="item-row">
              <div>
                <b>{item.name}</b>
                <span className="tiny">Цены в поле нет, в бюджет лавки не входит</span>
              </div>
              <Info title={item.name} text={item.info} />
              <button type="button" className="btn" onClick={() => update({ customItems: [...draft.customItems, { name: item.name, weight: "1", qty: "1", kind: "gear" }] })}>На лист</button>
            </div>
          ))}
        </div>
      </details>
      <CustomItems draft={draft} update={update} />
    </>
  );
}

function CustomItems({ draft, update }: { draft: Draft; update: (partial: Partial<Draft>) => void }) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("1");
  const [qty, setQty] = useState("1");
  return (
    <div className="card stack">
      <b>Свой предмет</b>
      <input placeholder="Название" value={name} onChange={(event) => setName(event.target.value)} />
      <div className="grid-2">
        <input inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} />
        <input inputMode="numeric" value={qty} onChange={(event) => setQty(event.target.value)} />
      </div>
      <button type="button" className="btn" onClick={() => {
        if (!name.trim()) return;
        update({ customItems: [...draft.customItems, { name: name.trim(), weight, qty, kind: "gear" }] });
        setName("");
      }}>
        Положить в сумку
      </button>
    </div>
  );
}

function SpellStep({ draft, update }: { draft: Draft; update: (partial: Partial<Draft>) => void }) {
  const edition = draft.system ? resolveEdition(draft.system, draft.edition) : "dnd-2024";
  const budget = spellBudget(draft);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("0");
  const [info, setInfo] = useState("");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(24);
  const [rank, setRank] = useState(-1);
  const cls2 = CL2.find((item) => item.id === draft.classId);
  const tradition = cls2?.spell?.tradition ?? "arcane";
  const unfilled = draft.system ? !filledEdition(edition) : false;
  const packed = useMemo(() => {
    if (unfilled || !draft.system) return [];
    const needle = query.trim().toLocaleLowerCase("ru");
    return ruSort(
      rulesCatalog().filter((entry) => entry.system === draft.system && entry.edition === edition && (entry.category === "spell" || entry.category === "ritual")),
      (entry) => entry.name,
    )
      .filter((entry) => rank < 0 || entry.rank === rank)
      .filter((entry) => !needle || entry.name.toLocaleLowerCase("ru").includes(needle))
      .map((entry) => ({ id: entry.localId, name: entry.name, level: entry.rank ?? 0, info: entry.text }));
  }, [draft.system, edition, query, rank, unfilled]);
  const catalogSpells = unfilled ? [] : draft.system === "pf2e"
    ? SP2.filter((spell) => draft.classId === "custom" || spell.traditions.includes(tradition)).map((spell) => ({ id: spell.id, name: spell.name, level: spell.level, info: `${spell.time}. ${spell.info}` }))
    : SP5.filter((spell) => draft.classId === "custom" || spell.classes.includes(draft.classId)).map((spell) => ({ id: spell.id, name: spell.name, level: spell.level, info: spell.info }));
  const custom = draft.customSpells.map((spell, index) => ({ id: `custom:${index}`, name: spell.name, level: Number(spell.level) || 0, info: spell.info }));
  const seenSpell = new Set(catalogSpells.map((spell) => spell.id));
  const spells = [...catalogSpells, ...packed.filter((spell) => !seenSpell.has(spell.id)), ...custom];
  const visible = spells.filter((spell) => rank < 0 || spell.level === rank).slice(0, shown);
  function toggle(list: "knownSpells" | "preparedSpells", id: string) {
    const current = draft[list];
    update({ [list]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id] });
  }
  const cantrips = budget ? draft.knownSpells.filter((id) => (spells.find((spell) => spell.id === id)?.level ?? 0) === 0).length : 0;
  const leveled = budget ? draft.knownSpells.filter((id) => (spells.find((spell) => spell.id === id)?.level ?? 0) > 0).length : 0;
  const prepared = draft.preparedSpells.length;
  return (
    <>
      {unfilled && <UnfilledNote edition={edition} />}
      {draft.system === "dnd5e" && edition === "dnd-2024" && <p className="tiny">В стартовый лист обычно входят заговоры и 1-й круг. Остальные круги справочника тоже в списке: выберите круг или оставьте «все».</p>}
      <Advise
        items={spells}
        advice={draft.system === "pf2e" || draft.system === "dnd5e" ? spellAdvice(draft.system) : []}
        onPick={(id) => {
          const spell = spells.find((item) => item.id === id);
          const known = draft.knownSpells.includes(id) ? draft.knownSpells : [...draft.knownSpells, id];
          const prepare = Boolean(spell && spell.level > 0 && (budget?.kind === "prepared" || budget?.kind === "book"));
          const prepared = prepare && !draft.preparedSpells.includes(id) ? [...draft.preparedSpells, id] : draft.preparedSpells;
          update({ knownSpells: known, preparedSpells: prepared });
        }}
      />
      {budget && (
        <p className="lead">
          Заговоры {cantrips} из {budget.cantrips}. Заклинания 1-го круга в запасе {leveled}
          {budget.kind === "book" ? `, нужно не меньше ${budget.known}` : budget.kind === "prepared" ? "" : ` из ${budget.known}`}.
          {(budget.kind === "prepared" || budget.kind === "book") && ` Подготовлено ${prepared} из ${budget.prepare}.`}
          {draft.system === "pf2e" && cls2?.spell ? ` Традиция: ${TRADITION_NAME[tradition] ?? tradition}.` : ""}
        </p>
      )}
      <input className="search" type="search" placeholder="Найти заклинание или ритуал" value={query} onChange={(event) => { setQuery(event.target.value); setShown(24); }} />
      <label className="field">
        <span>Круг</span>
        <select value={rank} onChange={(event) => { setRank(Number(event.target.value)); setShown(24); }}>
          <option value={-1}>Все круги</option>
          {Array.from({ length: 11 }, (_, index) => index).map((value) => <option key={value} value={value}>{value === 0 ? "Заговоры" : value}</option>)}
        </select>
      </label>
      <p className="tiny" data-testid="spell-picker">Показано {visible.length} из {spells.filter((spell) => rank < 0 || spell.level === rank).length}</p>
      {visible.map((spell) => (
        <div key={spell.id} className="spell-row">
          <div>
            <b>{spell.name}</b>
            <span className="tiny">{spell.level === 0 ? "заговор" : `${spell.level} круг`}</span>
          </div>
          <Info title={spell.name} text={spell.info} />
          <div className="wrap">
            <button type="button" className={`pill ${draft.knownSpells.includes(spell.id) ? "on" : ""}`} data-testid={`spell-${spell.id}`} onClick={() => toggle("knownSpells", spell.id)}>
              Знаю
            </button>
            {spell.level > 0 && (budget?.kind === "prepared" || budget?.kind === "book") && (
              <button type="button" className={`pill ${draft.preparedSpells.includes(spell.id) ? "on" : ""}`} data-testid={`prep-${spell.id}`} onClick={() => {
                if (!draft.knownSpells.includes(spell.id)) update({ knownSpells: [...draft.knownSpells, spell.id], preparedSpells: [...draft.preparedSpells, spell.id] });
                else toggle("preparedSpells", spell.id);
              }}>
                Готовлю
              </button>
            )}
          </div>
        </div>
      ))}
      {shown < spells.length && (
        <button type="button" className="btn" onClick={() => setShown((value) => value + 24)}>Показать ещё</button>
      )}
      <div className="card stack">
        <b>Своё заклинание</b>
        <input placeholder="Название" value={name} onChange={(event) => setName(event.target.value)} />
        <input inputMode="numeric" value={level} onChange={(event) => setLevel(event.target.value)} />
        <textarea placeholder="Что делает" value={info} onChange={(event) => setInfo(event.target.value)} />
        <button type="button" className="btn" onClick={() => {
          if (!name.trim()) return;
          update({ customSpells: [...draft.customSpells, { name: name.trim(), level, info }] });
          setName("");
          setInfo("");
        }}>
          Добавить
        </button>
      </div>
    </>
  );
}

function ReviewStep({ draft, update, error }: { draft: Draft; update: (partial: Partial<Draft>) => void; error: string }) {
  const scored = scoresOf(draft);
  async function photo(file: File) {
    try {
      update({ photo: await compressImage(file) });
    } catch {
      update({ photo: undefined });
    }
  }
  return (
    <>
      <div className="card hero-card">
        <label className="avatar-btn">
          {draft.photo ? <img src={draft.photo} alt="" /> : <span>+</span>}
          <input hidden type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void photo(file); }} />
        </label>
        <div>
          <b>{draft.name || "Без имени"}</b>
          <p className="tiny">Фото сжимается и остаётся в памяти телефона. В сеть оно не уходит.</p>
        </div>
      </div>
      <div className="card stack">
        <label className="field">
          <span>Собрать сразу до уровня</span>
          <input data-testid="build-level" type="number" min={1} max={20} value={draft.choices.buildLevel || "1"} onChange={(event) => update({ choices: { ...draft.choices, buildLevel: String(Math.max(1, Math.min(20, Number(event.target.value) || 1))) } })} />
        </label>
        {draft.system === "pf2e" && (
          <button type="button" className={`pill ${draft.choices.freeArchetype === "yes" ? "on" : ""}`} data-testid="free-archetype" onClick={() => update({ choices: { ...draft.choices, freeArchetype: draft.choices.freeArchetype === "yes" ? "" : "yes" } })}>
            Свободный архетип {draft.choices.freeArchetype === "yes" ? "включён" : "выключен"}
          </button>
        )}
        <p className="tiny">Уровень 1 собирается здесь. Остальные слоты закрываются в разделе «Развитие».</p>
      </div>
      <div className="card">
        <p>{draft.system ? systemTitle(draft.system) : "Своя игра"}</p>
        <p className="tiny">Готовый лист не называется полностью проверенным: черта без расчёта в развитии всё ещё требует руки.</p>
        <p>{draft.ancestryId === "custom" ? draft.customAncestry.name : draft.ancestryId}</p>
        <p>{draft.backgroundId === "custom" ? draft.customBackground.name : draft.backgroundId}</p>
        <p>{draft.classId === "custom" ? draft.customClass.name : draft.classId}</p>
        {scored.ok && <p>{ABILITIES.map((ability) => `${ABILITY_SHORT[ability]} ${scored.scores[ability]}`).join(" · ")}</p>}
      </div>
      {error && <p className="warn">{error}</p>}
    </>
  );
}

function AbilityRow({
  label,
  value,
  onPick,
  allowed,
  blocked,
  marks,
}: {
  label: string;
  value: string;
  onPick: (ability: Ability) => void;
  allowed?: Ability[];
  blocked?: Ability[];
  marks?: Ability[];
}) {
  const list = (allowed ?? ABILITIES).filter((ability) => !blocked?.includes(ability));
  return (
    <div>
      <p className="kicker">{label}</p>
      <div className="wrap">
        {list.map((ability) => (
          <button key={ability} type="button" className={`pill ${value === ability ? "on" : ""} ${marks?.includes(ability) ? "advise" : ""}`} data-testid={`abs-${label}-${ability}`} onClick={() => onPick(ability)}>
            {ABILITY_SHORT[ability]}{marks?.includes(ability) ? " ·" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiAbilities({ group, label, picked, max, onToggle, marks }: { group: string; label: string; picked: string[]; max: number; onToggle: (ability: Ability) => void; marks?: Ability[] }) {
  return (
    <div>
      <p className="kicker">{label}: {picked.length} из {max}</p>
      <div className="wrap">
        {ABILITIES.map((ability) => (
          <button key={ability} type="button" className={`pill ${picked.includes(ability) ? "on" : ""} ${marks?.includes(ability) ? "advise" : ""}`} data-testid={`multi-${group}-${ability}`} onClick={() => onToggle(ability)}>
            {ABILITY_SHORT[ability]}{marks?.includes(ability) ? " ·" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
