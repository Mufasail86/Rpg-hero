import { FEY_ARCHETYPE_INFO, FEY_FEAT_INFO, FEY_INDEX } from "./feybound";
import featIndex from "./generated/pf-feat-index.json";
import featWide from "./generated/pf-feat-wide.json";
import paths from "./generated/pf-paths.json";
import { CARD_BY_ID, cardText } from "./cards";
import { reviewedPfText } from "./pf-reviewed-text";
import { byRu } from "../sort";

export interface IndexedFeat {
  id: string;
  name: string;
  kind: "ancestry" | "class" | "skill" | "general" | "archetype" | "mythic";
  level: number;
  classes: string[];
  ancestries: string[];
}

export interface RageStep {
  minLevel: number;
  value: number;
}

export interface PathOption {
  id: string;
  name: string;
  originalName: string;
  skill: string | null;
  curse: string;
  rage: RageStep[];
  extraFeat: boolean;
  info: string;
}

export interface PathGroup {
  classId: string;
  source: "instinct" | "style" | "mystery";
  title: string;
  options: PathOption[];
}

const seenFeat = new Set((featIndex as IndexedFeat[]).map((feat) => feat.id));
export const FEAT_INDEX = [...(featIndex as IndexedFeat[]), ...(featWide as IndexedFeat[]).filter((feat) => !seenFeat.has(feat.id)), ...FEY_INDEX.filter((feat) => !seenFeat.has(feat.id))]
  .map(feat => {
    const checked = reviewedPfText(feat.id);
    return checked ? { ...feat, name: checked.name } : feat;
  });
export const FEAT_BY_ID = new Map(FEAT_INDEX.map((feat) => [feat.id, feat]));
export const PATHS = paths as PathGroup[];

export function pathGroup(source: string): PathGroup | undefined {
  return PATHS.find((group) => group.source === source);
}

export function pathOption(source: string, id: string | undefined): PathOption | undefined {
  if (!id) return undefined;
  return pathGroup(source)?.options.find((option) => option.id === id);
}

const FEAT_NOTE = "Полное правило пока не загружено. До выбора проверьте эффект и требования в источнике; отсутствие описания не означает отсутствие эффекта.";

export function levelOneClassFeats(classId: string): { id: string; name: string; info: string; short: string }[] {
  return featChoices({ kind: "class", classId, level: 1 }).map((feat) => ({
    id: feat.id,
    name: feat.name,
    info: featInfo(feat),
    short: CARD_BY_ID.get(feat.id)?.summary || "Уровень 1. Откройте описание и требования перед выбором.",
  }));
}

export function featChoices(filter: { kind: IndexedFeat["kind"]; classId?: string; ancestryId?: string; level?: number }): IndexedFeat[] {
  return FEAT_INDEX.filter((feat) => {
    if (filter.kind === "archetype") {
      if (feat.kind !== "archetype" && !feat.id.endsWith("-dedication")) return false;
    } else if (feat.kind !== filter.kind) {
      return false;
    }
    if (filter.kind === "class" && feat.id.endsWith("-dedication")) return false;
    if (filter.level != null && feat.level !== filter.level) return false;
    if (filter.kind === "class" && filter.classId && feat.classes.length > 0 && !feat.classes.includes(filter.classId)) return false;
    if (filter.kind === "ancestry" && filter.ancestryId && feat.ancestries.length > 0 && !feat.ancestries.includes(filter.ancestryId)) return false;
    return true;
  }).sort(byRu((feat) => feat.name));
}

export function featInfo(feat: IndexedFeat): string {
  const fey = FEY_FEAT_INFO[feat.id] ?? FEY_ARCHETYPE_INFO[feat.id];
  if (fey) return fey;
  const card = CARD_BY_ID.get(feat.id);
  if (card) return cardText(card);
  return `Уровень ${feat.level}. ${FEAT_NOTE}`;
}
