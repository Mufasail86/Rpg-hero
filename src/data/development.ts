import type { DevelopmentPlan } from "../types";
import type { AdvicePick } from "./build-advice";

export interface DevelopmentPath {
  id: string; name: string; role: string; turn: string; caution: string;
  skills: string[]; feats: string[]; archetypes: string[];
  stages: [string, string, string];
}

const paths: Record<string, DevelopmentPath> = {
  guardian: { id: "guardian", name: "Защитник со щитом", role: "Удерживать проход и оставаться рядом с теми, кому нужна защита.", turn: "Подойти к важной цели, атаковать, оставить возможность защититься. Не каждый ход нужно тратить на три удара.", caution: "Щит занимает руку. Следите за реакцией, состоянием щита и тем, кого вы действительно можете прикрыть.", skills: ["athletics", "medicine", "intimidation"], feats: ["reactive-shield", "shield-block", "toughness", "tough", "defense"], archetypes: ["bastion-dedication", "sentinel-dedication"], stages: ["1–4: надёжная защита, одна основная атака и базовая помощь союзникам.", "5–10: развивайте защитные реакции и способность удерживать удобную позицию.", "11–20: усиливайте выбранную защитную тактику, а не собирайте несвязанные приёмы."] },
  striker: { id: "striker", name: "Уверенный боец", role: "Наносить надёжный урон и выбирать момент сближения.", turn: "Подойти к нужному врагу, применить основной приём и оценить, стоит ли следующая атака риска.", caution: "Сильный удар не оправдывает опасную позицию. Оставляйте путь назад и не забывайте про защиту.", skills: ["athletics", "acrobatics", "perception"], feats: ["sudden-charge", "vicious-swing", "power-attack", "toughness", "tough", "alert"], archetypes: ["mauler-dedication", "fighter-dedication"], stages: ["1–4: выберите удобное оружие и один понятный приём сближения.", "5–10: улучшайте точность и способность добраться до важной цели.", "11–20: сочетайте свой основной приём с командной тактикой и выживанием."] },
  scout: { id: "scout", name: "Разведчик и стрелок", role: "Замечать опасность раньше остальных и выбирать безопасную дистанцию.", turn: "Проверить позицию, атаковать удобную цель и не оставаться там, где вас легко окружить.", caution: "Скрытность требует укрытия. Лук и метательное оружие имеют дистанции; близость врага может мешать.", skills: ["stealth", "perception", "survival", "acrobatics", "thievery", "sleight"], feats: ["fleet", "nimble-dodge", "point-blank-stance", "hunted-shot", "alert"], archetypes: ["archer-dedication", "scout-dedication"], stages: ["1–4: наблюдательность, скрытность и понятный дальний удар.", "5–10: повышайте надёжность разведки и мобильность.", "11–20: объединяйте обнаружение, позицию и точечные атаки, помогая всему отряду."] },
  healer: { id: "healer", name: "Лекарь отряда", role: "Сохранять союзников в бою и помогать восстановиться после него.", turn: "Оценить, кому опаснее всего, добраться до него, помочь и сохранить собственную безопасность.", caution: "Различайте магическое лечение, Боевую медицину и Лечение ран. У них разные действия, ограничения и повторное применение.", skills: ["medicine", "religion", "nature", "insight"], feats: ["battle-medicine", "continual-recovery", "ward-medic", "toughness", "healer"], archetypes: ["medic-dedication", "blessed-one-dedication", "cleric-dedication"], stages: ["1–4: основной навык лечения, инструменты и один срочный способ помощи.", "5–10: развивайте надёжность лечения и возможность помогать нескольким союзникам.", "11–20: планируйте ресурсы на длинный день, сочетая помощь с главным классом."] },
  controller: { id: "controller", name: "Контроль поля", role: "Мешать врагу действовать удобно и создавать преимущество союзникам.", turn: "Выбрать опасную цель, затруднить её действия и занять место, откуда команда воспользуется результатом.", caution: "Нужно понимать длительность, иммунитеты и защиты целей. Контроль полезен только тогда, когда команда им пользуется.", skills: ["intimidation", "deception", "arcana", "occultism", "athletics"], feats: ["intimidating-strike", "intimidating-glare", "bon-mot", "snagging-strike", "assurance", "alert"], archetypes: ["marshal-dedication", "rogue-dedication"], stages: ["1–4: один понятный способ ослабить цель и подготовить следующий ход.", "5–10: выбирайте разные защиты целей и согласовывайте действия с союзниками.", "11–20: сохраняйте сильные ограничения для главных угроз, учитывая цену и длительность."] },
  mage: { id: "mage", name: "Маг с понятным планом", role: "Решать одну задачу заклинанием и оставаться на безопасной дистанции.", turn: "Выбрать цель и подходящую защиту, применить основное заклинание, оставшееся действие потратить осмысленно.", caution: "Проверьте дальность, число действий и ограниченные ячейки. Одно сильное заклинание не решает все виды опасности.", skills: ["arcana", "occultism", "religion", "nature", "society"], feats: ["reach-spell", "widen-spell", "spellbook-prodigy", "counterspell", "toughness", "alert"], archetypes: ["wizard-dedication", "psychic-dedication"], stages: ["1–4: надёжный основной приём и несколько способов помочь вне боя.", "5–10: подберите ответы на разные защиты и задачи, не расходуя все ячейки сразу.", "11–20: развивайте выбранную магическую роль и оставляйте резерв на неожиданный поворот."] },
  envoy: { id: "envoy", name: "Лицо и поддержка группы", role: "Договариваться, собирать сведения и помогать союзникам действовать увереннее.", turn: "Подготовить союзнику удобную возможность, повлиять на опасную цель или помочь там, где не хватает другого специалиста.", caution: "Переговоры не подчиняют любого собеседника. Учитывайте язык, отношение и цели персонажей.", skills: ["diplomacy", "persuasion", "deception", "insight", "performance", "society"], feats: ["bon-mot", "group-impression", "dubious-knowledge", "multilingual", "skilled", "alert"], archetypes: ["marshal-dedication", "bard-dedication", "rogue-dedication"], stages: ["1–4: один сильный социальный навык и полезная роль рядом с группой.", "5–10: расширяйте круг ситуаций, в которых можете добыть информацию или договориться.", "11–20: сочетайте влияние с поддержкой и не заменяйте решения других игроков."] },
};

export function developmentPaths(classId: string, complexity: DevelopmentPlan["complexity"]): DevelopmentPath[] {
  const support = ["cleric", "druid", "bard", "oracle"].includes(classId);
  const magic = ["wizard", "witch", "sorcerer", "warlock", "psychic"].includes(classId);
  const sneaky = ["rogue", "ranger", "investigator", "gunslinger"].includes(classId);
  const ids = support ? ["healer", "envoy", "controller", "mage"] : magic ? ["mage", "controller", "healer", "envoy"] : sneaky ? ["scout", "striker", "envoy", "controller"] : ["guardian", "striker", "scout", "controller", "healer"];
  return ids.slice(0, complexity === "simple" ? 2 : ids.length).map(id => paths[id]);
}

export function resolveDevelopment(classId: string, value?: DevelopmentPlan): { plan: DevelopmentPlan; path: DevelopmentPath } {
  const complexity = value?.complexity === "complex" ? "complex" : "simple";
  const available = developmentPaths(classId, complexity);
  const path = available.find(row => row.id === value?.path) ?? available[0];
  return { plan: { complexity, path: path.id }, path };
}

export function developmentAdvice(classId: string, value?: DevelopmentPlan): AdvicePick[] {
  const { path, plan } = resolveDevelopment(classId, value);
  return [
    ...path.skills.map(id => ({ id, reason: `${path.name}: ${path.role}` })),
    ...path.feats.map(id => ({ id, reason: `${path.name}: ${path.turn}` })),
    ...(plan.complexity === "complex" ? path.archetypes.map(id => ({ id, reason: `${path.name}. Архетип расширяет роль, но потребует дополнительных выборов.` })) : []),
  ];
}
