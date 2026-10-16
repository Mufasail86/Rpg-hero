import featIndex from "./generated/pf-feat-index.json";
import paths from "./generated/pf-paths.json";

export interface IndexedFeat {
  id: string;
  name: string;
  kind: "ancestry" | "class" | "skill" | "general";
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

export const FEAT_INDEX = featIndex as IndexedFeat[];
export const FEAT_BY_ID = new Map(FEAT_INDEX.map((feat) => [feat.id, feat]));
export const PATHS = paths as PathGroup[];

export function pathGroup(source: string): PathGroup | undefined {
  return PATHS.find((group) => group.source === source);
}

export function pathOption(source: string, id: string | undefined): PathOption | undefined {
  if (!id) return undefined;
  return pathGroup(source)?.options.find((option) => option.id === id);
}

export function levelOneClassFeats(classId: string): { id: string; name: string; info: string; short: string }[] {
  return FEAT_INDEX.filter((feat) => feat.kind === "class" && feat.level <= 1 && (feat.classes.length === 0 || feat.classes.includes(classId))).map((feat) => ({
    id: feat.id,
    name: feat.name,
    info: "Черта класса 1 уровня из полей книги. Постоянные числа листа она не меняет: эффект в поля не вынесен или движок его не применяет.",
    short: "Уровень 1. В постоянные числа не входит.",
  }));
}
