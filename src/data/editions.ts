import type { Character, SystemId } from "../types";

/** Редакция правил. Предания сюда не входят: у них свой режим. */
export type RulesEdition = "dnd-2024" | "dnd-2014" | "pf-remaster" | "pf-legacy";

export type LicenseId = "cc-by-4.0" | "ogl-1.0a" | "orc" | "cup" | "summary-only";

/** verified-* ставится только после построчной сверки. pending — пересказ без вычитки. */
export type ReviewStatus = "pending" | "verified-partial" | "verified-reference" | "verified-implemented" | "homebrew";

export type Spoiler = "none" | "player" | "gm";

export interface SourcePack {
  id: string;
  edition: RulesEdition | "lore";
  settingId: string;
  title: string;
  license: LicenseId;
  link: string;
  /** Коротко, почему пакет отдельный. */
  note: string;
  /** null — размер отдельного файла не измеряли, пакет уже внутри сборки. */
  bytes: number | null;
  /** false — выгрузить из сборки нельзя, ядро нужно экранам. */
  removable: boolean;
}

export interface RulesProfile {
  edition: RulesEdition;
  sources: string[];
  /** Свободный текст стола. В формулы не входит. */
  houseRules: string;
}

export const EDITION_NAME: Record<RulesEdition, string> = {
  "dnd-2024": "Правила 2024 года",
  "dnd-2014": "Правила 2014 года",
  "pf-remaster": "Ремастер",
  "pf-legacy": "До ремастера",
};

export const STATUS_NAME: Record<ReviewStatus, string> = {
  pending: "черновик, не сверено",
  "verified-partial": "сверено частично",
  "verified-reference": "сверено, только текст",
  "verified-implemented": "сверено и в расчёте",
  homebrew: "домашнее",
};

export const PACKS: SourcePack[] = [
  {
    id: "srd-5.2",
    edition: "dnd-2024",
    settingId: "",
    title: "Открытый справочник 5.2",
    license: "cc-by-4.0",
    link: "https://www.dndbeyond.com/srd",
    note: "Основной пакет правил 2024 года. Уже внутри сборки сайта и отдельно не выгружается. Пометка 5.2.1 сама по себе сверку не даёт.",
    bytes: null,
    removable: false,
  },
  {
    id: "srd-5.1",
    edition: "dnd-2014",
    settingId: "",
    title: "Открытый справочник 5.1",
    license: "cc-by-4.0",
    link: "https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf",
    note: "Редакция 2014 года хранится отдельно от 5.2. Эта сборка берёт выпуск CC-BY-4.0, не OGL. Карточки лежат в справочнике. Конструктор их в расчёт не подставляет.",
    bytes: null,
    removable: false,
  },
  {
    id: "pf-player-core",
    edition: "pf-remaster",
    settingId: "",
    title: "Ядро игрока, ремастер",
    license: "orc",
    link: "https://paizo.com/orclicense",
    note: "Открытое ядро игрока, лицензия ORC. Старый пересказ, заклинания и карточки черт, оружия и снаряжения из полей Foundry лежат вместе. Сеттинг, имена и рисунки в лицензию ORC не входят. Конструктор предлагает 16 народов и 16 классов ремастера.",
    bytes: null,
    removable: false,
  },
  {
    id: "pf-orc-more",
    edition: "pf-remaster",
    settingId: "",
    title: "Другие книги ORC",
    license: "orc",
    link: "https://paizo.com/orclicense",
    note: "Второе ядро игрока и ядро ведущего, лицензия ORC. Сюда заведены заклинания, народы, классы, черты 1–20, наследия новых народов, алхимия, оружие и руны из полей Foundry. Эффект черты, если он не числом в поле, лист не применяет. Руна на удар сама не наносится. Ядро чудовищ не заводилось.",
    bytes: null,
    removable: true,
  },
  {
    id: "pf-ogl",
    edition: "pf-legacy",
    settingId: "",
    title: "Правила до ремастера",
    license: "ogl-1.0a",
    link: "https://legacy.aonprd.com",
    note: "Старая лицензия OGL. С ремастером не смешивается и на ORC молча не переносится. В пакете черты и снаряжение ядра правил, черты руководства игрока и снаряжение руководства ведущего. Конструктор ремастера этот список не предлагает.",
    bytes: null,
    removable: true,
  },
  {
    id: "lore-golarion",
    edition: "lore",
    settingId: "golarion",
    title: "Голарион, свои краткие пересказы",
    license: "cup",
    link: "https://paizo.com/licenses/communityuse",
    note: "Политика сообщества, некоммерческая. Текст книг, карты и чужие рисунки не копируются. Только свой короткий пересказ и ссылка.",
    bytes: 0,
    removable: true,
  },
  {
    id: "lore-forgotten-realms",
    edition: "lore",
    settingId: "forgotten-realms",
    title: "Забытые королевства, свои краткие пересказы",
    license: "summary-only",
    link: "https://www.dndbeyond.com/sources/dnd/srd",
    note: "Сеттинг в открытый справочник не входит. Политика фанатов не разрешает копировать книги. Карточки отделены от других миров: свой пересказ и ссылка.",
    bytes: 0,
    removable: true,
  },
];

const PACK_BY_ID = new Map(PACKS.map((pack) => [pack.id, pack]));

export function packById(id: string): SourcePack | undefined {
  return PACK_BY_ID.get(id);
}

export function editionsFor(system: SystemId): RulesEdition[] {
  return system === "dnd5e" ? ["dnd-2024", "dnd-2014"] : ["pf-remaster", "pf-legacy"];
}

export function editionMatches(system: SystemId, edition: RulesEdition): boolean {
  return editionsFor(system).includes(edition);
}

export function filledEdition(edition: RulesEdition): boolean {
  return edition === "dnd-2024" || edition === "pf-remaster";
}

export function defaultEdition(system: SystemId): RulesEdition {
  return system === "dnd5e" ? "dnd-2024" : "pf-remaster";
}

export function defaultSources(edition: RulesEdition): string[] {
  if (edition === "dnd-2024") return ["srd-5.2"];
  if (edition === "dnd-2014") return ["srd-5.1"];
  if (edition === "pf-remaster") return ["pf-player-core"];
  return ["pf-ogl"];
}

export function resolveEdition(system: SystemId, edition: RulesEdition | ""): RulesEdition {
  if (edition && editionMatches(system, edition)) return edition;
  return defaultEdition(system);
}

export function sanitizeSources(edition: RulesEdition, sources: string[]): string[] {
  const allowed = sources.filter((id) => packById(id)?.edition === edition);
  return allowed.length ? allowed : defaultSources(edition);
}

export function defaultRules(system: SystemId): RulesProfile {
  const edition = defaultEdition(system);
  return { edition, sources: defaultSources(edition), houseRules: "" };
}

export function rulesOf(character: { system: SystemId; rules?: RulesProfile }): RulesProfile {
  if (!character.rules || !editionMatches(character.system, character.rules.edition)) return defaultRules(character.system);
  return {
    edition: character.rules.edition,
    sources: sanitizeSources(character.rules.edition, character.rules.sources ?? []),
    houseRules: character.rules.houseRules ?? "",
  };
}

/** «ё» и «е» ищутся одинаково. Регистр не важен. */
export function fold(text: string): string {
  return text.toLocaleLowerCase("ru").replaceAll("ё", "е");
}

export function statusVerified(status: ReviewStatus): boolean {
  return status.startsWith("verified");
}

export function applyEdition(character: Character, edition: RulesEdition): { ok: true; character: Character } | { ok: false; error: string } {
  if (!editionMatches(character.system, edition)) {
    return { ok: false, error: "Эта редакция от другой игры. Лист её не смешивает." };
  }
  const current = rulesOf(character);
  return {
    ok: true,
    character: {
      ...character,
      rules: { edition, sources: defaultSources(edition), houseRules: current.houseRules },
    },
  };
}

export function editionPreview(system: SystemId, from: RulesEdition, to: RulesEdition): { ok: true; text: string } | { ok: false; error: string } {
  if (!editionMatches(system, to) || !editionMatches(system, from)) {
    return { ok: false, error: "Эта редакция от другой игры. Лист её не смешивает." };
  }
  return {
    ok: true,
    text: `Сейчас «${EDITION_NAME[from]}». Станет «${EDITION_NAME[to]}». Имя, характеристики, класс и уже выбранные черты не переписываются. Новые записи справочника и конструктора берутся только из пакета новой редакции. Перед сменой на этом телефоне сохраняется запасная копия листа.`,
  };
}

export function licenseCaption(license: LicenseId): string {
  if (license === "cc-by-4.0") return "CC-BY-4.0";
  if (license === "ogl-1.0a") return "OGL 1.0a";
  if (license === "orc") return "ORC";
  if (license === "cup") return "политика сообщества";
  return "свой пересказ и ссылка";
}
