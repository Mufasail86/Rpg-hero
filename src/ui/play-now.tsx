import { useEffect, useState } from "react";
import { LORE } from "../data/lore";
import {
  PLAY_PLACES,
  PLAY_SCENES,
  blankPlay,
  combatBrief,
  faceFromCharacter,
  loreToken,
  parsePlay,
  playKey,
  sceneBrief,
  settingPlaces,
  type PlayMemory,
  type PlayPlace,
  type PlayScene,
  type PlayStance,
} from "../play/table";
import type { Character } from "../types";
import { fmt } from "../types";
import { go } from "./common";

function loadPlay(id: string): PlayMemory {
  try {
    return parsePlay(localStorage.getItem(playKey(id)));
  } catch {
    return blankPlay();
  }
}

function savePlay(id: string, memory: PlayMemory) {
  try {
    localStorage.setItem(playKey(id), JSON.stringify(memory));
  } catch {
    /* память места остаётся на этот заход */
  }
}

export function PlayNow({ character }: { character: Character }) {
  const [memory, setMemory] = useState<PlayMemory>(() => loadPlay(character.id));
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("rpg-play-scene", { detail: memory.scene }));
    return () => {
      window.dispatchEvent(new CustomEvent("rpg-play-scene", { detail: "" }));
    };
  }, [memory.scene]);
  const face = faceFromCharacter(character);
  const places = settingPlaces();
  const lore = LORE.find((card) => card.id === memory.loreId && card.spoiler !== "gm");

  function set(partial: Partial<PlayMemory>) {
    const next = { ...memory, ...partial };
    setMemory(next);
    savePlay(character.id, next);
  }

  return (
    <div className="stack play-now" data-testid="play-now">
      <p className="tiny">Один экран за столом. Числа — с вашего листа. Текст — подсказка, не правило книги.</p>
      <div className="play-scenes" role="group" aria-label="Какая сцена">
        {PLAY_SCENES.map((scene) => (
          <button
            key={scene.id}
            type="button"
            className={memory.scene === scene.id ? "on" : ""}
            aria-pressed={memory.scene === scene.id}
            data-testid={`scene-${scene.id}`}
            onClick={() => set({ scene: scene.id })}
          >
            {scene.name}
          </button>
        ))}
      </div>
      <p className="kicker">Где вы</p>
      <div className="play-places" role="group" aria-label="Тип места">
        {PLAY_PLACES.map((place) => (
          <button
            key={place.id}
            type="button"
            className={`pill ${memory.place === place.id ? "on" : ""}`}
            aria-pressed={memory.place === place.id}
            data-testid={`place-${place.id}`}
            onClick={() => set({ place: memory.place === place.id ? "" : place.id })}
          >
            {place.name}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Место из преданий</span>
        <select data-testid="play-lore" value={places.some((card) => card.id === memory.loreId) ? memory.loreId : ""} onChange={(event) => set({ loreId: event.target.value })}>
          <option value="">Не привязывать</option>
          {places.map((card) => (
            <option key={card.id} value={card.id}>{card.name}</option>
          ))}
        </select>
      </label>
      {lore && (
        <article className="card stack" data-testid="play-lore-card">
          <b>{lore.name}</b>
          <p>{lore.short}</p>
          <p className="tiny">{lore.location}</p>
          <div className="row">
            <a href={lore.link} target="_blank" rel="noreferrer">Источник</a>
            <button type="button" className="text-btn" data-testid="play-lore-open" onClick={() => go(`#/lore/${encodeURIComponent(loreToken(lore))}`)}>Карточка</button>
          </div>
        </article>
      )}
      {memory.scene === "fight"
        ? <Fight face={face} stance={memory.stance} onStance={(stance) => set({ stance })} />
        : <TableScene character={character} scene={memory.scene} place={memory.place} />}
    </div>
  );
}

function TableScene({ character, scene, place }: { character: Character; scene: PlayScene; place: PlayPlace }) {
  const brief = sceneBrief(faceFromCharacter(character), scene, place);
  return (
    <>
      <section className="card stack" data-testid="play-vows">
        <p className="kicker">Помни о себе</p>
        {brief.vows.length === 0 && <p>{brief.vowEmpty}</p>}
        {brief.vows.map((row) => (
          <p key={`${row.label}-${row.text}`}><b>{row.label}.</b> {row.text}</p>
        ))}
      </section>
      <section className="stack" data-testid="play-prompts">
        <p className="kicker">Как отыграть</p>
        {brief.prompts.map((line) => <p key={line}>{line}</p>)}
      </section>
      <section className="stack" data-testid="play-actions">
        <p className="kicker">Что можно сделать</p>
        {brief.actions.map((row) => (
          <article key={`${row.title}-${row.skillId}`} className="card" data-strong={row.strong ? "1" : "0"}>
            <b>{row.title}</b>
            <p>{row.skill} {fmt(row.mod)}{row.strong ? " · ваш сильный" : ""}</p>
            <p className="tiny">{row.why}</p>
          </article>
        ))}
      </section>
      <section className="card stack" data-testid="play-place">
        <p className="kicker">Что тут обычно есть</p>
        <b>{brief.placeTitle}</b>
        <p>{brief.placeText}</p>
      </section>
    </>
  );
}

function Fight({
  face,
  stance,
  onStance,
}: {
  face: ReturnType<typeof faceFromCharacter>;
  stance: PlayStance;
  onStance: (stance: PlayStance) => void;
}) {
  const brief = combatBrief(face, stance);
  return (
    <section className="stack" data-testid="play-combat">
      <div className="play-scenes" role="group" aria-label="Где вы стоите">
        <button type="button" className={stance === "melee" ? "on" : ""} aria-pressed={stance === "melee"} data-testid="stance-melee" onClick={() => onStance("melee")}>
          Вплотную (рядом с врагом)
        </button>
        <button type="button" className={stance === "ranged" ? "on" : ""} aria-pressed={stance === "ranged"} data-testid="stance-ranged" onClick={() => onStance("ranged")}>
          На расстоянии
        </button>
      </div>
      <p data-testid="play-economy">{brief.economy}</p>
      {brief.map && <p data-testid="play-map">{brief.map}</p>}
      {brief.empty && <p className="lead" data-testid="play-no-ranged">{brief.empty}</p>}
      {brief.strikes.length > 0 && (
        <div className="stack" data-testid="play-strikes">
          <p className="kicker">{stance === "melee" ? "Удары вплотную" : "Дальние удары"}</p>
          {brief.strikes.map((row) => (
            <article key={row.name} className="card">
              <b>{row.name}</b>
              <p>Попадание {row.attack}. Урон {row.damage}.</p>
              {row.note && <p className="tiny">{row.note}</p>}
            </article>
          ))}
        </div>
      )}
      {brief.spells.length > 0 && (
        <div className="stack" data-testid="play-spells">
          <p className="kicker">Дальняя магия</p>
          {brief.spells.map((spell) => (
            <article key={spell.name} className="card">
              <b>{spell.name}</b>
              <p>{spell.line}</p>
            </article>
          ))}
        </div>
      )}
      <div className="stack" data-testid="play-maneuvers">
        <p className="kicker">Приёмы</p>
        {brief.maneuvers.map((row) => (
          <article key={row.name} className="card">
            <b>{row.name}</b>
            <p>{row.line}</p>
          </article>
        ))}
      </div>
      {brief.classActions.length > 0 && (
        <div className="stack" data-testid="play-class">
          <p className="kicker">Ваш класс</p>
          {brief.classActions.map((row) => (
            <article key={row.name} className="card">
              <b>{row.name}</b>
              <p>{row.line}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
