import cards from "./generated/pf-cards.json";
import traits from "./generated/pf-traits.json";
import features from "./generated/pf-class-features.json";

export interface CardGate {
  kind: "skill" | "ability" | "dedication" | "feat";
  skill?: string;
  rank?: string;
  ability?: string;
  mod?: number;
  id?: string;
}

export interface RuleCard {
  id: string;
  kind: "feat" | "dedication" | "spell" | "focus" | "ritual";
  name: string;
  originalName: string;
  level: number;
  actions: string;
  traits: string[];
  gates: CardGate[];
  prereqNote: string;
  frequency: string;
  trigger: string;
  requirements: string;
  summary: string;
  book: string;
  page: number | null;
  cast?: string;
  traditions?: string[];
  range?: string;
  area?: string;
  targets?: string;
  defense?: string;
  duration?: string;
  heightened?: string;
}

export interface TraitChip {
  id: string;
  name: string;
  info: string;
}

export interface ClassFeatureLine {
  classId: string;
  level: number;
  originalName: string;
  name: string;
}

export const CARDS = cards as RuleCard[];
export const CARD_BY_ID = new Map(CARDS.map((card) => [card.id, card]));
export const TRAIT_BY_ID = new Map((traits as TraitChip[]).map((trait) => [trait.id, trait]));
export const CLASS_FEATURES = features as ClassFeatureLine[];

const RANK_RU: Record<string, string> = { trained: "обучен", expert: "эксперт", master: "мастер", legendary: "легенда" };
const SKILL_RU: Record<string, string> = {
  acrobatics: "Акробатика",
  arcana: "Аркана",
  athletics: "Атлетика",
  crafting: "Ремесло",
  deception: "Обман",
  diplomacy: "Дипломатия",
  intimidation: "Запугивание",
  medicine: "Медицина",
  nature: "Природа",
  occultism: "Оккультизм",
  performance: "Выступление",
  religion: "Религия",
  society: "Общество",
  stealth: "Скрытность",
  survival: "Выживание",
  thievery: "Воровство",
};
const ABILITY_RU: Record<string, string> = {
  str: "Сила",
  dex: "Ловкость",
  con: "Телосложение",
  int: "Интеллект",
  wis: "Мудрость",
  cha: "Харизма",
};
const RANK_ORDER = ["untrained", "trained", "expert", "master", "legendary"];

export function actionGlyph(actions: string): string {
  if (actions === "1") return "◆";
  if (actions === "2") return "◆◆";
  if (actions === "3") return "◆◆◆";
  if (actions === "reaction") return "↺";
  if (actions === "free") return "◇";
  if (actions === "varies") return "◆–◆◆◆";
  return "";
}

export function actionLabel(actions: string): string {
  if (actions === "1") return "одно действие";
  if (actions === "2") return "два действия";
  if (actions === "3") return "три действия";
  if (actions === "reaction") return "реакция";
  if (actions === "free") return "свободное действие";
  if (actions === "varies") return "число действий меняется";
  if (actions === "other") return "особое время";
  return "постоянная";
}

export function prereqLine(card: RuleCard): string {
  const parts = card.gates.map((gate) => {
    if (gate.kind === "skill" && gate.skill && gate.rank) return `${RANK_RU[gate.rank] ?? "обучен"} в навыке ${SKILL_RU[gate.skill] ?? "навык"}`;
    if (gate.kind === "ability" && gate.ability) return `${ABILITY_RU[gate.ability] ?? "характеристика"} +${gate.mod ?? 0}`;
    if (gate.kind === "dedication" && gate.id) return `посвящение «${CARD_BY_ID.get(gate.id)?.name ?? "архетипа"}»`;
    if (gate.kind === "feat" && gate.id) return `черта «${CARD_BY_ID.get(gate.id)?.name ?? "из списка"}»`;
    return "";
  }).filter((part) => part.length > 0);
  if (card.prereqNote) parts.push(card.prereqNote);
  return parts.join("; ");
}

export function cardText(card: RuleCard): string {
  const rank = card.kind === "spell" || card.kind === "focus" ? `Круг ${card.level}` : card.kind === "ritual" ? `Ритуал ${card.level}` : `Уровень ${card.level}`;
  const lines = [[rank, actionGlyph(card.actions), actionLabel(card.actions)].filter(Boolean).join(" · ")];
  if (card.traditions && card.traditions.length > 0) lines.push(`Традиции: ${card.traditions.join(", ")}.`);
  if (card.cast) lines.push(`Сотворение: ${card.cast}.`);
  const place = [
    card.range ? `Дистанция: ${card.range}` : "",
    card.area ? `Область: ${card.area}` : "",
    card.targets ? `Цели: ${card.targets}` : "",
    card.defense ?? "",
    card.duration ? `Длительность: ${card.duration}` : "",
  ].filter((part) => part.length > 0);
  if (place.length > 0) lines.push(`${place.join(". ")}.`);
  if (card.heightened) lines.push(card.heightened);
  const pre = prereqLine(card);
  if (pre) lines.push(`Требования: ${pre}.`);
  if (card.frequency) lines.push(`Частота: ${card.frequency}.`);
  if (card.trigger) lines.push(`Условие: ${card.trigger}.`);
  if (card.requirements) lines.push(`Нужно: ${card.requirements}.`);
  lines.push(card.summary);
  lines.push(card.page != null ? `${card.book}, с. ${card.page}.` : `${card.book}. Страница в выгрузке не указана.`);
  return lines.join("\n");
}

export function featuresAt(classId: string, level: number): ClassFeatureLine[] {
  return CLASS_FEATURES.filter((feature) => feature.classId === classId && feature.level === level);
}

export function isDedication(id: string): boolean {
  return CARD_BY_ID.get(id)?.kind === "dedication" || id.endsWith("-dedication");
}

export function isArchetypeFeat(id: string, kind = ""): boolean {
  const card = CARD_BY_ID.get(id);
  if (card?.kind === "dedication") return true;
  if (card?.traits.includes("archetype")) return true;
  return kind === "archetype" || id.endsWith("-dedication");
}

export function gatesOk(card: RuleCard | undefined, taken: string[], ranks?: Record<string, string>, scores?: Record<string, number>): boolean {
  if (!card) return true;
  for (const gate of card.gates) {
    if (gate.kind === "skill" && gate.skill && gate.rank && ranks) {
      const have = RANK_ORDER.indexOf(ranks[gate.skill] ?? "untrained");
      const need = RANK_ORDER.indexOf(gate.rank);
      if (have < need) return false;
    }
    if (gate.kind === "ability" && gate.ability && scores) {
      const mod = Math.floor(((scores[gate.ability] ?? 10) - 10) / 2);
      if (mod < (gate.mod ?? 0)) return false;
    }
    if ((gate.kind === "dedication" || gate.kind === "feat") && gate.id && !taken.includes(gate.id)) return false;
  }
  return true;
}

/** Второе посвящение можно взять, когда у текущего архетипа уже две другие черты. */
export function dedicationOpen(taken: string[]): boolean {
  let current = "";
  let follow = 0;
  for (const id of taken) {
    if (!isArchetypeFeat(id)) continue;
    if (isDedication(id)) {
      if (current && follow < 2) return false;
      current = id;
      follow = 0;
    } else if (current) follow += 1;
  }
  return !current || follow >= 2;
}

export function archetypeLegal(id: string, taken: string[]): boolean {
  if (isDedication(id)) return dedicationOpen(taken);
  const need = CARD_BY_ID.get(id)?.gates.find((gate) => gate.kind === "dedication")?.id;
  if (need) return taken.includes(need);
  return taken.some((pick) => isDedication(pick));
}
