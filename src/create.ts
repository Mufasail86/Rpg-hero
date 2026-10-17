import { versatileIds } from "./data/catalog";
import { reminderFromClass } from "./reminder";
import { VERSATILE } from "./data/versatile";
import { defaultSources, filledEdition, resolveEdition } from "./data/editions";
import { skillFeatBlock } from "./pf2e/eligibility";
import { FEAT_BY_ID, levelOneClassFeats } from "./data/pf-index";
import { extraGear } from "./data/shop";
import { derive, snapshot } from "./pf2e/build";
import { snapshotDnd } from "./dnd/build";
import {
  ABILITIES,
  ABILITY_NAME,
  type Ability,
  type Character,
  type Draft,
  type FeatInst,
  type ItemInst,
  type Pf2eProgress,
  type SpellInst,
  emptyCoins,
  mod,
  uid,
} from "./types";
import {
  BACKGROUNDS as BG5,
  BACKGROUNDS_2014 as BG2014,
  CLASSES as CL5,
  CONDITIONS as COND5,
  GENERAL_FEATS,
  ITEMS as ITEMS5,
  ORIGIN_FEATS,
  SPECIES,
  SPELLS as SP5,
  STYLE_FEATS,
  itemById as item5,
  skillById as skill5,
} from "./data/dnd5e";
import {
  ANCESTRIES,
  CLASSES as CL2,
  CONDITIONS as COND2,
  ITEMS as ITEMS2,
  SKILL_FEATS,
  SPELLS as SP2,
  backgroundBoostCount,
  backgroundById,
  itemById as item2,
  skillById as skill2,
} from "./data/pf2e";
import { PF_STANDARD, POINT_BUY_BUDGET, armorClass, hpMax, pointBuySpent, refreshSlots, sameMultiset } from "./rules";
import { STANDARD_ARRAY } from "./data/dnd5e";

export type StepId = "system" | "name" | "ancestry" | "background" | "class" | "abilities" | "skills" | "feats" | "gear" | "spells" | "review";

export const STEP_TITLE: Record<StepId, string> = {
  system: "Система",
  name: "Имя",
  ancestry: "Народ",
  background: "Происхождение",
  class: "Класс",
  abilities: "Характеристики",
  skills: "Навыки",
  feats: "Черты",
  gear: "Снаряжение",
  spells: "Заклинания",
  review: "Проверка",
};

export const STEP_HINT: Record<StepId, string> = {
  system: "Сначала игра. Редакции не смешиваются.",
  name: "Имя можно сменить потом на листе.",
  ancestry: "Народ задаёт хиты, скорость и черту.",
  background: "Происхождение — прошлое до приключения.",
  class: "Класс решает, чем герой занят в бою.",
  abilities: "Выберите один способ и доберите числа.",
  skills: "Берите только то, что ещё не закрыто.",
  feats: "Серая черта объясняет, почему её нельзя взять.",
  gear: "Лавка не обрезается: листайте список вниз.",
  spells: "Если класс не колдует, шаг сам пропустится.",
  review: "Проверьте имя и числа, затем создайте лист.",
};

const m = (d: Draft, key: string) => d.multi[key] ?? [];
const c = (d: Draft, key: string) => d.choices[key] ?? "";

export function stepsFor(d: Draft): StepId[] {
  const steps: StepId[] = ["system", "name", "ancestry", "background", "class", "abilities", "skills", "feats", "gear"];
  if (needsSpells(d)) steps.push("spells");
  steps.push("review");
  return steps;
}

export function needsSpells(d: Draft): boolean {
  return classCasts(d);
}

function classCasts(d: Draft): boolean {
  if (!d.system || !d.classId) return false;
  if (d.classId === "custom") return d.customClass.caster !== "none";
  if (d.system === "pf2e") return Boolean(CL2.find((x) => x.id === d.classId)?.spell);
  return Boolean(CL5.find((x) => x.id === d.classId)?.caster);
}

export function validateStep(d: Draft, step: StepId): string | null {
  if (step === "system") return d.system ? null : "Выберите систему.";
  if (!d.system) return "Сначала выберите систему.";
  if (step === "name") return d.name.trim() ? null : "Введите имя персонажа.";
  if (step === "ancestry") return validateAncestry(d);
  if (step === "background") return validateBackground(d);
  if (step === "class") return validateClass(d);
  if (step === "abilities") {
    const scored = scoresOf(d);
    return scored.ok ? null : scored.error;
  }
  if (step === "skills") return validateSkills(d);
  if (step === "feats") return validateFeats(d);
  if (step === "gear") return validateGear(d);
  if (step === "spells") return validateSpells(d);
  if (step === "review") {
    for (const id of stepsFor(d)) {
      if (id === "review") continue;
      const error = validateStep(d, id);
      if (error) return error;
    }
  }
  return null;
}

function activeEdition(d: Draft) {
  return d.system ? resolveEdition(d.system, d.edition) : "dnd-2024";
}

function editionOpen(d: Draft): boolean {
  return d.system ? filledEdition(activeEdition(d)) : true;
}

function validateAncestry(d: Draft): string | null {
  if (!editionOpen(d)) {
    if (d.ancestryId !== "custom") return "В этой редакции готовых народов нет. Выберите свою запись или другую редакцию.";
  }
  if (d.versatileHeritageId) {
    if (d.versatileHeritageId === "umbral") return "«Сумеречный» — наследие гнома, не универсальное.";
    if (!versatileIds().includes(d.versatileHeritageId)) return "Такого универсального наследия в пакете нет.";
  }
  if (!d.ancestryId) return "Выберите народ или свою запись.";
  if (d.ancestryId === "custom") {
    if (!d.customAncestry.name.trim()) return "Назовите свой народ.";
    if (!Number(d.customAncestry.speed)) return "Укажите скорость числом.";
    return null;
  }
  if (d.system === "dnd5e") {
    const species = SPECIES.find((s) => s.id === d.ancestryId);
    if (!species) return "Неизвестный народ.";
    if (species.lineage && !c(d, "lineage")) return "Выберите наследие.";
    if ((species.sizeChoice || species.id === "elf" || species.id === "gnome" || species.id === "tiefling") && species.lineage && !c(d, "lineageAbility") && species.id !== "dragonborn") {
      if (species.id !== "dragonborn" && !c(d, "lineageAbility")) return "Выберите характеристику заклинаний наследия.";
    }
    if (species.sizeChoice && !c(d, "size")) return "Выберите размер.";
    if (species.skillChoice && !c(d, "elfSkill")) return "Выберите навык острых чувств.";
    if (species.originFeat && !c(d, "humanSkill")) return "Выберите навык человека.";
    return null;
  }
  if (!d.heritageId) return "Выберите наследие.";
  return null;
}

function validateBackground(d: Draft): string | null {
  const edition = activeEdition(d);
  const legacyBackground = edition === "dnd-2014" && Boolean(bg2014(d));
  if (!editionOpen(d) && d.backgroundId !== "custom" && !legacyBackground) return "В этой редакции готовых происхождений нет. Выберите свою запись или другую редакцию.";
  if (!d.backgroundId) return "Выберите происхождение или свою запись.";
  if (d.backgroundId === "custom") {
    if (!d.customBackground.name.trim()) return "Назовите своё происхождение.";
    if (d.system === "dnd5e" && c(d, "noBoost") !== "yes") {
      const abs = [c(d, "cba"), c(d, "cbb"), c(d, "cbc")];
      if (new Set(abs).size < 3 || abs.some((x) => !x)) return "Выберите три разные характеристики происхождения.";
    }
    if (d.system === "pf2e") {
      if (!c(d, "cba") || !c(d, "cbb") || c(d, "cba") === c(d, "cbb")) return "Выберите две разные характеристики происхождения.";
      if (editionOpen(d) && !c(d, "customSkill")) return "Выберите навык происхождения.";
    }
    return null;
  }
  if (d.system === "dnd5e" && edition === "dnd-2014" && !bg2014(d)) return "Неизвестное происхождение.";
  if (d.system === "dnd5e" && edition !== "dnd-2014" && !bg5(d)) return "Неизвестное происхождение.";
  if (d.system === "pf2e" && !bg2(d)) return "Неизвестное происхождение.";
  const pf = bg2(d);
  if (pf?.skillChoices.length) {
    const pick = c(d, "bgSkill");
    const allowed = pf.skillChoices.includes("*") ? true : pf.skillChoices.includes(pick);
    if (!pick || !allowed) return "Выберите навык происхождения.";
  }
  if (pf?.featChoices.length && !pf.featChoices.some((feat) => feat.id === c(d, "bgFeat"))) return "Выберите черту происхождения.";
  if (pf?.craftChoices.length && !pf.craftChoices.some((craft) => craft.id === c(d, "bgCraft"))) return "Выберите специальность ремесла.";
  return null;
}

function validateClass(d: Draft): string | null {
  if (!editionOpen(d) && d.classId !== "custom") return "В этой редакции готовых классов нет. Выберите свою запись или другую редакцию.";
  if (!d.classId) return "Выберите класс или свою запись.";
  if (d.classId === "custom") {
    if (!d.customClass.name.trim()) return "Назовите свой класс.";
    if (!Number(d.customClass.hit)) return "Укажите кость хитов или хиты класса числом.";
    return null;
  }
  if (d.system === "dnd5e") {
    const cls = CL5.find((x) => x.id === d.classId);
    if (!cls) return "Неизвестный класс.";
    if ((cls.id === "cleric" || cls.id === "druid") && !c(d, "order")) return "Выберите орден или порядок.";
    return null;
  }
  const cls = CL2.find((x) => x.id === d.classId);
  if (!cls) return "Неизвестный класс.";
  for (const choice of cls.choices) {
    if (!c(d, choice.id)) return `Выберите: ${choice.title}.`;
  }
  if (cls.id === "fighter" && !c(d, "fighterSkill")) return "Выберите Атлетику или Акробатику.";
  if (cls.id === "cleric" && c(d, "deity") === "knowledge" && !c(d, "deitySkill")) return "Выберите навык покровителя знания.";
  if (cls.id === "cleric" && c(d, "deity") === "secret" && !c(d, "deitySkill")) return "Выберите навык покровителя тайны.";
  return null;
}

function validateSkills(d: Draft): string | null {
  if (!editionOpen(d)) return null;
  const scores = scoresOf(d);
  if (!scores.ok) return "Сначала закончите характеристики.";
  const need = skillNeed(d, scores.scores);
  const picked = m(d, "skills");
  if (picked.length !== need) return `Выберите навыки: ${picked.length} из ${need}.`;
  if (new Set(picked).size !== picked.length) return "Навыки не должны повторяться.";
  const fixed = new Set(fixedSkills(d));
  if (picked.some((id) => fixed.has(id))) return "Этот навык уже дан народом, происхождением или классом. Выберите другой.";
  return null;
}

function validateFeats(d: Draft): string | null {
  if (!editionOpen(d)) return null;
  if (d.system === "dnd5e") {
    const cls = CL5.find((x) => x.id === d.classId);
    if (cls?.fightingStyle && !c(d, "style")) return "Выберите боевой стиль.";
    if (cls?.mastery && m(d, "mastery").length !== cls.mastery) return `Отметьте оружие мастерства: ${cls.mastery}.`;
    if (cls?.expertise && m(d, "expertise").length !== cls.expertise) return "Выберите два навыка экспертизы среди тех, которыми владеете.";
    if (d.ancestryId === "human" && !c(d, "humanFeat")) return "Выберите вторую черту происхождения.";
    if (d.ancestryId === "human" && c(d, "humanFeat") === "skilled" && m(d, "hskilled").length !== 3) return "Одарённый даёт три навыка или инструмента. Отметьте три.";
    const magicError = magicPicks(d, bg5(d)?.feat ?? "", "bg");
    if (magicError) return magicError;
    const humanMagic = magicPicks(d, c(d, "humanFeat"), "h");
    if (humanMagic) return humanMagic;
    return null;
  }
  if (d.heritageId === "skilled" && !c(d, "humanSkill")) return "Умелое наследие: выберите дополнительный навык.";
  if (d.ancestryId !== "custom" && !c(d, "ancestryFeat")) return "Выберите черту народа.";
  if (!c(d, "skillFeat")) return "Выберите черту навыка.";
  const skillBlock = skillFeatBlock(c(d, "skillFeat"), trainedOf(d));
  if (skillBlock) return skillBlock;
  const generalSlot = d.heritageId === "versatile" || c(d, "ancestryFeat") === "general-training";
  if (generalSlot && !c(d, "generalFeat")) return "Выберите общую черту: её даёт универсальное наследие или «Общая подготовка».";
  const cls = CL2.find((x) => x.id === d.classId);
  const ambition = c(d, "ancestryFeat") === "natural-ambition";
  const listed = d.classId === "custom" ? [] : levelOneClassFeats(d.classId);
  const known = new Set([...(cls?.feats.map((feat) => feat.id) ?? []), ...listed.map((feat) => feat.id)]);
  if ((cls?.featLevel1 || ambition) && d.classId !== "custom" && known.size > 0 && !c(d, "classFeat")) return "Выберите классовую черту.";
  if (c(d, "classFeat") && known.size > 0 && !known.has(c(d, "classFeat"))) return "Эта классовая черта не из списка этого класса.";
  return null;
}

function trainedOf(d: Draft): Set<string> {
  return new Set([...fixedSkills(d), ...m(d, "skills")]);
}

function magicPicks(d: Draft, feat: string, prefix: string): string | null {
  if (!feat.startsWith("magic")) return null;
  const list = feat.endsWith("wizard") ? "wizard" : feat.endsWith("druid") ? "druid" : "cleric";
  if (!c(d, `${prefix}Spell`)) return "Выберите заклинание 1-го круга для посвящения в магию.";
  if (!c(d, `${prefix}c1`) || !c(d, `${prefix}c2`) || c(d, `${prefix}c1`) === c(d, `${prefix}c2`)) return "Выберите два разных заговора посвящения.";
  const spell = SP5.find((s) => s.id === c(d, `${prefix}Spell`));
  const c1 = SP5.find((s) => s.id === c(d, `${prefix}c1`));
  const c2 = SP5.find((s) => s.id === c(d, `${prefix}c2`));
  if (!spell || spell.level !== 1 || !spell.classes.includes(list)) return "Заклинание посвящения должно быть 1-го круга из нужного списка.";
  if (!c1 || !c2 || c1.level !== 0 || c2.level !== 0 || !c1.classes.includes(list) || !c2.classes.includes(list)) return "Заговоры посвящения должны быть из того же списка.";
  if (!c(d, `${prefix}Ability`)) return "Выберите характеристику заклинаний посвящения.";
  return null;
}

function validateGear(d: Draft): string | null {
  if (!editionOpen(d)) return d.gearMode ? null : "Отметьте, что снаряжение этой редакции ещё не заведено.";
  if (!d.gearMode) return "Выберите набор или покупку за золото.";
  const purse = purseOf(d);
  if (!purse.ok) return purse.error;
  return null;
}

function validateSpells(d: Draft): string | null {
  if (!needsSpells(d)) return null;
  const scores = scoresOf(d);
  if (!scores.ok) return scores.error;
  const limits = spellLimits(d, scores.scores);
  const known = d.knownSpells.filter((id) => spellLevel(d, id) === 0);
  const leveled = d.knownSpells.filter((id) => spellLevel(d, id) > 0);
  if (known.length !== limits.cantrips && limits.cantrips > 0) return `Заговоры: ${known.length} из ${limits.cantrips}.`;
  if (limits.kind === "known" || limits.kind === "pact") {
    if (leveled.length !== limits.known) return `Известные заклинания 1-го круга: ${leveled.length} из ${limits.known}.`;
  }
  if (limits.kind === "book") {
    if (leveled.length < limits.known) return `В книгу нужно записать заклинания: ${leveled.length} из ${limits.known}.`;
  }
  if (limits.kind === "prepared" || limits.kind === "book") {
    const prepared = d.preparedSpells.filter((id) => spellLevel(d, id) > 0);
    if (prepared.length !== limits.prepare) return `Подготовьте заклинания 1-го круга: ${prepared.length} из ${limits.prepare}.`;
  }
  return null;
}

export function scoresOf(d: Draft): { ok: true; scores: Record<Ability, number> } | { ok: false; error: string } {
  if (!d.system) return { ok: false, error: "Нет системы." };
  const method = c(d, "abilityMethod");
  if (!method) return { ok: false, error: "Выберите способ набора характеристик." };
  if (d.system === "dnd5e") return scores5(d, method);
  return scores2(d, method);
}

function scores5(d: Draft, method: string): { ok: true; scores: Record<Ability, number> } | { ok: false; error: string } {
  if (method === "pointbuy") {
    if (ABILITIES.some((id) => d.scores[id] < 8 || d.scores[id] > 15)) return { ok: false, error: "Покупка очков: значения от 8 до 15." };
    const spent = pointBuySpent(d.scores);
    if (spent > POINT_BUY_BUDGET) return { ok: false, error: `Потрачено ${spent} из ${POINT_BUY_BUDGET}. Убавьте характеристику.` };
  } else if (method === "standard") {
    if (!sameMultiset(ABILITIES.map((id) => d.scores[id]), STANDARD_ARRAY)) return { ok: false, error: "Разложите стандартный набор 15, 14, 13, 12, 10, 8 без повторов сверх списка." };
  } else if (method === "roll") {
    if (d.pool.length !== 6) return { ok: false, error: "Сначала бросьте кости для всех шести характеристик." };
    if (!sameMultiset(ABILITIES.map((id) => d.scores[id]), d.pool)) return { ok: false, error: "Назначьте каждый бросок ровно одной характеристике." };
  } else return { ok: false, error: "Неизвестный способ." };
  const scores = { ...d.scores };
  const abs = backgroundAbilityList(d);
  if (abs.length === 3 && c(d, "noBoost") !== "yes") {
    const mode = c(d, "boostMode");
    if (mode !== "split" && mode !== "all") return { ok: false, error: "Выберите, как распределить прибавки происхождения: +2/+1 или +1/+1/+1." };
    if (mode === "all") {
      for (const ability of abs) scores[ability] += 1;
    } else {
      const a = c(d, "boost2") as Ability;
      const b = c(d, "boost1") as Ability;
      if (!abs.includes(a) || !abs.includes(b) || a === b) return { ok: false, error: "Прибавки +2 и +1 должны уйти в две разные характеристики из трёх." };
      scores[a] += 2;
      scores[b] += 1;
    }
  }
  if (ABILITIES.some((id) => scores[id] > 20)) return { ok: false, error: "Характеристика не может стать выше 20." };
  return { ok: true, scores };
}

function scores2(d: Draft, method: string): { ok: true; scores: Record<Ability, number> } | { ok: false; error: string } {
  if (method === "standard") {
    if (!sameMultiset(ABILITIES.map((id) => d.scores[id]), PF_STANDARD)) return { ok: false, error: "Разложите набор 18, 14, 14, 12, 10, 10." };
    return { ok: true, scores: { ...d.scores } };
  }
  if (method === "roll") {
    if (d.pool.length !== 6) return { ok: false, error: "Сначала бросьте 4d6 шесть раз." };
    if (!sameMultiset(ABILITIES.map((id) => d.scores[id]), d.pool)) return { ok: false, error: "Назначьте каждый бросок." };
    return { ok: true, scores: { ...d.scores } };
  }
  if (method !== "boost") return { ok: false, error: "Для ремастера выберите повышения, набор или бросок." };
  const scores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const partial: Record<Ability, boolean> = { str: false, dex: false, con: false, int: false, wis: false, cha: false };
  const boost = (ability: Ability) => {
    if (scores[ability] >= 18) {
      if (partial[ability]) {
        scores[ability] += 2;
        partial[ability] = false;
      } else partial[ability] = true;
    } else scores[ability] += 2;
  };
  const ancestry = ANCESTRIES.find((a) => a.id === d.ancestryId);
  const freeMode = d.ancestryId === "custom" || c(d, "ancestryMode") === "free" || (ancestry && ancestry.boosts.length === 0);
  if (freeMode) {
    const picks = m(d, "ancestryBoosts") as Ability[];
    if (picks.length !== 2 || new Set(picks).size !== 2) return { ok: false, error: "Народ: два разных свободных повышения." };
    picks.forEach(boost);
  } else if (ancestry) {
    ancestry.boosts.forEach(boost);
    const free = c(d, "ancFree") as Ability;
    if (!free || ancestry.boosts.includes(free)) return { ok: false, error: "Выберите свободное повышение народа — не то, которое уже дано." };
    boost(free);
    if (ancestry.flaw) scores[ancestry.flaw] -= 2;
  }
  const background = bg2(d);
  const fixed = c(d, "bgFixed") as Ability;
  const free = c(d, "bgFree") as Ability;
  if (!background || (background.abilities.length === 2 && background.freeBoosts === 1)) {
    const options = backgroundAbilityList(d);
    if (options.length >= 2) {
      if (!options.includes(fixed)) return { ok: false, error: "Повышение происхождения должно быть одним из двух предложенных." };
      if (!free || free === fixed) return { ok: false, error: "Второе повышение происхождения — другая характеристика." };
      boost(fixed);
      boost(free);
    }
  } else {
    const used = new Set<Ability>();
    if (background.abilities.length) {
      if (!background.abilities.includes(fixed)) return { ok: false, error: "Повышение происхождения должно быть из его списка." };
      boost(fixed);
      used.add(fixed);
    }
    const freeKeys = ["bgFree", "bgFree2", "bgFree3"].slice(0, background.freeBoosts);
    for (const key of freeKeys) {
      const pick = c(d, key) as Ability;
      if (!pick || used.has(pick)) return { ok: false, error: "Свободные повышения происхождения идут в разные характеристики." };
      boost(pick);
      used.add(pick);
    }
  }
  const key = classKey(d);
  if (!key) return { ok: false, error: "Не выбрана ключевая характеристика класса." };
  boost(key);
  const frees = m(d, "freeBoosts") as Ability[];
  if (frees.length !== 4 || new Set(frees).size !== 4) return { ok: false, error: "Четыре свободных повышения должны уйти в четыре разные характеристики." };
  frees.forEach(boost);
  return { ok: true, scores };
}

export function originAbilities(d: Draft): Ability[] {
  return backgroundAbilityList(d);
}

function backgroundAbilityList(d: Draft): Ability[] {
  if (d.backgroundId === "custom") {
    if (c(d, "noBoost") === "yes") return [];
    return [c(d, "cba"), c(d, "cbb"), c(d, "cbc")].filter(Boolean) as Ability[];
  }
  if (d.system === "dnd5e") return activeBackground5(d)?.abilities ?? [];
  return bg2(d)?.abilities ?? [];
}

export function classKey(d: Draft): Ability | null {
  if (d.classId === "custom") return d.customClass.key;
  if (d.system === "pf2e") {
    const cls = CL2.find((x) => x.id === d.classId);
    if (!cls) return null;
    if (cls.id === "rogue") {
      const racket = c(d, "racket");
      if (racket === "ruffian" && c(d, "rogueKey")) return c(d, "rogueKey") as Ability;
      if (racket === "scoundrel" && c(d, "rogueKey")) return c(d, "rogueKey") as Ability;
      return "dex";
    }
    if (cls.key.length === 1) return cls.key[0];
    const key = c(d, "key");
    return (key as Ability) || null;
  }
  return CL5.find((x) => x.id === d.classId)?.primary[0] ?? "str";
}

export interface ChoiceMeter {
  id: string;
  label: string;
  have: number;
  need: number;
}

/** Отдельные счётчики шага: навыки, повышения, черты и заклинания не складываются в одну цифру. */
export function creationMeters(d: Draft): ChoiceMeter[] {
  const meters: ChoiceMeter[] = [];
  if (d.system === "pf2e" && (d.choices.abilityMethod ?? "boost") === "boost" && d.ancestryId) {
    const ancestry = ANCESTRIES.find((item) => item.id === d.ancestryId);
    const free = d.ancestryId === "custom" || c(d, "ancestryMode") === "free" || Boolean(ancestry && ancestry.boosts.length === 0);
    if (free) meters.push({ id: "ancestry-boost", label: "Повышения народа", have: m(d, "ancestryBoosts").length, need: 2 });
    const backgroundNeed = backgroundBoostCount(bg2(d));
    meters.push({
      id: "background-boost",
      label: "Повышения происхождения",
      have: ["bgFixed", "bgFree", "bgFree2", "bgFree3"].filter((key) => c(d, key)).length,
      need: backgroundNeed,
    });
    meters.push({ id: "free-boost", label: "Свободные повышения", have: m(d, "freeBoosts").length, need: 4 });
  }
  const scored = scoresOf(d);
  if (scored.ok && d.classId) {
    meters.push({ id: "skills", label: "Свободные навыки", have: m(d, "skills").length, need: skillNeed(d, scored.scores) });
  }
  if (d.system === "pf2e" && d.classId) {
    meters.push({ id: "ancestry-feat", label: "Черта народа", have: c(d, "ancestryFeat") ? 1 : 0, need: 1 });
    meters.push({ id: "skill-feat", label: "Черта навыка", have: c(d, "skillFeat") ? 1 : 0, need: 1 });
    const cls = CL2.find((item) => item.id === d.classId);
    if (cls?.featLevel1 && (cls.feats.length > 0 || levelOneClassFeats(cls.id).length > 0)) meters.push({ id: "class-feat", label: "Черта класса", have: c(d, "classFeat") ? 1 : 0, need: 1 });
  }
  if (d.system === "dnd5e" && d.ancestryId === "human") {
    meters.push({ id: "origin-feat", label: "Черта происхождения", have: c(d, "humanFeat") ? 1 : 0, need: 1 });
  }
  const budget = spellBudget(d);
  if (budget && budget.cantrips > 0) {
    const extra = budget.kind === "known" || budget.kind === "pact" ? budget.known : budget.kind === "book" ? budget.known : budget.prepare;
    meters.push({
      id: "spells",
      label: budget.kind === "prepared" ? "Подготовленные и заговоры" : "Известные заклинания",
      have: d.knownSpells.length,
      need: budget.cantrips + extra,
    });
  }
  return meters;
}

export function skillNeed(d: Draft, scores: Record<Ability, number>): number {
  if (d.classId === "custom") return d.system === "pf2e" ? Math.max(0, 2 + mod(scores.int)) : 2;
  if (d.system === "dnd5e") return CL5.find((x) => x.id === d.classId)?.skillCount ?? 2;
  const cls = CL2.find((x) => x.id === d.classId);
  return Math.max(0, (cls?.extraSkills ?? 2) + mod(scores.int));
}

export function fixedSkills(d: Draft): string[] {
  const list: string[] = [];
  if (d.system === "dnd5e") {
    const bg = activeBackground5(d);
    if (bg) list.push(...bg.skills);
    if (d.ancestryId === "elf" && c(d, "elfSkill")) list.push(c(d, "elfSkill"));
    if (d.ancestryId === "human" && c(d, "humanSkill")) list.push(c(d, "humanSkill"));
    if (c(d, "order") === "thaumaturge") list.push("arcana");
    if (d.backgroundId === "custom" && c(d, "customSkill")) list.push(c(d, "customSkill"));
    if (c(d, "humanFeat") === "skilled") list.push(...m(d, "hskilled"));
    return list;
  }
  const bg = bg2(d);
  if (bg) {
    list.push(...bg.skills);
    if (c(d, "bgSkill")) list.push(c(d, "bgSkill"));
  }
  if (d.backgroundId === "custom" && c(d, "customSkill")) list.push(c(d, "customSkill"));
  const cls = CL2.find((x) => x.id === d.classId);
  if (cls) list.push(...cls.skillsFixed);
  if (cls?.id === "fighter" && c(d, "fighterSkill")) list.push(c(d, "fighterSkill"));
  if (cls?.id === "cleric") list.push(deitySkill(d));
  if (cls?.id === "druid") list.push(d.choices.order === "leaf" ? "medicine" : d.choices.order === "storm" ? "acrobatics" : "athletics");
  if (cls?.id === "witch") list.push(patronSkill(d));
  if (cls?.id === "rogue") list.push(d.choices.racket === "ruffian" ? "intimidation" : d.choices.racket === "scoundrel" ? "deception" : "thievery");
  if (d.heritageId === "skilled" && c(d, "humanSkill")) list.push(c(d, "humanSkill"));
  if (c(d, "ancestryFeat") === "dwarf-lore") list.push("crafting", "religion");
  return list.filter(Boolean);
}

function deitySkill(d: Draft): string {
  const deity = c(d, "deity");
  if (deity === "light") return "medicine";
  if (deity === "war") return "athletics";
  if (deity === "nature") return "nature";
  if (deity === "knowledge" || deity === "secret") return c(d, "deitySkill");
  return "";
}

function patronSkill(d: Draft): string {
  const patron = c(d, "patron");
  if (patron === "faith") return "religion";
  if (patron === "wild") return "nature";
  if (patron === "fate") return "occultism";
  return "arcana";
}

export function spellBudget(d: Draft) {
  const scores = scoresOf(d);
  if (!scores.ok) return null;
  return spellLimits(d, scores.scores);
}

function spellLimits(d: Draft, scores: Record<Ability, number>) {
  if (d.classId === "custom") {
    const kind = (d.customClass.caster || "prepared") as "prepared" | "known" | "pact" | "book" | "none";
    return { cantrips: kind === "none" ? 0 : 3, known: 2, prepare: Math.max(1, mod(scores[d.customClass.key]) + 1), kind };
  }
  if (d.system === "pf2e") {
    const cls = CL2.find((x) => x.id === d.classId);
    const spontaneous = cls?.id === "bard" || cls?.id === "sorcerer" || cls?.id === "oracle";
    const kind = spontaneous ? "known" : cls?.id === "wizard" ? "book" : "prepared";
    return {
      cantrips: cls?.spell?.cantrips ?? 0,
      known: cls?.id === "bard" ? 2 : spontaneous ? (cls?.spell?.slots ?? 2) : cls?.id === "wizard" ? 10 : 99,
      prepare: cls?.spell?.slots ?? 2,
      kind,
    };
  }
  const cls = CL5.find((x) => x.id === d.classId);
  const extra = c(d, "order") === "thaumaturge" || c(d, "order") === "magician" ? 1 : 0;
  const ability = cls?.caster ? mod(scores[cls.caster.ability]) : 0;
  const half = cls?.id === "paladin" || cls?.id === "ranger";
  return {
    cantrips: (cls?.caster?.cantrips ?? 0) + extra,
    known: cls?.caster?.kind === "book" ? 6 : (cls?.caster?.known ?? 2),
    prepare: half ? Math.max(1, ability) : Math.max(1, ability + 1),
    kind: cls?.caster?.kind ?? "prepared",
  };
}

function spellLevel(d: Draft, id: string): number {
  if (id.startsWith("custom:")) {
    const index = Number(id.slice(7));
    return Number(d.customSpells[index]?.level ?? 0);
  }
  if (d.system === "pf2e") return SP2.find((s) => s.id === id)?.level ?? 0;
  return SP5.find((s) => s.id === id)?.level ?? 0;
}

export function gearPreview(d: Draft) {
  return purseOf(d);
}

function purseOf(d: Draft): { ok: true; copper: number; items: { id: string; qty: number; equipped?: boolean }[] } | { ok: false; error: string } {
  if (d.system === "dnd5e") {
    const cls = CL5.find((x) => x.id === d.classId);
    const packs = cls?.packages ?? [];
    const pack = d.gearMode === "gold" ? packs.find((p) => p.items.length === 0) ?? packs[packs.length - 1] : packs.find((p) => p.id === d.gearMode);
    if (d.classId !== "custom" && !pack && d.gearMode !== "gold") return { ok: false, error: "Выберите набор класса." };
    let copper = (pack?.gp ?? (d.gearMode === "gold" ? 50 : 0)) * 100;
    const bg = activeBackground5(d);
    if (d.choices.bgGear === "gold") copper += 50 * 100;
    else if (bg) copper += bg.gp * 100;
    const items: { id: string; qty: number; equipped?: boolean }[] = (pack?.items ?? []).map((row) => ({
      id: row.id,
      qty: row.qty ?? 1,
      equipped: row.equipped,
    }));
    if (bg && d.choices.bgGear !== "gold") items.push(...bg.package.map((row) => ({ id: row.id, qty: row.qty ?? 1 })));
    for (const bought of d.bought) {
      const cat = item5(bought.id);
      if (!cat) return { ok: false, error: "Неизвестный предмет." };
      copper -= cat.costCp * bought.qty;
      items.push({ id: bought.id, qty: bought.qty, equipped: false });
    }
    if (copper < 0) return { ok: false, error: "Не хватает монет на выбранные покупки." };
    return { ok: true, copper, items };
  }
  let copper = 15 * 100;
  const items: { id: string; qty: number; equipped?: boolean }[] = [];
  if (d.gearMode === "kit") {
    const cls = CL2.find((x) => x.id === d.classId);
    for (const id of cls?.kit ?? []) {
      const cat = item2(id);
      if (!cat) continue;
      copper -= cat.costCp;
      items.push({ id, qty: 1, equipped: cat.kind === "armor" || cat.kind === "weapon" || cat.kind === "shield" });
    }
  }
  for (const bought of d.bought) {
    const cat = item2(bought.id);
    if (!cat) return { ok: false, error: "Неизвестный предмет." };
    copper -= cat.costCp * bought.qty;
    items.push({ id: bought.id, qty: bought.qty });
  }
  if (copper < 0) return { ok: false, error: "Стартовых 15 зм не хватает. Уберите часть покупок." };
  return { ok: true, copper, items };
}

function bg5(d: Draft) {
  return BG5.find((b) => b.id === d.backgroundId);
}
function bg2014(d: Draft) {
  return BG2014.find((b) => b.id === d.backgroundId);
}
function activeBackground5(d: Draft) {
  return activeEdition(d) === "dnd-2014" ? bg2014(d) : bg5(d);
}
function bg2(d: Draft) {
  return d.system === "pf2e" ? backgroundById(d.backgroundId) : undefined;
}

export function createCharacter(d: Draft): { ok: true; character: Character } | { ok: false; error: string } {
  const error = validateStep(d, "review");
  if (error) return { ok: false, error };
  const scored = scoresOf(d);
  if (!scored.ok) return scored;
  const character = d.system === "dnd5e" ? build5(d, scored.scores) : build2(d, scored.scores);
  character.level = targetLevel(d);
  if (character.system === "dnd5e" && character.level > 1) {
    const average = Math.floor(character.hitDie / 2) + 1;
    character.hpRolls = Array.from({ length: character.level }, (_, index) => character.hpRolls[index] ?? average);
    character.hitDice = { ...character.hitDice, max: character.level, current: character.level };
  }
  let withSlots = refreshSlots(character);
  if (withSlots.system === "pf2e" && withSlots.progress) withSlots = snapshot(withSlots);
  if (withSlots.system === "dnd5e" && withSlots.dnd) withSlots = snapshotDnd(withSlots);
  withSlots.hpCurrent = hpMax(withSlots);
  withSlots.hpTemp = 0;
  if (d.system) {
    const edition = activeEdition(d);
    withSlots.rules = { edition, sources: defaultSources(edition), houseRules: "" };
  }
  if (d.versatileHeritageId) withSlots.versatileHeritageId = d.versatileHeritageId;
  return { ok: true, character: withSlots };
}

function build5(d: Draft, scores: Record<Ability, number>): Character {
  const species = SPECIES.find((s) => s.id === d.ancestryId);
  const cls = CL5.find((x) => x.id === d.classId);
  const bg = activeBackground5(d);
  const custom = d.ancestryId === "custom";
  const speed = species?.id === "elf" && c(d, "lineage") === "wood" ? 35 : custom ? Number(d.customAncestry.speed) || 30 : species?.speed ?? 30;
  const size = species?.sizeChoice ? c(d, "size") || "Средний" : custom ? d.customAncestry.size || "Средний" : species?.size ?? "Средний";
  const feats: FeatInst[] = [];
  const features = [...(cls?.features ?? [])];
  if (c(d, "order") === "protector") features.push({ name: "Защитник", info: "Владение воинским оружием и тяжёлыми доспехами." });
  if (c(d, "order") === "thaumaturge") features.push({ name: "Дополнительный заговор", info: "Чудотворец знает ещё один заговор жреца и владеет навыком Магия." });
  if (c(d, "order") === "magician") features.push({ name: "Дополнительный заговор", info: "Порядок мага даёт ещё один заговор друида." });
  if (c(d, "order") === "warden") features.push({ name: "Страж", info: "Владение воинским оружием и средними доспехами." });
  if (bg) {
    const feat = ORIGIN_FEATS.find((f) => f.id === bg.feat);
    if (feat) feats.push({ id: feat.id, name: feat.name, info: feat.info });
  }
  if (d.ancestryId === "human") {
    const feat = ORIGIN_FEATS.find((f) => f.id === c(d, "humanFeat"));
    if (feat) feats.push({ id: `human-${feat.id}`, name: feat.name, info: feat.info });
  }
  if (cls?.fightingStyle) {
    const style = STYLE_FEATS.find((f) => f.id === c(d, "style"));
    if (style) feats.push({ id: style.id, name: style.name, info: style.info });
  }
  for (const feat of d.customFeats) {
    if (feat.name.trim()) feats.push({ id: uid(), name: feat.name.trim(), info: feat.info || "Своя черта." });
  }
  const ranks: Record<string, string> = {};
  for (const id of fixedSkills(d)) ranks[id] = "proficient";
  for (const id of m(d, "skills")) ranks[id] = "proficient";
  for (const id of m(d, "expertise")) if (ranks[id]) ranks[id] = "expertise";
  const saves: Record<string, string> = {};
  for (const ability of ABILITIES) saves[ability] = "untrained";
  for (const ability of cls?.saves ?? [d.customClass.key, "con"]) saves[ability] = "proficient";
  const weaponRules = {
    simple: cls?.weaponRules.simple ?? true,
    martial: cls?.weaponRules.martial ?? false,
    martialFinesseOrLight: cls?.weaponRules.martialFinesseOrLight ?? false,
    martialLight: cls?.weaponRules.martialLight ?? false,
    unarmed: true,
  };
  if (c(d, "order") === "protector" || c(d, "order") === "warden") weaponRules.martial = true;
  const armor = new Set(cls?.armor ?? []);
  if (c(d, "order") === "protector") armor.add("heavy");
  if (c(d, "order") === "warden") armor.add("medium");
  const purse = purseOf(d);
  const items = purse.ok ? materialize(purse.items, ITEMS5, true) : [];
  for (const customItem of d.customItems) {
    if (!customItem.name.trim()) continue;
    items.push({
      uid: uid(),
      name: customItem.name.trim(),
      qty: Number(customItem.qty) || 1,
      weight: Number(customItem.weight) || 0,
      equipped: false,
      kind: customItem.kind,
      notes: "Своя запись",
    });
  }
  const spells = collectSpells(d, "dnd5e");
  const lineage = species?.lineage?.find((l) => l.id === c(d, "lineage"));
  const resources = resources5(d, scores);
  const hitDie = cls?.hitDie ?? (Number(d.customClass.hit) || 8);
  const character: Character = {
    id: uid(),
    system: "dnd5e",
    name: d.name.trim(),
    photo: d.photo,
    level: 1,
    xp: 0,
    hpCurrent: 1,
    hpTemp: 0,
    hpBonus: 0,
    hpRolls: [hitDie],
    hero: d.ancestryId === "human" ? 1 : 0,
    abilities: scores,
    ancestryId: d.ancestryId,
    ancestryName: custom ? d.customAncestry.name.trim() : species?.name ?? "Народ",
    ancestryInfo: custom ? d.customAncestry.info || "Своя запись народа." : `${species?.info ?? ""}${lineage ? ` Выбрано: ${lineage.name}. ${lineage.info}` : ""}`,
    size,
    speed,
    senses: species?.senses ?? "Обычное зрение",
    ancestryHp: 0,
    tough: Boolean(species?.tough),
    backgroundId: d.backgroundId,
    backgroundName: d.backgroundId === "custom" ? d.customBackground.name.trim() : bg?.name ?? "Происхождение",
    backgroundInfo: d.backgroundId === "custom" ? d.customBackground.info || "Своя запись." : bg?.info ?? "",
    classId: d.classId,
    className: d.classId === "custom" ? d.customClass.name.trim() : cls?.name ?? "Класс",
    classInfo: d.classId === "custom" ? d.customClass.info || "Свой класс." : cls?.info ?? "",
    subclassName: "",
    hitDie,
    classHp: 0,
    saves,
    skillRanks: ranks,
    extraSkills: [],
    feats,
    features,
    items,
    coins: copperToCoins(purse.ok ? purse.copper : 0),
    spellcasting: spellcasting5(d, scores),
    spells,
    preparedIds: preparedIds(d),
    bonusSpellIds: bonusIds(d),
    slots: [],
    focus: null,
    hitDice: { sides: hitDie, max: 1, current: 1 },
    conditions: [],
    conditionValues: {},
    languages: species?.languages ?? "Общий",
    notes: "",
    shieldRaised: false,
    weaponRules,
    armorTraining: [...armor],
    fightingStyle: c(d, "style"),
    unarmored: cls?.unarmored ?? "none",
    keyAbility: cls?.caster?.ability ?? cls?.primary[0] ?? d.customClass.key,
    armorRanks: {},
    weaponRanks: {},
    perceptionRank: "untrained",
    classDcRank: "untrained",
    spellRank: "trained",
    thiefDamage: false,
    resources,
    pendingAsi: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  if (m(d, "mastery").length) {
    character.features.push({
      name: "Оружие мастерства",
      info: `Вы владеете свойством мастерства у: ${m(d, "mastery")
        .map((id) => item5(id)?.name ?? id)
        .join(", ")}.`,
    });
  }
  return character;
}

function seedPf(d: Draft, scores: Record<Ability, number>): Pf2eProgress | undefined {
  if (c(d, "abilityMethod") !== "boost") return undefined;
  if (d.ancestryId === "custom" || d.classId === "custom" || d.backgroundId === "custom") return undefined;
  const ancestry = ANCESTRIES.find((item) => item.id === d.ancestryId);
  const cls = CL2.find((item) => item.id === d.classId);
  const key = classKey(d);
  if (!ancestry || !cls || !key) return undefined;
  const choices: Pf2eProgress["choices"] = [];
  const push = (id: string, source: string, pick: string) => {
    if (pick) choices.push({ id, level: 1, source, pick });
  };
  if (ancestry.boosts.length === 0) m(d, "ancestryBoosts").forEach((pick, index) => push(`boost-1-ancestry-${index}`, "ancestry-boost", pick));
  else if (ancestry.freeBoosts > 0) push("boost-1-ancestry-0", "ancestry-boost", c(d, "ancFree"));
  const background = bg2(d);
  const boostKeys = ["bgFixed", "bgFree", "bgFree2", "bgFree3"];
  for (let index = 0; index < backgroundBoostCount(background); index += 1) {
    push(`boost-1-background-${index}`, "background-boost", c(d, boostKeys[index] ?? ""));
  }
  if (c(d, "bgSkill")) push("bg-skill", "bg-skill", c(d, "bgSkill"));
  if (c(d, "bgFeat")) push("bg-feat", "bg-feat", c(d, "bgFeat"));
  push("boost-1-class", "class-boost", key);
  m(d, "freeBoosts").forEach((pick, index) => push(`boost-1-free-${index}`, "free-boost", pick));
  if (cls.id === "fighter") push("class-skill-primary", "class-skill", c(d, "fighterSkill"));
  m(d, "skills").forEach((pick, index) => push(`class-skill-extra-${index}`, "class-skill", pick));
  if (d.heritageId === "skilled") push("heritage-skill", "heritage-skill", c(d, "humanSkill"));
  if (c(d, "ancestryFeat")) push("ancestry-feat-1", "ancestry-feat", c(d, "ancestryFeat"));
  if (cls.featLevel1 && c(d, "classFeat")) push("class-feat-1", "class-feat", c(d, "classFeat"));
  if (cls.id === "rogue" && c(d, "skillFeat")) push("skill-feat-1", "skill-feat", c(d, "skillFeat"));
  if (c(d, "instinct")) push("class-path", "instinct", c(d, "instinct"));
  if (cls.id === "swashbuckler" && c(d, "style")) push("class-path", "style", c(d, "style"));
  if (c(d, "mystery")) push("class-path", "mystery", c(d, "mystery"));
  for (const choice of cls.choices) {
    if (choice.id === "instinct" || choice.id === "style" || choice.id === "mystery") continue;
    const pick = c(d, choice.id);
    if (pick) push(`class-${choice.id}`, choice.id, pick);
  }
  const progress: Pf2eProgress = {
    freeArchetype: d.choices.freeArchetype === "yes",
    ancestryId: d.ancestryId,
    heritageId: d.heritageId,
    backgroundId: d.backgroundId,
    classId: d.classId,
    keyAbility: key,
    choices,
    toggles: [],
    dailyFeats: [],
    versatileHeritageId: d.versatileHeritageId || undefined,
  };
  const derived = derive({ progress, items: [], level: 1 });
  if (!ABILITIES.every((ability) => derived.abilities[ability].score === scores[ability])) return undefined;
  return progress;
}

function build2(d: Draft, scores: Record<Ability, number>): Character {
  const ancestry = ANCESTRIES.find((a) => a.id === d.ancestryId);
  const heritage = ancestry?.heritages.find((h) => h.id === d.heritageId);
  const cls = CL2.find((x) => x.id === d.classId);
  const bg = bg2(d);
  const custom = d.ancestryId === "custom";
  const feats: FeatInst[] = [];
  const ancFeat = ancestry?.feats.find((f) => f.id === c(d, "ancestryFeat")) ?? indexedFeat(c(d, "ancestryFeat"));
  if (ancFeat) feats.push({ id: ancFeat.id, name: ancFeat.name, info: ancFeat.info });
  const skillFeat = SKILL_FEATS.find((f) => f.id === c(d, "skillFeat")) ?? indexedFeat(c(d, "skillFeat"));
  if (skillFeat) feats.push({ id: skillFeat.id, name: skillFeat.name, info: skillFeat.info });
  const generalFeat = SKILL_FEATS.find((f) => f.id === c(d, "generalFeat")) ?? (c(d, "generalFeat") === "fleet" ? { id: "fleet", name: "Быстроногий", info: "Скорость +5 футов." } : c(d, "generalFeat") === "canny-acumen" ? { id: "canny-acumen", name: "Дальновидность", info: "Эксперт в выбранном испытании или Восприятии, мастер с 17 уровня." } : c(d, "generalFeat") === "breath-control" ? { id: "breath-control", name: "Контроль дыхания", info: "Дольше задерживаете дыхание." } : null);
  const generalPick = generalFeat ?? indexedFeat(c(d, "generalFeat"));
  if (generalPick) feats.push({ id: generalPick.id, name: generalPick.name, info: generalPick.info });
  const classFeat = cls?.feats.find((f) => f.id === c(d, "classFeat")) ?? indexedFeat(c(d, "classFeat"));
  if (classFeat) feats.push({ id: classFeat.id, name: classFeat.name, info: classFeat.info });
  const archetype = indexedFeat(c(d, "archetype"));
  if (archetype) feats.push({ id: archetype.id, name: archetype.name, info: archetype.info });
  if (c(d, "doctrine") === "war") feats.push({ id: "shield-block", name: "Блок щитом", info: SKILL_FEATS.find((f) => f.id === "shield-block")?.info ?? "" });
  for (const feat of d.customFeats) if (feat.name.trim()) feats.push({ id: uid(), name: feat.name.trim(), info: feat.info || "Своя черта." });
  const ranks: Record<string, string> = {};
  for (const id of fixedSkills(d)) ranks[id] = "trained";
  for (const id of m(d, "skills")) ranks[id] = "trained";
  const loreNames = bg?.lores?.length ? bg.lores : d.backgroundId === "custom" ? ["Своё знание"] : [];
  const extra = loreNames.map((loreName, index) => ({
    id: index === 0 ? "lore-bg" : `lore-bg-${index + 1}`,
    name: loreName,
    ability: "int" as Ability,
    info: "Знание из происхождения. Это отдельный навык Интеллекта: вы вспоминаете узкую тему лучше, чем общий навык. Обученность даёт уровень + 2.",
  }));
  for (const lore of extra) ranks[lore.id] = "trained";
  for (const feat of bg?.feats ?? []) {
    const known = SKILL_FEATS.find((item) => item.id === feat.id);
    feats.push({ id: feat.id, name: known?.name ?? feat.name, info: known?.info ?? "Черта происхождения. Если у неё нет отдельного числа, лист его не выдумывает." });
  }
  const chosenFeat = bg?.featChoices.find((feat) => feat.id === c(d, "bgFeat"));
  if (chosenFeat) {
    const known = SKILL_FEATS.find((item) => item.id === chosenFeat.id);
    feats.push({ id: chosenFeat.id, name: known?.name ?? chosenFeat.name, info: known?.info ?? "Черта происхождения. Если у неё нет отдельного числа, лист его не выдумывает." });
  }
  if (bg?.craftChoices.length && c(d, "bgCraft")) {
    const craft = bg.craftChoices.find((item) => item.id === c(d, "bgCraft"));
    if (craft) feats.push({ id: `craft-${craft.id}`, name: `Узкое ремесло: ${craft.name}`, info: "Специальность ремесла записана с происхождения. Лист сам цену изделия не меняет." });
  }
  const armorRanks = { ...(cls?.armor ?? { unarmored: "trained", light: "untrained", medium: "untrained", heavy: "untrained" }) };
  if (c(d, "doctrine") === "cloister") armorRanks.light = "trained";
  if (c(d, "doctrine") === "war") {
    armorRanks.light = "trained";
    armorRanks.medium = "trained";
  }
  if (c(d, "muse") === "warrior" || c(d, "racket") === "ruffian") armorRanks.medium = "trained";
  const attacks = { ...(cls?.attacks ?? { simple: "trained", martial: "untrained", unarmed: "trained", advanced: "untrained" }) };
  if (c(d, "doctrine") === "war") attacks.martial = "trained";
  const saves = {
    fort: c(d, "doctrine") === "war" ? "expert" : cls?.fort ?? "trained",
    ref: cls?.ref ?? "trained",
    will: cls?.will ?? "expert",
  };
  const purse = purseOf(d);
  const items = purse.ok ? materialize(purse.items, ITEMS2, true) : [];
  for (const customItem of d.customItems) {
    if (!customItem.name.trim()) continue;
    items.push({ uid: uid(), name: customItem.name.trim(), qty: Number(customItem.qty) || 1, weight: Number(customItem.weight) || 0, equipped: false, kind: customItem.kind, notes: "Своя запись" });
  }
  const features = [...(cls?.features ?? [])];
  for (const choice of cls?.choices ?? []) {
    const opt = choice.options.find((o) => o.id === c(d, choice.id));
    if (opt) features.push({ name: `${choice.title}: ${opt.name}`, info: opt.info });
  }
  if (heritage) features.push({ name: heritage.name, info: heritage.info });
  const versatile = VERSATILE.find((item) => item.id === d.versatileHeritageId);
  if (versatile) features.push({ name: versatile.name, info: `${versatile.info} В авторасчёт не входит.` });
  const classHp = cls?.hp ?? (Number(d.customClass.hp) || Number(d.customClass.hit) || 8);
  const ancestryHp = heritage?.hp ?? (custom ? Number(d.customAncestry.hp) || 8 : ancestry?.hp ?? 8);
  const key = classKey(d) ?? "str";
  const spellcasting = spellcasting2(d);
  const focus = cls?.id === "druid" || c(d, "doctrine") === "cloister" || (cls?.id === "wizard" && c(d, "school") !== "unified") || c(d, "classFeat") === "gravity-weapon" ? { max: 1, current: 1 } : null;
  return {
    id: uid(),
    system: "pf2e",
    name: d.name.trim(),
    photo: d.photo,
    level: 1,
    xp: 0,
    hpCurrent: 1,
    hpTemp: 0,
    hpBonus: 0,
    hpRolls: [],
    hero: 1,
    abilities: scores,
    ancestryId: d.ancestryId,
    ancestryName: custom ? d.customAncestry.name.trim() : ancestry?.name ?? "Народ",
    ancestryInfo: custom ? d.customAncestry.info || "Своя запись народа." : ancestry?.info ?? "",
    size: custom ? d.customAncestry.size || "Средний" : ancestry?.size ?? "Средний",
    speed: (custom ? Number(d.customAncestry.speed) || 25 : ancestry?.speed ?? 25) + (c(d, "generalFeat") === "fleet" ? 5 : 0),
    senses: ancestry?.senses ?? "Обычное зрение",
    ancestryHp,
    tough: false,
    backgroundId: d.backgroundId,
    backgroundName: d.backgroundId === "custom" ? d.customBackground.name.trim() : bg?.name ?? "Происхождение",
    backgroundInfo: d.backgroundId === "custom" ? d.customBackground.info || "Своя запись." : bg?.info ?? "",
    classId: d.classId,
    className: d.classId === "custom" ? d.customClass.name.trim() : cls?.name ?? "Класс",
    classInfo: d.classId === "custom" ? d.customClass.info || "Свой класс." : cls?.info ?? "",
    subclassName: "",
    hitDie: 0,
    classHp,
    saves,
    skillRanks: ranks,
    extraSkills: extra,
    feats,
    features,
    items,
    coins: copperToCoins(purse.ok ? purse.copper : 0),
    spellcasting,
    spells: collectSpells(d, "pf2e"),
    preparedIds: preparedIds(d),
    bonusSpellIds: [],
    slots: [],
    focus,
    hitDice: { sides: 0, max: 0, current: 0 },
    conditions: [],
    conditionValues: {},
    languages: spokenLanguages(d.ancestryId, scores.int),
    notes: "",
    reminder: reminderFromClass("pf2e", d.classId, c(d, "deity")),
    shieldRaised: false,
    weaponRules: { simple: true, martial: attacks.martial !== "untrained", martialFinesseOrLight: false, martialLight: false, unarmed: true },
    armorTraining: Object.entries(armorRanks).filter(([, rank]) => rank !== "untrained").map(([id]) => id),
    fightingStyle: "",
    unarmored: "none",
    keyAbility: key,
    armorRanks,
    weaponRanks: attacks,
    perceptionRank: cls?.perception ?? "trained",
    classDcRank: cls?.classDc ?? "trained",
    spellRank: cls?.spell ? cls.spellRank : "untrained",
    thiefDamage: c(d, "racket") === "thief",
    resources: [],
    pendingAsi: false,
    progress: seedPf(d, scores),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function spokenLanguages(ancestryId: string, intScore: number): string {
  const ancestry = ANCESTRIES.find((item) => item.id === ancestryId);
  const named = (ancestry?.languages ?? "Всеобщий").split(" и дополнительные")[0].trim();
  const extra = Math.max(0, mod(intScore));
  if (extra === 0) return `${named}. Дополнительных языков по Интеллекту нет.`;
  return `${named} и ещё ${extra} по Интеллекту`;
}

function targetLevel(d: Draft): number {
  const raw = Number(d.choices.buildLevel);
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.min(20, Math.floor(raw)));
}

function resources5(d: Draft, scores: Record<Ability, number>): Character["resources"] {
  const list: Character["resources"] = [];
  if (d.classId === "barbarian") list.push({ id: "rage", name: "Ярость", current: 2, max: 2, info: "Бонусным действием, если нет тяжёлого доспеха. Короткий отдых возвращает одно использование, долгий — все." });
  if (d.classId === "fighter") list.push({ id: "wind", name: "Второе дыхание", current: 2, max: 2, info: "Бонусным действием восстановите 1d10 + уровень хитов. Короткий отдых возвращает 1 использование." });
  if (d.classId === "paladin") list.push({ id: "lay", name: "Наложение рук", current: 5, max: 5, info: "Запас равен 5 × уровень. Действием касания лечите или снимаете яд либо болезнь за 5 единиц запаса." });
  if (d.classId === "bard") {
    const max = Math.max(1, mod(scores.cha));
    list.push({ id: "bardic", name: "Вдохновение барда", current: max, max, info: "Бонусным действием отдайте союзнику к6. Он добавит её к броску к20. Возвращается после долгого отдыха." });
  }
  if ((bg5(d)?.feat ?? "").startsWith("magic") || c(d, "humanFeat").startsWith("magic")) {
    list.push({ id: "initiate", name: "Посвящение в магию", current: 1, max: 1, info: "Раз за долгий отдых можно сотворить заклинание 1-го круга из черты без ячейки. Заговоры черты повторяются свободно." });
  }
  return list;
}

function spellcasting5(d: Draft, scores: Record<Ability, number>): Character["spellcasting"] {
  if (d.classId === "custom") {
    if (d.customClass.caster === "none") return null;
    return {
      kind: d.customClass.caster as "prepared" | "known" | "book" | "pact",
      ability: d.customClass.key,
      listName: "свой список",
      cantripLimit: 3,
      prepareLimit: Math.max(1, mod(scores[d.customClass.key]) + 1),
      knownLimit: 6,
    };
  }
  const cls = CL5.find((x) => x.id === d.classId);
  if (!cls?.caster) return null;
  const limits = spellLimits(d, scores);
  return {
    kind: cls.caster.kind,
    ability: cls.caster.ability,
    listName: cls.name,
    cantripLimit: limits.cantrips,
    prepareLimit: limits.prepare,
    knownLimit: limits.known,
  };
}

function spellcasting2(d: Draft): Character["spellcasting"] {
  if (d.classId === "custom") {
    if (d.customClass.caster === "none") return null;
    return { kind: "prepared", ability: d.customClass.key, listName: d.customClass.caster, cantripLimit: 5, prepareLimit: 2, knownLimit: 10 };
  }
  const cls = CL2.find((x) => x.id === d.classId);
  if (!cls?.spell) return null;
  const spontaneous = cls.id === "bard" || cls.id === "sorcerer" || cls.id === "oracle";
  const kind = spontaneous ? "known" : cls.id === "wizard" ? "book" : "prepared";
  const bloodline = cls.id === "sorcerer" ? d.choices.bloodline : "";
  return {
    kind,
    ability: classKey(d) ?? cls.key[0],
    listName: bloodline || cls.spell.tradition,
    cantripLimit: cls.spell.cantrips,
    prepareLimit: cls.spell.slots,
    knownLimit: cls.id === "wizard" ? 10 : spontaneous ? cls.spell.slots : 99,
  };
}

function collectSpells(d: Draft, system: "dnd5e" | "pf2e"): SpellInst[] {
  const spells: SpellInst[] = [];
  const push = (spell: SpellInst) => {
    if (!spells.some((s) => s.id === spell.id)) spells.push(spell);
  };
  for (const id of [...d.knownSpells, ...d.preparedSpells, ...bonusIds(d)]) {
    if (id.startsWith("custom:")) continue;
    if (system === "dnd5e") {
      const spell = SP5.find((s) => s.id === id);
      if (spell) push(toSpell5(spell));
    } else {
      const spell = SP2.find((s) => s.id === id);
      if (spell) push({ id: spell.id, name: spell.name, level: spell.level, info: spell.info, school: spell.traditions.join(", "), time: spell.time, range: "по тексту", duration: "по тексту" });
    }
  }
  d.customSpells.forEach((spell, index) => {
    if (!spell.name.trim()) return;
    push({ id: `custom:${index}`, name: spell.name.trim(), level: Number(spell.level) || 0, info: spell.info || "Своё заклинание.", school: "своё", time: "действие", range: "—", duration: "—" });
  });
  if (system === "dnd5e") {
    const species = SPECIES.find((s) => s.id === d.ancestryId);
    const lineage = c(d, "lineage");
    const auto: string[] = [];
    if (species?.id === "elf" && lineage === "drow") auto.push("dancing-lights");
    if (species?.id === "elf" && lineage === "high") auto.push("prestidigitation");
    if (species?.id === "elf" && lineage === "wood") auto.push("druidcraft");
    if (species?.id === "gnome" && lineage === "forest") auto.push("minor-illusion", "speak-animals");
    if (species?.id === "gnome" && lineage === "rock") auto.push("mending", "prestidigitation");
    if (species?.id === "tiefling") auto.push("thaumaturgy");
    if (species?.id === "tiefling" && lineage === "abyssal") auto.push("poison-spray");
    if (species?.id === "tiefling" && lineage === "chthonic") auto.push("chill-touch");
    if (species?.id === "tiefling" && lineage === "infernal") auto.push("fire-bolt");
    for (const prefix of ["bg", "h"]) {
      for (const key of [`${prefix}c1`, `${prefix}c2`, `${prefix}Spell`]) {
        if (c(d, key)) auto.push(c(d, key));
      }
    }
    for (const id of auto) {
      const spell = SP5.find((s) => s.id === id);
      if (spell) push(toSpell5(spell));
    }
  }
  return spells;
}

function bonusIds(d: Draft): string[] {
  return [c(d, "bgSpell"), c(d, "hSpell")].filter(Boolean);
}

function preparedIds(d: Draft): string[] {
  return [...new Set([...d.preparedSpells, ...bonusIds(d)])];
}

function toSpell5(spell: (typeof SP5)[number]): SpellInst {
  return { id: spell.id, name: spell.name, level: spell.level, info: spell.info, school: spell.school, time: spell.time, range: spell.range, duration: spell.duration + (spell.ritual ? " · ритуал" : "") };
}

function materialize(rows: { id: string; qty: number; equipped?: boolean }[], catalog: typeof ITEMS5, equipFirstWeapon: boolean): ItemInst[] {
  let weaponEquipped = false;
  let armorEquipped = false;
  let shieldEquipped = false;
  return rows.map((row) => {
    const cat = catalog.find((item) => item.id === row.id);
    if (!cat) {
      return { uid: uid(), name: row.id, qty: row.qty, weight: 0, equipped: false, kind: "gear" as const };
    }
    let equipped = Boolean(row.equipped);
    if (equipFirstWeapon && cat.kind === "weapon" && !weaponEquipped) {
      equipped = true;
      weaponEquipped = true;
    }
    if (cat.kind === "armor") {
      equipped = !armorEquipped;
      armorEquipped = true;
    }
    if (cat.kind === "shield") {
      equipped = !shieldEquipped;
      shieldEquipped = true;
    }
    return {
      uid: uid(),
      catalogId: cat.id,
      name: cat.name,
      qty: row.qty,
      weight: cat.weight,
      equipped,
      kind: cat.kind,
      notes: cat.info,
      armor: cat.armor ? { ...cat.armor } : undefined,
      weapon: cat.weapon ? { ...cat.weapon } : undefined,
    };
  });
}

function copperToCoins(copper: number): Character["coins"] {
  const coins = emptyCoins();
  coins.gp = Math.floor(copper / 100);
  copper %= 100;
  coins.sp = Math.floor(copper / 10);
  coins.cp = copper % 10;
  return coins;
}

export function catalog(system: Draft["system"]) {
  const hand = system === "pf2e" ? ITEMS2 : ITEMS5;
  if (system !== "pf2e" && system !== "dnd5e") return hand;
  const taken = new Set(hand.map((item) => item.id));
  return [...hand, ...extraGear(system, taken).priced];
}

export function notedGear(system: Draft["system"]) {
  const hand = system === "pf2e" ? ITEMS2 : ITEMS5;
  if (system !== "pf2e" && system !== "dnd5e") return [];
  return extraGear(system, new Set(hand.map((item) => item.id))).noted;
}

function indexedFeat(id: string): { id: string; name: string; info: string } | undefined {
  if (!id) return undefined;
  const row = FEAT_BY_ID.get(id);
  if (!row) return undefined;
  return { id: row.id, name: row.name, info: `Уровень ${row.level}. Постоянные числа листа эта черта не меняет, если эффект не вынесен числом.` };
}

export function conditionList(system: Character["system"]) {
  return system === "pf2e" ? COND2 : COND5;
}

export { armorClass, ABILITY_NAME, ORIGIN_FEATS, STYLE_FEATS, GENERAL_FEATS, SKILL_FEATS, skill5, skill2 };

export function blankScoresFor(method: string, system: "dnd5e" | "pf2e"): Record<Ability, number> {
  if (system === "dnd5e" && method === "pointbuy") return { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
  if (system === "dnd5e") return { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
  if (method === "standard") return { str: 18, dex: 14, con: 14, int: 12, wis: 10, cha: 10 };
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
}
