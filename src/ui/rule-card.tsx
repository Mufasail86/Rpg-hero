import { actionGlyph, CARD_BY_ID, prereqLine, TRAIT_BY_ID, type RuleCard } from "../data/cards";
import { plainWords, traitPlain } from "../beginner";
import { useInfo } from "./common";

const CLASS_TRAITS = new Set([
  "alchemist", "animist", "barbarian", "bard", "champion", "cleric", "commander", "druid", "exemplar",
  "fighter", "guardian", "gunslinger", "inventor", "investigator", "kineticist", "magus", "monk",
  "oracle", "psychic", "ranger", "rogue", "sorcerer", "summoner", "swashbuckler", "thaumaturge",
  "witch", "wizard",
]);

export function kindTitle(card: RuleCard): string {
  if (card.kind === "spell") return `Заклинание ${card.level}`;
  if (card.kind === "focus") return `Фокус ${card.level}`;
  if (card.kind === "ritual") return `Ритуал ${card.level}`;
  if (card.kind === "dedication") return `Посвящение ${card.level}`;
  if (card.traits.includes("general")) return `Общая черта ${card.level}`;
  if (card.traits.includes("skill")) return `Черта навыка ${card.level}`;
  if (card.traits.includes("ancestry") || card.traits.some((trait) => trait.endsWith("-ancestry"))) return `Черта народа ${card.level}`;
  if (card.traits.some((trait) => CLASS_TRAITS.has(trait))) return `Черта класса ${card.level}`;
  return `Черта ${card.level}`;
}

function Line({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <p><b>{label}.</b> {value}</p>;
}

export function RuleCardView({ card, sourceNote }: { card: RuleCard; sourceNote?: string }) {
  const open = useInfo();
  const glyph = actionGlyph(card.actions);
  const pre = prereqLine(card);
  const book = card.page != null ? `${card.book}, с. ${card.page}` : card.book;
  return (
    <div className="rule-card" data-testid={`rule-card-${card.id}`}>
      <p className="plain-line"><b>Простыми словами.</b> {plainWords(card)}</p>
      <p className="rule-meta">
        {glyph && <span className="glyph">{glyph}</span>} {kindTitle(card)}
      </p>
      {card.traits.length > 0 && (
        <div className="chips">
          {card.traits.map((id) => {
            const trait = TRAIT_BY_ID.get(id);
            const title = trait?.name ?? id;
            const info = traitPlain(id, trait?.info ?? "Метка правила. Сама по себе число на листе не меняет.");
            return (
              <button key={id} type="button" className="chip trait-chip" onClick={(event) => { event.stopPropagation(); open(title, info); }}>
                {title}
              </button>
            );
          })}
        </div>
      )}
      <Line label="Требования" value={pre} />
      <Line label="Частота" value={card.frequency} />
      <Line label="Триггер" value={card.trigger} />
      <Line label="Нужно" value={card.requirements} />
      {card.traditions && card.traditions.length > 0 && <Line label="Традиции" value={card.traditions.join(", ")} />}
      <Line label="Сотворение" value={card.cast} />
      <Line label="Дистанция" value={card.range} />
      <Line label="Область" value={card.area} />
      <Line label="Цели" value={card.targets} />
      <Line label="Защита" value={card.defense} />
      <Line label="Длительность" value={card.duration} />
      {card.summary && <p>{card.summary}</p>}
      <Line label="Усиление" value={card.heightened} />
      <details className="source-foot">
        <summary>Источник</summary>
        <p className="tiny">{book}.{sourceNote ? ` ${sourceNote}` : ""} Поля взяты из открытой выгрузки. Это не значит, что перевод вычитан или правило разобрано целиком.</p>
      </details>
    </div>
  );
}

export function cardFor(id: string): RuleCard | undefined {
  return CARD_BY_ID.get(id);
}
