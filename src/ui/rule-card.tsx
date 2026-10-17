import { actionGlyph, actionLabel, CARD_BY_ID, cardText, prereqLine, TRAIT_BY_ID, type RuleCard } from "../data/cards";
import { useInfo } from "./common";

export function RuleCardView({ card }: { card: RuleCard }) {
  const open = useInfo();
  const glyph = actionGlyph(card.actions);
  const rank = card.kind === "spell" || card.kind === "focus" ? `${card.level} круг` : card.kind === "ritual" ? `ритуал ${card.level}` : `уровень ${card.level}`;
  const pre = prereqLine(card);
  return (
    <div className="rule-card" data-testid={`rule-card-${card.id}`}>
      <p className="rule-meta">
        {glyph && <span className="glyph">{glyph}</span>} {rank}. {actionLabel(card.actions)}.
      </p>
      {card.originalName && <p className="en-name">{card.originalName}</p>}
      {card.traits.length > 0 && (
        <div className="chips">
          {card.traits.map((id) => {
            const trait = TRAIT_BY_ID.get(id);
            const title = trait?.name ?? id;
            const info = trait?.info ?? "Метка правила.";
            return (
              <button key={id} type="button" className="chip trait-chip" onClick={(event) => { event.stopPropagation(); open(title, info); }}>
                {title}
              </button>
            );
          })}
        </div>
      )}
      {card.traditions && card.traditions.length > 0 && <p>Традиции: {card.traditions.join(", ")}.</p>}
      {card.cast && <p>Сотворение: {card.cast}.</p>}
      {card.range && <p>Дистанция: {card.range}.</p>}
      {card.area && <p>Область: {card.area}.</p>}
      {card.targets && <p>Цели: {card.targets}.</p>}
      {card.defense && <p>{card.defense}.</p>}
      {card.duration && <p>Длительность: {card.duration}.</p>}
      {card.heightened && <p>{card.heightened}</p>}
      {pre && <p>Требования: {pre}.</p>}
      {card.frequency && <p>Частота: {card.frequency}.</p>}
      {card.trigger && <p>Условие: {card.trigger}.</p>}
      {card.requirements && <p>Нужно: {card.requirements}.</p>}
      <p>{card.summary}</p>
      <p className="tiny">{card.page != null ? `${card.book}, с. ${card.page}.` : `${card.book}. Страница в выгрузке не указана.`}</p>
      <p className="tiny">Своими словами по полям ORC. Абзац книги не скопирован.</p>
      <span className="sr-only">{cardText(card)}</span>
    </div>
  );
}

export function cardFor(id: string): RuleCard | undefined {
  return CARD_BY_ID.get(id);
}
