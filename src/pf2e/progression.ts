import table from "../data/generated/pf-progression.json";
import type { BuildChoice, Pf2eProgress } from "../types";
import type { Rank } from "./build";

const ORDER: Rank[] = ["untrained", "trained", "expert", "master", "legendary"];

interface Bump {
  level: number;
  rank: Rank;
  kind: string;
  keys: string[];
  feature: string;
  when?: string;
}

interface ClassRow {
  start: {
    fort: Rank;
    ref: Rank;
    will: Rank;
    perception: Rank;
    classDc: Rank;
    spell: Rank;
    armor: Record<string, Rank>;
    weapon: Record<string, Rank>;
  };
  bumps: Bump[];
  weaponSpec: number | null;
  greaterWeaponSpec: number | null;
  weaponTrack: string;
  spell: { rank1: number | null; cantrips: number | null; tenthAt: number | null };
  gaps: string[];
  notes: string[];
  doctrine?: { cloistered: Bump[]; warpriest: Bump[] };
}

const CLASSES = table.classes as Record<string, ClassRow>;

function higher(current: Rank, next: Rank): Rank {
  return ORDER.indexOf(current) >= ORDER.indexOf(next) ? current : next;
}

function fighterWeapon(level: number, category: string, group: string, chosen: string | null): Rank {
  if (category === "advanced") {
    if (level >= 19) return "master";
    if (level >= 13) return chosen === group ? "master" : "expert";
    if (level >= 5 && chosen === group) return "expert";
    return "trained";
  }
  if (level >= 19) return "legendary";
  if (level >= 13) return chosen === group ? "legendary" : "master";
  if (level >= 5 && chosen === group) return "master";
  return "expert";
}

export function spellSlotFacts(classId: string): { rank1: number | null; cantrips: number | null; tenthAt: number | null } {
  return CLASSES[classId]?.spell ?? { rank1: null, cantrips: null, tenthAt: null };
}

export function curseMax(level: number): number {
  if (level >= 17) return 4;
  if (level >= 11) return 3;
  return 2;
}

export interface CurseMods {
  enfeebled: number;
  clumsy: number;
  stupefied: number;
  willPenalty: number;
  perceptionPenalty: number;
  fortPenalty: number;
  rangedPenalty: number;
  speedPenalty: number;
  notes: string[];
}

export function curseMods(mysteryId: string, value: number, level: number): CurseMods {
  const mods: CurseMods = {
    enfeebled: 0,
    clumsy: 0,
    stupefied: 0,
    willPenalty: 0,
    perceptionPenalty: 0,
    fortPenalty: 0,
    rangedPenalty: 0,
    speedPenalty: 0,
    notes: [],
  };
  if (value <= 0) return mods;
  if (mysteryId === "cosmos") {
    mods.enfeebled = value;
    mods.notes.push(`Зов неба: ослаблен ${value}. Штраф ${value} к испытаниям и СЛ против насильственного движения в обычные испытания не входит.`);
  } else if (mysteryId === "lore") {
    mods.willPenalty = value;
    mods.perceptionPenalty = value;
    if (value >= 4) {
      mods.stupefied = 1;
      mods.notes.push("Поток знания на 4 ступени: нельзя говорить с союзниками, и вы ошеломлены 1. Заклинания творить можно.");
    }
  } else if (mysteryId === "flames") {
    mods.notes.push(`Пожирающее пламя: длящийся урон огнём ${value}. Сопротивление огню подавлено. Из хитов само не вычитается.`);
  } else if (mysteryId === "bones") {
    if (value >= 4) mods.fortPenalty = 2;
    else if (value >= 2) mods.fortPenalty = 1;
    const weakness = value >= 3 ? 5 + level : 2;
    mods.notes.push(`Живая смерть: уязвимость ${weakness} к жизненной силе и пустоте. Иммунитет к ним подавлен.`);
  } else if (mysteryId === "life") {
    mods.notes.push(`Изливающаяся жизнь: лечение магией уменьшается на ${Math.max(1, level) * value}. Максимум хитов от этого не падает.`);
  } else if (mysteryId === "battle") {
    const penalty = value >= 4 ? 2 : value >= 2 ? 1 : 0;
    const weakness = value >= 3 ? level : 2;
    mods.notes.push(`Смертный воин: уязвимость ${weakness} к урону заклинаний.${penalty ? ` Штраф ${penalty} только к испытаниям против заклинаний, не ко всем.` : ""}`);
  } else if (mysteryId === "ancestors") {
    mods.clumsy = value;
  } else if (mysteryId === "tempest") {
    if (value >= 2) mods.rangedPenalty = 2;
    if (value >= 4) mods.speedPenalty = 10;
    const weakness = value >= 3 ? 5 + level : 2;
    mods.notes.push(`Встречный ветер: уязвимость ${weakness} к электричеству.`);
  } else if (mysteryId) {
    mods.notes.push("У этой тайны в выгрузке нет отдельной ступени с числом. Штраф не подставлен.");
  }
  return mods;
}

export interface ResolvedRanks {
  fort: Rank;
  ref: Rank;
  will: Rank;
  perception: Rank;
  classDc: Rank;
  spell: Rank;
  armor: Rank;
  weaponRank: (category: string, group: string, bomb: boolean) => Rank;
  specialization: (rank: Rank) => number;
  notes: string[];
}

export function resolveRanks(progress: Pf2eProgress, level: number, armorCategory: string, canny: string): ResolvedRanks {
  const row = CLASSES[progress.classId];
  const notes: string[] = [];
  if (!row) {
    const untrained = "untrained" as Rank;
    return {
      fort: "trained",
      ref: "trained",
      will: "trained",
      perception: "trained",
      classDc: "trained",
      spell: untrained,
      armor: untrained,
      weaponRank: () => untrained,
      specialization: () => 0,
      notes: ["Для этого класса в выгрузке нет таблицы владения. Ранги выше обучения не подняты."],
    };
  }
  const saves = { fort: row.start.fort, ref: row.start.ref, will: row.start.will };
  let perception = row.start.perception;
  let classDc = row.start.classDc;
  let spell = row.start.spell;
  const armor = { ...row.start.armor };
  const weapon = { ...row.start.weapon };
  const qi = progress.toggles.includes("qi");
  const warden = progress.toggles.includes("warden");
  const doctrine = progress.choices.find((choice) => choice.source === "doctrine" && choice.level <= level)?.pick ?? "";
  const extra = doctrine === "cloistered" || doctrine === "warpriest" ? row.doctrine?.[doctrine] ?? [] : [];
  if (row.doctrine && !doctrine) notes.push("Доктрина жреца не выбрана. Её ранги в лист не входят, пока не выберете закрытую или военную.");

  const apply = (bump: Bump) => {
    if (bump.level > level || bump.kind === "save-choice") return;
    if (bump.when === "qi" && !qi) return;
    if (bump.when === "warden" && !warden) return;
    const rank = bump.rank;
    if (bump.kind === "save") for (const key of bump.keys) saves[key as "fort" | "ref" | "will"] = higher(saves[key as "fort"], rank);
    if (bump.kind === "perception") perception = higher(perception, rank);
    if (bump.kind === "classDc") classDc = higher(classDc, rank);
    if (bump.kind === "spell") spell = higher(spell, rank);
    if (bump.kind === "armor") for (const key of bump.keys) armor[key] = higher(armor[key] ?? "untrained", rank);
    if (bump.kind === "weapon" && row.weaponTrack !== "fighter") {
      for (const key of bump.keys) weapon[key] = higher(weapon[key] ?? "untrained", rank);
    }
  };
  for (const bump of row.bumps) apply(bump);
  for (const bump of extra) apply(bump);

  const chosenSaves = progress.choices.filter((choice) => choice.source === "monk-save" && choice.level <= level);
  const picked = new Set<string>();
  for (const choice of chosenSaves.filter((choice) => choice.level < 15)) {
    const key = choice.pick;
    if (key !== "fort" && key !== "ref" && key !== "will") continue;
    if (picked.has(key) && choice.level >= 11) {
      notes.push("Второй путь к совершенству берёт другое испытание, не то же самое.");
      continue;
    }
    picked.add(key);
    saves[key] = higher(saves[key], "master");
  }
  const third = chosenSaves.find((choice) => choice.level >= 15);
  if (third && (third.pick === "fort" || third.pick === "ref" || third.pick === "will")) {
    if (!picked.has(third.pick)) notes.push("Третий путь поднимает одно из уже выбранных испытаний. Новое испытание не стало легендарным.");
    else saves[third.pick] = higher(saves[third.pick], "legendary");
  }
  if (progress.classId === "monk" && level >= 7 && chosenSaves.length === 0) {
    notes.push("Путь к совершенству просит выбрать испытание. Лист сам его не назначает, ранг не поднимает.");
  }
  if (row.bumps.some((bump) => bump.when === "qi" && bump.level <= level) && !qi) {
    notes.push("Ранг заклинаний ци в тексте условный. Включите кнопку, если эти заклинания есть: без неё ранг не растёт.");
  }
  if (row.bumps.some((bump) => bump.when === "warden" && bump.level <= level) && !warden) {
    notes.push("Ранг заклинаний смотрителя в тексте условный. Включите кнопку, если они есть: без неё ранг не растёт.");
  }
  if (row.gaps.some((gap) => gap.includes("Weapon Mastery"))) {
    notes.push("Особенность мастерства оружия в выгрузке не содержит фразы для этого класса. Ранг оружия из неё не поднят.");
  }
  if (row.spell.rank1 != null && level > 1) {
    const tenth = row.spell.tenthAt != null && level >= row.spell.tenthAt ? " На 19 уровне есть одна ячейка 10 круга." : "";
    notes.push(`Таблица ячеек по дням в выгрузке не лежит. На 1 уровне сверено ${row.spell.rank1} ячеек 1 круга. Выше лист число кругов не подставляет.${tenth}`);
  }

  if (canny === "fort" || canny === "ref" || canny === "will") {
    saves[canny] = higher(saves[canny], level >= 17 ? "master" : "expert");
  }
  if (canny === "perception") perception = higher(perception, level >= 17 ? "master" : "expert");

  const chosenGroup = progress.choices.find((choice) => choice.source === "weapon-group" && choice.level <= level)?.pick ?? null;
  return {
    fort: saves.fort,
    ref: saves.ref,
    will: saves.will,
    perception,
    classDc,
    spell,
    armor: armor[armorCategory] ?? "untrained",
    weaponRank: (category, group, bomb) => {
      if (row.weaponTrack === "fighter") return fighterWeapon(level, category, group, chosenGroup);
      const base = weapon[category] ?? "untrained";
      if (!bomb) return base;
      return higher(base, weapon.bomb ?? "untrained");
    },
    specialization: (rank) => {
      if (row.weaponSpec == null || level < row.weaponSpec) return 0;
      if (rank === "untrained" || rank === "trained") return 0;
      const greater = row.greaterWeaponSpec != null && level >= row.greaterWeaponSpec;
      if (greater) return rank === "legendary" ? 8 : rank === "master" ? 6 : 4;
      return rank === "legendary" ? 4 : rank === "master" ? 3 : 2;
    },
    notes,
  };
}

export function monkSaveOptions(): { pick: string; name: string }[] {
  return [
    { pick: "fort", name: "Стойкость" },
    { pick: "ref", name: "Рефлексы" },
    { pick: "will", name: "Воля" },
  ];
}

export function doctrineOptions(): { pick: string; name: string }[] {
  return [
    { pick: "cloistered", name: "Закрытая доктрина" },
    { pick: "warpriest", name: "Военная доктрина" },
  ];
}

export function choiceIsSave(choice: BuildChoice): boolean {
  return choice.source === "monk-save";
}
