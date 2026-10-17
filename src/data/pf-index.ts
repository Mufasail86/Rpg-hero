import featIndex from "./generated/pf-feat-index.json";
import featWide from "./generated/pf-feat-wide.json";
import paths from "./generated/pf-paths.json";
import { CARD_BY_ID, cardText } from "./cards";
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
export const FEAT_INDEX = [...(featIndex as IndexedFeat[]), ...(featWide as IndexedFeat[]).filter((feat) => !seenFeat.has(feat.id))];
export const FEAT_BY_ID = new Map(FEAT_INDEX.map((feat) => [feat.id, feat]));
export const PATHS = paths as PathGroup[];

export function pathGroup(source: string): PathGroup | undefined {
  return PATHS.find((group) => group.source === source);
}

export function pathOption(source: string, id: string | undefined): PathOption | undefined {
  if (!id) return undefined;
  return pathGroup(source)?.options.find((option) => option.id === id);
}

const FEAT_NOTE = "Черта из полей. Постоянные числа листа она не меняет, если эффект не вынесен числом.";

export function levelOneClassFeats(classId: string): { id: string; name: string; info: string; short: string }[] {
  return featChoices({ kind: "class", classId, level: 1 }).map((feat) => ({
    id: feat.id,
    name: feat.name,
    info: FEAT_NOTE,
    short: "Уровень 1. В постоянные числа не входит.",
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
  const card = CARD_BY_ID.get(feat.id);
  if (card) return cardText(card);
  return `Уровень ${feat.level}. ${FEAT_NOTE}`;
}
