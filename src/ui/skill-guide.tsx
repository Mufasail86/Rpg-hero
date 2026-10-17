import { useState } from "react";
import { classFace } from "../beginner";
import {
  GUIDE_NOTE,
  skillCards,
  skillPlan,
  skillTitle,
  type SkillCard,
  type SkillPlan,
} from "../skills/picks";
import type { Ability, Character } from "../types";
import { go } from "./common";

export function advicePicks(plan: SkillPlan): { pick: string; reason: string }[] {
  return plan.grow.map((row) => ({ pick: row.id, reason: row.reason }));
}

export function planForCharacter(character: Pick<Character, "system" | "classId" | "keyAbility" | "abilities">): SkillPlan {
  return skillPlan({
    system: character.system,
    classId: character.classId,
    keyAbility: character.keyAbility,
    role: classFace(character.system, character.classId).role,
    scores: character.abilities,
  });
}

export function planForDraft(input: {
  system: "pf2e" | "dnd5e";
  classId: string;
  keyAbility: Ability;
  scores?: Partial<Record<Ability, number>>;
}): SkillPlan {
  return skillPlan({
    ...input,
    role: classFace(input.system, input.classId).role,
  });
}

export function SkillPicks({
  system,
  plan,
  catalog = true,
}: {
  system: "pf2e" | "dnd5e";
  plan?: SkillPlan | null;
  catalog?: boolean;
}) {
  const cards = skillCards(system);
  const bands: SkillCard["frequency"][] = ["часто", "иногда", "редко"];
  return (
    <div className="stack skill-picks" data-testid="skill-picks">
      <p className="tiny">{GUIDE_NOTE}</p>
      <p className="tiny">{system === "pf2e" ? "Pathfinder, ремастер." : "D&D 5e: список один и для 2014, и для 2024. Меняются числа, не совет."}</p>
      {plan && <PlanList plan={plan} system={system} />}
      {catalog && (
        <section className="stack" data-testid="skill-catalog">
          <h2>Все навыки по частоте</h2>
          {bands.map((band) => {
            const rows = cards.filter((card) => card.frequency === band);
            if (rows.length === 0) return null;
            return (
              <details key={band} className="card" data-testid={`skill-band-${band}`}>
                <summary>{band === "часто" ? "Часто пригождаются" : band === "иногда" ? "Иногда пригождаются" : "Редко, если это не ваша тема"}</summary>
                <div className="stack">
                  {rows.map((card) => <SkillDetail key={card.id} system={system} card={card} />)}
                </div>
              </details>
            );
          })}
        </section>
      )}
    </div>
  );
}

function PlanList({ plan, system }: { plan: SkillPlan; system: "pf2e" | "dnd5e" }) {
  return (
    <div className="stack" data-testid="skill-plan">
      <b>Тебе советуем развивать</b>
      {plan.grow.map((tip) => (
        <div key={tip.id} className="advise-row" data-testid={`plan-${tip.id}`}>
          <b>{skillTitle(system, tip.id)}</b>
          <small>{tip.reason}</small>
        </div>
      ))}
      <details className="card" data-testid="skill-skip">
        <summary>Можно не вкладываться</summary>
        <div className="stack">
          {plan.skip.map((tip) => (
            <p key={tip.id} className="plain-line" data-testid={`skip-${tip.id}`}>
              <b>{skillTitle(system, tip.id)}. </b>{tip.reason}
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}

function SkillDetail({ system, card }: { system: "pf2e" | "dnd5e"; card: SkillCard }) {
  return (
    <details data-testid={`skill-card-${card.id}`}>
      <summary>{skillTitle(system, card.id)} · {card.frequency} · {card.scenes.join(", ")}</summary>
      <p>{card.why}</p>
      <p className="tiny">Кому: {card.who}</p>
      {card.raise && <p className="tiny">Повышать дальше: {card.raise}</p>}
      {card.unlocks && <p className="tiny">Что открывает: {card.unlocks}</p>}
    </details>
  );
}

export function SkillPicksPage() {
  const [system, setSystem] = useState<"pf2e" | "dnd5e">("pf2e");
  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="На главную" onClick={() => go("#/")}>←</button>
        <h1 className="grow">Какие навыки брать</h1>
      </header>
      <main className="screen stack">
        <div className="seg" role="group" aria-label="Система">
          <button type="button" className={`pill ${system === "pf2e" ? "on" : ""}`} data-testid="picks-pf" onClick={() => setSystem("pf2e")}>Pathfinder</button>
          <button type="button" className={`pill ${system === "dnd5e" ? "on" : ""}`} data-testid="picks-dnd" onClick={() => setSystem("dnd5e")}>D&D</button>
        </div>
        <SkillPicks system={system} />
      </main>
    </div>
  );
}
