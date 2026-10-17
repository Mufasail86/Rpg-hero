import type { CharacterReminder, DeityCard, VowEntry, VowKind } from "./types";

export const VOW_LABEL: Record<VowKind, string> = {
  taboo: "Табу",
  vow: "Наказ",
  duty: "Обязательство",
  note: "Своя пометка",
};

export const VOW_KINDS: VowKind[] = ["taboo", "vow", "duty", "note"];

/** Памятка не подменяет правила класса. */
export const REMINDER_NOTE = "Это памятка. Она не меняет числа листа: божество само не даёт владений и магии.";

/** Анафема жреца — правило класса, не каждого верующего. */
export const ANATHEMA_NOTE = "Анафема жреца обязательна по правилам класса. Обычного почитателя она не связывает, если класс или черта этого не требуют.";

const EMPTY_DEITY: DeityCard = { name: "", domains: "", symbol: "", weapon: "", edicts: "", anathema: "" };

const PATRONS: Record<string, Pick<DeityCard, "name" | "domains" | "weapon" | "anathema">> = {
  light: { name: "Свет и исцеление", domains: "свет, исцеление", weapon: "булава", anathema: "Не отказывать в помощи раненому без веской причины." },
  knowledge: { name: "Знание", domains: "знание", weapon: "посох", anathema: "Не уничтожать знание нарочно." },
  war: { name: "Доблесть", domains: "война, доблесть", weapon: "длинный меч", anathema: "Не бросать союзника в бою." },
  nature: { name: "Природа", domains: "природа", weapon: "копьё", anathema: "Не губить природу без нужды." },
  secret: { name: "Тайны", domains: "тайны", weapon: "кинжал", anathema: "Не выдавать доверенную тайну." },
};

export function emptyDeity(): DeityCard {
  return { ...EMPTY_DEITY };
}

export function emptyReminder(): CharacterReminder {
  return { backstory: "", deity: emptyDeity(), vows: [] };
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function kindOf(value: unknown): VowKind {
  return value === "taboo" || value === "vow" || value === "duty" || value === "note" ? value : "note";
}

export function reminderOf(character: { reminder?: unknown }): CharacterReminder {
  const raw = (character.reminder ?? null) as {
    backstory?: unknown;
    deity?: Partial<Record<keyof DeityCard, unknown>>;
    vows?: { id?: unknown; kind?: unknown; text?: unknown }[];
  } | null;
  const vows: VowEntry[] = Array.isArray(raw?.vows)
    ? raw.vows
        .filter((row) => row && typeof row.id === "string")
        .map((row) => ({ id: row.id as string, kind: kindOf(row.kind), text: text(row.text) }))
    : [];
  return {
    backstory: text(raw?.backstory),
    deity: {
      name: text(raw?.deity?.name),
      domains: text(raw?.deity?.domains),
      symbol: text(raw?.deity?.symbol),
      weapon: text(raw?.deity?.weapon),
      edicts: text(raw?.deity?.edicts),
      anathema: text(raw?.deity?.anathema),
    },
    vows,
  };
}

export function reminderFilled(reminder: CharacterReminder): boolean {
  if (reminder.backstory.trim()) return true;
  if (reminder.vows.some((row) => row.text.trim())) return true;
  return Object.values(reminder.deity).some((value) => value.trim());
}

export function vowCount(reminder: CharacterReminder): number {
  return reminder.vows.filter((row) => row.text.trim()).length;
}

/** Покровитель жреца из конструктора. Имена сеттинга игрок вписывает сам. */
export function clericPatron(id: string): DeityCard | null {
  const row = PATRONS[id];
  if (!row) return null;
  return { ...emptyDeity(), ...row };
}

export function reminderFromClass(system: string, classId: string, deityId: string): CharacterReminder | undefined {
  if (system !== "pf2e" || classId !== "cleric") return undefined;
  const deity = clericPatron(deityId);
  if (!deity) return undefined;
  return { ...emptyReminder(), deity };
}
