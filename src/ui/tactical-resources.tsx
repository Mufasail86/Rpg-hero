import { Diamond, Footprints, Minus, Sparkles, Sword, Undo2, Zap } from "lucide-react";
import type { Character } from "../types";
import type { TacticalActor } from "../play/tactical";

function Meter({ id, label, left, max, kind = "action" }: { id: string; label: string; left: number; max: number; kind?: "action" | "reaction" | "spell" | "attack" }) {
  const count = Math.max(0, Math.min(max, left));
  const Icon = kind === "reaction" ? Undo2 : kind === "spell" ? Sparkles : kind === "attack" ? Sword : Diamond;
  return <div className={`tactical-resource ${kind}`} role="group" aria-label={`${label}: ${count} из ${max}`} data-testid={`resource-${id}`}>
    <div className="tactical-resource-label"><span>{label}</span><strong>{count}<small>/{max}</small></strong></div>
    <div className="tactical-resource-pips" aria-hidden="true">{Array.from({ length: max }, (_, index) => <span key={index} className={`tactical-resource-pip ${index < count ? "available" : "spent"}`} title={`${label} ${index + 1}: ${index < count ? "доступно" : "потрачено"}`}>{index < count ? <Icon size={18} /> : <Minus size={18} />}</span>)}</div>
  </div>;
}

export function TacticalResources({ hero, actor, perAction }: { hero: Character; actor: TacticalActor; perAction: number }) {
  const pf = hero.system === "pf2e";
  const slots = hero.slots.filter(row => row.rank === 1 && row.note !== "шрифт").reduce((sum, row) => sum + row.max, 0);
  const font = hero.slots.filter(row => row.rank === 1 && row.note === "шрифт").reduce((sum, row) => sum + row.max, 0);
  const attacks = actor.dnd.action ? Math.max(0, perAction - actor.dnd.attacks) : 0;
  return <section className="tactical-resources" aria-label="Ресурсы персонажа" data-testid="tactical-resources">
    <h2>Действия этого хода</h2>
    <div className={`tactical-turn-meters ${pf ? "pf" : "dnd"}`}>
      {pf ? <Meter id="actions" label="Действия" left={actor.pf.actions} max={3} /> : <>
        <Meter id="main" label="Основное" left={actor.dnd.action && actor.dnd.attacks === 0 ? 1 : 0} max={1} />
        <Meter id="bonus" label="Бонусное" left={actor.dnd.bonus ? 1 : 0} max={1} />
      </>}
      <Meter id="reaction" label="Реакция" left={(pf ? actor.pf.reaction : actor.dnd.reaction) ? 1 : 0} max={1} kind="reaction" />
      {!pf && <>
        <Meter id="attacks" label="Удары при атаке" left={attacks} max={perAction} kind="attack" />
        <div className="tactical-resource movement" role="group" aria-label={`Движение: ${actor.move} футов`} data-testid="resource-movement"><div className="tactical-resource-label"><span>Движение</span><strong>{actor.move}</strong></div><div className="tactical-movement-value"><Footprints size={18} aria-hidden="true" /><span>футов осталось</span></div></div>
      </>}
    </div>
    {!pf && hero.classId === "fighter" && hero.level >= 2 && <div className={`tactical-extra-action ${actor.extraActionAvailable ? "available" : ""}`} data-testid="resource-extra"><Zap size={16} aria-hidden="true" />{actor.extraActionAvailable ? "Всплеск: ещё одно действие" : "Всплеск: дополнительное действие неактивно"}</div>}
    {(slots > 0 || font > 0) && <div className="tactical-slot-meters" aria-label="Ячейки заклинаний">
      {slots > 0 && <Meter id="slots" label="Ячейки · 1 круг" left={actor.slots[1] ?? 0} max={slots} kind="spell" />}
      {font > 0 && <Meter id="font" label="Шрифт · 1 круг" left={actor.font ?? 0} max={font} kind="spell" />}
    </div>}
  </section>;
}
