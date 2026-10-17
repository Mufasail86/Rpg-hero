import roster from "./generated/pf-roster.json";
import type { Ability } from "../types";
import type { AncestryDef, ClassDef } from "./pf2e";

interface HeritageRow {
  id: string;
  name: string;
  info: string;
}

interface AncestryRow {
  id: string;
  name: string;
  hint: string;
  hp: number;
  size: string;
  speed: number;
  senses: string;
  languages: string;
  boosts: Ability[];
  flaw: Ability | null;
  freeBoosts: number;
  info: string;
  short: string;
  heritages: HeritageRow[];
  feats: AncestryDef["feats"];
}

interface ClassRow {
  id: string;
  name: string;
  hint: string;
  hp: number;
  key: Ability[];
  perception: string;
  fort: string;
  ref: string;
  will: string;
  skillsFixed: string[];
  extraSkills: number;
  attacks: Record<string, string>;
  armor: Record<string, string>;
  classDc: string;
  spellRank: string;
  featLevel1: boolean;
  classFeatLevels: number[];
  skillFeatLevels: number[];
  features: { name: string; info: string; short?: string }[];
  choices: ClassDef["choices"];
  feats: ClassDef["feats"];
  kit: string[];
  info: string;
  short: string;
  spell?: { tradition: string; cantrips: number; slots: number; prepared: boolean };
}

export interface CompanionOption {
  id: string;
  name: string;
  kind: string;
  title?: string;
  info: string;
}

export interface CallingOption {
  id: string;
  name: string;
  info: string;
}

export interface ExcludedOption {
  id: string;
  kind: string;
  name: string;
  license: string;
  remaster: boolean;
  title: string;
}

const ancestries = roster.ancestries as AncestryRow[];
const classes = roster.classes as ClassRow[];

export const ROSTER_ANCESTRIES: AncestryDef[] = ancestries.map((row) => ({
  id: row.id,
  name: row.name,
  hint: row.hint,
  hp: row.hp,
  size: row.size,
  speed: row.speed,
  senses: row.senses,
  languages: row.languages,
  boosts: row.boosts,
  flaw: row.flaw ?? undefined,
  freeBoosts: row.freeBoosts,
  info: row.info,
  short: row.short,
  heritages: row.heritages,
  feats: row.feats ?? [],
}));

export const ROSTER_CLASSES: ClassDef[] = classes.map((row) => ({
  id: row.id,
  name: row.name,
  hint: row.hint,
  hp: row.hp,
  key: row.key,
  perception: row.perception,
  fort: row.fort,
  ref: row.ref,
  will: row.will,
  skillsFixed: row.skillsFixed,
  extraSkills: row.extraSkills,
  attacks: row.attacks,
  armor: row.armor,
  classDc: row.classDc,
  spellRank: row.spellRank,
  featLevel1: row.featLevel1,
  features: row.features,
  choices: row.choices,
  feats: row.feats,
  kit: row.kit,
  info: row.info,
  short: row.short,
  spell: row.spell,
}));

export const CLASS_FEAT_LEVELS: Record<string, number[]> = Object.fromEntries(classes.map((row) => [row.id, row.classFeatLevels]));
export const SKILL_FEAT_LEVELS: Record<string, number[]> = Object.fromEntries(classes.map((row) => [row.id, row.skillFeatLevels]));
export const COMPANIONS = roster.companions as CompanionOption[];
export const CALLINGS = roster.callings as CallingOption[];
export const EXCLUDED = roster.excluded as ExcludedOption[];

/** Английское имя из поля Foundry. На экран оно не выводится. */
export const ORC_ORIGINAL_NAME: Record<string, string> = {
  athamaru: "Athamaru",
  automaton: "Automaton",
  "awakened-animal": "Awakened Animal",
  bugbear: "Bugbear",
  centaur: "Centaur",
  dragonet: "Dragonet",
  fetchling: "Fetchling",
  jotunborn: "Jotunborn",
  merfolk: "Merfolk",
  minotaur: "Minotaur",
  samsaran: "Samsaran",
  sarangay: "Sarangay",
  strix: "Strix",
  surki: "Surki",
  tanuki: "Tanuki",
  wayang: "Wayang",
  yaksha: "Yaksha",
  yaoguai: "Yaoguai",
  animist: "Animist",
  commander: "Commander",
  exemplar: "Exemplar",
  guardian: "Guardian",
  gunslinger: "Gunslinger",
  inventor: "Inventor",
  magus: "Magus",
  necromancer: "Necromancer",
  psychic: "Psychic",
  runesmith: "Runesmith",
  summoner: "Summoner",
  thaumaturge: "Thaumaturge",
};
