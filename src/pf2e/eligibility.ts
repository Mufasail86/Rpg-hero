import { SKILLS } from "../data/pf2e";

const SKILL_NEED: Record<string, string> = {
  "cat-fall": "acrobatics",
  "student-canon": "religion",
  "experienced-smuggler": "stealth",
  fascinating: "performance",
  "quick-coercion": "intimidation",
  survey: "survival",
  hefty: "athletics",
  bargain: "diplomacy",
  courtly: "society",
  forager: "survival",
  pickpocket: "thievery",
  glare: "intimidation",
  underwater: "athletics",
  "battle-medicine": "medicine",
};

export const GENERAL_FEAT_IDS = new Set(["toughness", "diehard", "shield-block", "fleet", "canny-acumen", "breath-control"]);

const KNOWLEDGE = new Set(["arcana", "crafting", "medicine", "nature", "occultism", "religion", "society"]);

export function skillFeatBlock(id: string, trained: Set<string>): string | null {
  if (GENERAL_FEAT_IDS.has(id)) return "Это общая черта. Её берут отдельным общим слотом, не вместо черты навыка.";
  if (id === "assurance") return trained.size ? null : "Нужен хотя бы один обученный навык.";
  if (id === "dubious") {
    const knows = [...trained].some((skill) => KNOWLEDGE.has(skill) || skill.startsWith("lore"));
    return knows ? null : "Нужен обученный навык знания.";
  }
  const need = SKILL_NEED[id];
  if (!need) return null;
  if (trained.has(need)) return null;
  const name = SKILLS.find((skill) => skill.id === need)?.name ?? need;
  return `Нужна обученность: ${name}.`;
}
