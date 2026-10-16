import { CLASSES as CL5, CONDITIONS as COND5, GENERAL_FEATS, ITEMS as ITEMS5, MASTERY, ORIGIN_FEATS, SKILLS as SK5, SPECIES, SPELLS as SP5, STYLE_FEATS, BACKGROUNDS as BG5 } from "./dnd5e";
import { defaultSources, type LicenseId, type ReviewStatus, type RulesEdition, type Spoiler, packById } from "./editions";
import { LORE } from "./lore";
import pfCorePack from "./generated/pf-core.json";
import pfLegacyPack from "./generated/pf-legacy.json";
import pfListsPack from "./generated/pf-lists.json";
import srd2014Pack from "./generated/srd-2014.json";
import srd2024Pack from "./generated/srd-2024.json";
import { DND_2014, DND_2024_MORE, PF_LEGACY, PF_ORC_MORE, type PackedEntry } from "./packs-extra";
import { ANCESTRIES, BACKGROUNDS as BG2, CLASSES as CL2, CONDITIONS as COND2, ITEMS as ITEMS2, SKILL_FEATS, SKILLS as SK2, SPELLS as SP2 } from "./pf2e";
import { pathOption } from "./pf-index";
import { LINKS, REVIEW } from "./review";
import { VERSATILE } from "./versatile";

export interface RuleEntry {
  token: string;
  localId: string;
  name: string;
  originalName: string;
  altNames: string[];
  system: "dnd5e" | "pf2e" | "lore";
  edition: RulesEdition | "lore";
  settingId: string;
  category: string;
  categoryTitle: string;
  rank: number | null;
  sourceId: string;
  location: string;
  link: string;
  checkedOn: string;
  sourceVersion: string;
  status: ReviewStatus;
  license: LicenseId;
  short: string;
  text: string;
  prereq: string;
  relations: string[];
  relationNotes: string[];
  spoiler: Spoiler;
  canon: "rules" | "summary" | "homebrew";
  era: string;
}

interface Stamp {
  edition: RulesEdition;
  sourceId: string;
  system: "dnd5e" | "pf2e";
}

function tokenOf(edition: string, category: string, localId: string): string {
  return `${edition}~${category}~${localId}`;
}

function make(stamp: Stamp, category: string, categoryTitle: string, localId: string, name: string, short: string | undefined, text: string, rank: number | null = null): RuleEntry {
  const pack = packById(stamp.sourceId);
  const token = tokenOf(stamp.edition, category, localId);
  const review = REVIEW[token];
  return {
    token,
    localId,
    name,
    originalName: review?.originalName ?? "",
    altNames: [],
    system: stamp.system,
    edition: stamp.edition,
    settingId: "",
    category,
    categoryTitle,
    rank,
    sourceId: stamp.sourceId,
    location: review?.location ?? "",
    link: pack?.link ?? "",
    checkedOn: review?.checkedOn ?? "",
    sourceVersion: review?.sourceVersion ?? "",
    status: review?.status ?? "pending",
    license: pack?.license ?? "summary-only",
    short: short ?? "",
    text,
    prereq: "",
    relations: [],
    relationNotes: [],
    spoiler: "none",
    canon: "rules",
    era: "",
  };
}

function fromPacked(entry: PackedEntry, system: "dnd5e" | "pf2e", edition: RulesEdition): RuleEntry {
  const base = make(
    { edition, sourceId: entry.sourceId, system },
    entry.category,
    entry.categoryTitle,
    entry.id,
    entry.name,
    entry.short,
    entry.text,
    entry.rank,
  );
  return {
    ...base,
    originalName: entry.originalName || base.originalName,
    altNames: entry.altNames,
    prereq: entry.prereq,
    location: entry.location || base.location,
    link: entry.link || base.link,
    status: base.checkedOn ? base.status : (entry.status ?? base.status),
    checkedOn: base.checkedOn || entry.checkedOn || "",
    sourceVersion: base.sourceVersion || entry.sourceVersion || "",
  };
}

function rulesEntries(): RuleEntry[] {
  const list: RuleEntry[] = [];
  const dnd: Stamp = { edition: "dnd-2024", sourceId: "srd-5.2", system: "dnd5e" };
  const pf: Stamp = { edition: "pf-remaster", sourceId: "pf-player-core", system: "pf2e" };
  for (const item of SPECIES) {
    list.push(make(dnd, "species", "Народ", item.id, item.name, item.short, item.info));
    for (const line of item.lineage ?? []) list.push(make(dnd, "lineage", "Наследие народа", `${item.id}:${line.id}`, line.name, line.short, line.info));
  }
  for (const item of BG5) list.push(make(dnd, "background", "Происхождение", item.id, item.name, item.short, item.info));
  for (const item of CL5) {
    list.push(make(dnd, "class", "Класс", item.id, item.name, item.short, item.info));
    list.push(make(dnd, "subclass", "Подкласс", `${item.id}-sub`, item.subclass.name, item.subclass.short, item.subclass.info));
  }
  for (const item of ORIGIN_FEATS) list.push(make(dnd, "origin-feat", "Черта происхождения", item.id, item.name, item.short, item.info));
  for (const item of STYLE_FEATS) list.push(make(dnd, "style", "Боевой стиль", item.id, item.name, item.short, item.info));
  for (const item of GENERAL_FEATS) list.push(make(dnd, "general-feat", "Общая черта", item.id, item.name, item.short, item.info));
  for (const item of SK5) list.push(make(dnd, "skill", "Навык", item.id, item.name, item.short, item.info));
  for (const [id, item] of Object.entries(MASTERY)) list.push(make(dnd, "mastery", "Свойство оружия", id, item.name, item.short, item.info));
  for (const item of COND5) list.push(make(dnd, "condition", "Состояние", item.id, item.name, item.short, item.info));
  for (const item of SP5) list.push(make(dnd, "spell", "Заклинание", item.id, item.name, item.short, item.info, item.level));
  for (const item of ITEMS5) list.push(make(dnd, "item", "Предмет", item.id, item.name, item.short, item.info));
  for (const extra of DND_2024_MORE) list.push(fromPacked(extra, "dnd5e", "dnd-2024"));
  for (const extra of srd2024Pack as PackedEntry[]) list.push(fromPacked(extra, "dnd5e", "dnd-2024"));
  for (const extra of DND_2014) list.push(fromPacked(extra, "dnd5e", "dnd-2014"));
  for (const extra of srd2014Pack as PackedEntry[]) list.push(fromPacked(extra, "dnd5e", "dnd-2014"));

  const heldByPack = new Set(
    (pfCorePack as PackedEntry[]).filter((entry) => entry.category === "ancestry" || entry.category === "class").map((entry) => `${entry.category}:${entry.id}`),
  );
  for (const item of ANCESTRIES) {
    if (heldByPack.has(`ancestry:${item.id}`)) continue;
    list.push(make(pf, "ancestry", "Народ", item.id, item.name, item.short, item.info));
    for (const line of item.heritages) list.push(make(pf, "heritage", "Наследие", `${item.id}:${line.id}`, line.name, line.short, line.info));
    for (const feat of item.feats) list.push(make(pf, "ancestry-feat", "Черта народа", feat.id, feat.name, feat.short, feat.info, feat.level));
  }
  for (const item of VERSATILE) {
    list.push({
      ...make(pf, "versatile-heritage", "Универсальное наследие", item.id, item.name, item.short, item.info),
      originalName: item.originalName,
      sourceId: item.sourceId,
      license: packById(item.sourceId)?.license ?? "orc",
      link: packById(item.sourceId)?.link ?? "",
    });
  }
  for (const item of BG2) list.push(make(pf, "background", "Происхождение", item.id, item.name, item.short, item.info));
  for (const item of CL2) {
    const held = heldByPack.has(`class:${item.id}`);
    if (!held) list.push(make(pf, "class", "Класс", item.id, item.name, item.short, item.info));
    for (const choice of item.choices) {
      for (const option of choice.options) {
        const entry = make(pf, "class-choice", choice.title, `${item.id}:${choice.id}:${option.id}`, option.name, option.short, option.info);
        const known = pathOption(choice.id, option.id);
        if (known) {
          const pack = packById("pf-orc-more");
          entry.originalName = known.originalName;
          entry.status = "verified-reference";
          entry.checkedOn = "2026-10-16";
          entry.sourceVersion = "Player Core 2";
          entry.sourceId = "pf-orc-more";
          entry.license = pack?.license ?? entry.license;
          entry.link = pack?.link ?? entry.link;
        }
        list.push(entry);
      }
    }
    if (!held) {
      for (const feat of item.feats) list.push(make(pf, "class-feat", "Черта класса", `${item.id}:${feat.id}`, feat.name, feat.short, feat.info));
    }
  }
  for (const item of SKILL_FEATS) list.push(make(pf, "skill-feat", "Черта", item.id, item.name, item.short, item.info));
  for (const item of SK2) list.push(make(pf, "skill", "Навык", item.id, item.name, item.short, item.info));
  for (const item of COND2) list.push(make(pf, "condition", "Состояние", item.id, item.name, item.short, item.info));
  for (const item of SP2) list.push(make(pf, "spell", "Заклинание", item.id, item.name, item.short, item.info, item.level));
  for (const item of ITEMS2) list.push(make(pf, "item", "Предмет", item.id, item.name, item.short, item.info));
  for (const extra of PF_ORC_MORE) list.push(fromPacked(extra, "pf2e", "pf-remaster"));
  for (const extra of PF_LEGACY) list.push(fromPacked(extra, "pf2e", "pf-legacy"));
  const seen = new Set(list.map((entry) => entry.token));
  for (const extra of pfCorePack as PackedEntry[]) {
    const entry = fromPacked(extra, "pf2e", "pf-remaster");
    if (seen.has(entry.token)) continue;
    seen.add(entry.token);
    list.push(entry);
  }
  for (const extra of pfListsPack as PackedEntry[]) {
    const entry = fromPacked(extra, "pf2e", "pf-remaster");
    if (seen.has(entry.token)) continue;
    seen.add(entry.token);
    list.push(entry);
  }
  for (const extra of pfLegacyPack as PackedEntry[]) {
    const entry = fromPacked(extra, "pf2e", "pf-legacy");
    if (seen.has(entry.token)) continue;
    seen.add(entry.token);
    list.push(entry);
  }
  return list;
}

function loreEntries(): RuleEntry[] {
  return LORE.map((card) => {
    const pack = packById(card.sourceId);
    const token = tokenOf("lore", card.settingId, card.id);
    const review = REVIEW[token];
    return {
      token,
      localId: card.id,
      name: card.name,
      originalName: review?.originalName ?? "",
      altNames: [],
      system: "lore" as const,
      edition: "lore" as const,
      settingId: card.settingId,
      category: "lore",
      categoryTitle: "Предание",
      rank: null,
      sourceId: card.sourceId,
      location: card.location,
      link: card.link,
      checkedOn: review?.checkedOn ?? "",
      sourceVersion: review?.sourceVersion ?? "",
      status: review?.status ?? "pending",
      license: pack?.license ?? "summary-only",
      short: card.short,
      text: card.text,
      prereq: "",
      relations: card.links.map((id) => tokenOf("lore", card.settingId, id)),
      relationNotes: [],
      spoiler: card.spoiler,
      canon: "summary" as const,
      era: card.era,
    };
  });
}

let cached: RuleEntry[] | null = null;

export function allEntries(): RuleEntry[] {
  if (cached) return cached;
  const list = [...rulesEntries(), ...loreEntries()];
  const byToken = new Map(list.map((entry) => [entry.token, entry]));
  for (const link of LINKS) {
    const left = byToken.get(link.from);
    const right = byToken.get(link.to);
    if (!left || !right) continue;
    if (!left.relations.includes(link.to)) {
      left.relations.push(link.to);
      left.relationNotes.push(link.note);
    }
    if (!right.relations.includes(link.from)) {
      right.relations.push(link.from);
      right.relationNotes.push(link.note);
    }
  }
  cached = list;
  return list;
}

export function entryByToken(token: string): RuleEntry | undefined {
  return allEntries().find((entry) => entry.token === token);
}

export function rulesCatalog(): RuleEntry[] {
  return allEntries().filter((entry) => entry.edition !== "lore");
}

export function loreCatalog(): RuleEntry[] {
  return allEntries().filter((entry) => entry.edition === "lore");
}

export function countBy(pick: (entry: RuleEntry) => string, entries = rulesCatalog()): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const key = pick(entry);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function packCounts(): { id: string; entered: number; verified: number }[] {
  const entries = allEntries();
  return ["srd-5.2", "srd-5.1", "pf-player-core", "pf-orc-more", "pf-ogl", "lore-golarion", "lore-forgotten-realms"].map((id) => ({
    id,
    entered: entries.filter((entry) => entry.sourceId === id).length,
    verified: entries.filter((entry) => entry.sourceId === id && entry.status.startsWith("verified")).length,
  }));
}

export function heritageRulesId(localId: string): string {
  const parts = localId.split(":");
  return parts[parts.length - 1] ?? localId;
}

export function versatileIds(): string[] {
  return VERSATILE.map((item) => item.id);
}

export function sourcesForEdition(edition: RulesEdition): string[] {
  return defaultSources(edition);
}
