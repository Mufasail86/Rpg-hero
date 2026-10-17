import type { LicenseId, ReviewStatus, RulesEdition } from "./editions";
import monsters2014 from "./generated/monsters-2014.json";
import monsters2024 from "./generated/monsters-2024.json";
import monstersPf from "./generated/monsters-pf.json";

export interface MonsterCard {
  token: string;
  id: string;
  name: string;
  originalName: string;
  edition: RulesEdition;
  sourceId: string;
  level: number;
  cr: string;
  xp: number | null;
  size: string;
  kind: string;
  traits: string[];
  ac: number;
  hp: number;
  text: string;
  spoiler: "gm";
  status: ReviewStatus;
  checkedOn: string;
  sourceVersion: string;
  license: LicenseId;
}

interface RawMonster {
  id: string;
  name: string;
  originalName: string;
  level: number;
  cr: string;
  xp: number | null;
  size: string;
  kind: string;
  traits: string[];
  ac: number;
  hp: number;
  text: string;
}

const ON = "2026-10-17";

function load(rows: RawMonster[], edition: RulesEdition, sourceId: string, sourceVersion: string, license: LicenseId): MonsterCard[] {
  return rows.map((row) => ({
    token: `${edition}~monster~${row.id}`,
    id: row.id,
    name: row.name,
    originalName: row.originalName,
    edition,
    sourceId,
    level: row.level,
    cr: row.cr,
    xp: row.xp,
    size: row.size,
    kind: row.kind,
    traits: row.traits,
    ac: row.ac,
    hp: row.hp,
    text: row.text,
    spoiler: "gm",
    status: "verified-reference",
    checkedOn: ON,
    sourceVersion,
    license,
  }));
}

let cached: MonsterCard[] | null = null;

export function bestiaryCatalog(): MonsterCard[] {
  if (cached) return cached;
  cached = [
    ...load(monstersPf as RawMonster[], "pf-remaster", "pf-monster-core", "Pathfinder Monster Core", "orc"),
    ...load(monsters2024 as RawMonster[], "dnd-2024", "srd-5.2-monsters", "5.2.1", "cc-by-4.0"),
    ...load(monsters2014 as RawMonster[], "dnd-2014", "srd-5.1-monsters", "5.1", "cc-by-4.0"),
  ];
  return cached;
}

export function monsterByToken(token: string): MonsterCard | undefined {
  return bestiaryCatalog().find((monster) => monster.token === token);
}

export function bestiaryPackCounts(): { id: string; entered: number; verified: number }[] {
  const rows = bestiaryCatalog();
  return ["pf-monster-core", "srd-5.2-monsters", "srd-5.1-monsters"].map((id) => ({
    id,
    entered: rows.filter((row) => row.sourceId === id).length,
    verified: rows.filter((row) => row.sourceId === id && row.status.startsWith("verified")).length,
  }));
}

export const LICENSE_NOTICE: Record<string, { caption: string; english: string }> = {
  "pf-monster-core": {
    caption: "Русская подпись: числа сняты с полей открытого пакета pathfinder-monster-core, книга Pathfinder Monster Core. Ниже английская пометка лицензии.",
    english: "This product includes material from Pathfinder Monster Core and is licensed under the Open RPG Creative (ORC) License, available at https://paizo.com/orclicense. Reserved Material, including setting names and illustrations, is not included.",
  },
  "srd-5.2-monsters": {
    caption: "Русская подпись: числа сняты с бестиария System Reference Document 5.2.1. Ниже английская пометка лицензии.",
    english: "This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.",
  },
  "srd-5.1-monsters": {
    caption: "Русская подпись: числа сняты с бестиария System Reference Document 5.1. Это не блок 2024 года. Ниже английская пометка лицензии.",
    english: "This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.",
  },
};
