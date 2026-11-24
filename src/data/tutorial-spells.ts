import type { Character } from "../types";

export type SaveKey = "str" | "dex" | "con" | "int" | "wis" | "cha" | "fort" | "ref" | "will";
export interface TutorialSpell {
  id: string; name: string; rank: number; cost: number; range: number;
  kind: "attack" | "save" | "auto" | "heal" | "shield" | "bless" | "fortune" | "fear";
  dice?: string; save?: SaveKey; half?: boolean; targets: number; cone?: number; burst?: number;
  bonus?: boolean; concentration?: boolean; classes: string[]; explanation: string; effect?: "cold";
}

const dnd: TutorialSpell[] = [
  { id: "fire-bolt", name: "Огненный снаряд", rank: 0, cost: 1, range: 120, kind: "attack", dice: "1d10", targets: 1, classes: ["wizard", "sorcerer"], explanation: "Вы бросаете атаку заклинанием против КБ цели. Заговор не тратит ячейку." },
  { id: "ray-of-frost", name: "Луч холода", rank: 0, cost: 1, range: 60, kind: "attack", dice: "1d8", targets: 1, classes: ["wizard", "sorcerer"], effect: "cold", explanation: "Попадание наносит холод и уменьшает скорость на 10 футов до начала вашего следующего хода." },
  { id: "sacred-flame", name: "Священное пламя", rank: 0, cost: 1, range: 60, kind: "save", dice: "1d8", save: "dex", targets: 1, classes: ["cleric"], explanation: "Бросает цель: Ловкость против СЛ ваших заклинаний. При успехе урона нет. Укрытие не помогает." },
  { id: "acid-splash", name: "Брызги кислоты", rank: 0, cost: 1, range: 60, kind: "save", dice: "1d6", save: "dex", targets: 99, burst: 5, classes: ["wizard", "sorcerer"], explanation: "Выберите центр маленькой области. Каждое существо, включая союзника, делает спасбросок Ловкости; успех отменяет урон." },
  { id: "burning-hands", name: "Огненные ладони", rank: 1, cost: 1, range: 15, cone: 15, kind: "save", dice: "3d6", save: "dex", half: true, targets: 99, classes: ["wizard", "sorcerer"], explanation: "Конус от вашего жетона. Все в подсветке делают спасбросок Ловкости: провал — полный урон, успех — половина. Союзники тоже могут попасть." },
  { id: "magic-missile", name: "Волшебная стрела", rank: 1, cost: 1, range: 120, kind: "auto", dice: "3d4+3", targets: 1, classes: ["wizard", "sorcerer"], explanation: "Три снаряда попадают без броска атаки. В этом упражнении все направлены в одну цель; требуется свободная линия до неё." },
  { id: "cure-wounds", name: "Лечение ран", rank: 1, cost: 1, range: 5, kind: "heal", dice: "2d8", targets: 1, classes: ["cleric", "druid", "bard", "paladin", "ranger"], explanation: "Касание: 2к8 + характеристика заклинаний. Нужны действие и ячейка. Можно вылечить себя или союзника." },
  { id: "healing-word", name: "Лечащее слово", rank: 1, cost: 1, range: 60, kind: "heal", dice: "2d4", bonus: true, targets: 1, classes: ["cleric", "druid", "bard"], explanation: "Дальнее лечение бонусным действием: 2к4 + характеристика заклинаний. За ход 2024 года нельзя потратить вторую ячейку на другое заклинание." },
  { id: "bless", name: "Благословение", rank: 1, cost: 1, range: 30, kind: "bless", targets: 3, concentration: true, classes: ["cleric", "paladin"], explanation: "До трёх согласных целей добавляют 1к4 к атакам и спасброскам. Требует концентрации: получив урон, заклинатель проверяет Телосложение." },
];
const pf: TutorialSpell[] = [
  { id: "electric-arc", name: "Электрическая дуга", rank: 0, cost: 2, range: 30, kind: "save", dice: "2d4", save: "ref", half: true, targets: 2, classes: ["wizard", "sorcerer", "druid"], explanation: "Выберите одну или две цели. Базовые Рефлексы: критический успех — 0, успех — половина, провал — полный урон, критический провал — двойной. Штраф повторной атаки не применяется." },
  { id: "telekinetic-projectile", name: "Телекинетический снаряд", rank: 0, cost: 2, range: 30, kind: "attack", dice: "2d6", targets: 1, classes: ["wizard", "bard", "sorcerer"], explanation: "Атака заклинанием на два действия. Она считается атакой и учитывает штраф повторных атак. Предполагается, что рядом есть подходящий свободный предмет." },
  { id: "shield", name: "Магический щит", rank: 0, cost: 1, range: 0, kind: "shield", targets: 1, classes: ["wizard", "bard", "cleric", "sorcerer"], explanation: "+1 обстоятельственный бонус к КБ до следующего хода. С включённой автоматической реакцией блокирует 5 урона, после чего недоступен до новой тренировки." },
  { id: "fear", name: "Страх", rank: 1, cost: 2, range: 30, kind: "fear", save: "will", targets: 1, classes: ["wizard", "cleric", "bard", "druid", "sorcerer"], explanation: "Воля: критический успех — без эффекта, успех — испуг 1, провал — 2, критический провал — 3 и бегство на ход. Испуг уменьшает проверки и СЛ, в конце хода снижается на 1." },
  { id: "magic-missile", name: "Силовой залп", rank: 1, cost: 2, range: 120, kind: "auto", dice: "2d4+2", targets: 1, classes: ["wizard", "bard", "sorcerer"], explanation: "В этом упражнении версия на два действия: два осколка по 1к4+1, без броска попадания. Все осколки в одну выбранную цель." },
  { id: "heal", name: "Лечение", rank: 1, cost: 2, range: 30, kind: "heal", dice: "1d8+8", targets: 1, classes: ["cleric", "druid"], explanation: "Версия на два действия: дальность 30 футов, 1к8+8 лечения на первом круге. Учебные цели живые; это не версия против нежити и не массовое лечение." },
  { id: "bless", name: "Благословение", rank: 1, cost: 2, range: 15, kind: "bless", targets: 99, classes: ["cleric", "bard"], explanation: "Аура 15 футов вокруг заклинателя: союзники внутри получают +1 статусный к атакам. При выходе из ауры бонус исчезает. В PF это не бонус 1к4 из D&D." },
  { id: "sure-strike", name: "Верный удар", rank: 1, cost: 1, range: 0, kind: "fortune", targets: 1, classes: ["wizard", "bard", "sorcerer"], explanation: "Следующую атаку в этом ходу бросаете дважды и берёте лучший результат. В рамках одной тренировки повторное применение недоступно после использования." },
  { id: "breathe-fire", name: "Дыхание огня", rank: 1, cost: 2, range: 15, cone: 15, kind: "save", dice: "2d6", save: "ref", half: true, targets: 99, classes: ["wizard", "druid", "sorcerer"], explanation: "Огонь конусом 15 футов. Все в области делают базовые Рефлексы; проверяйте положение союзников перед сотворением." },
];

export function tutorialSpells(hero: Character): TutorialSpell[] {
  if (!hero.spellcasting) return [];
  const known = new Set(hero.spells.map(spell => spell.id));
  return (hero.system === "pf2e" ? pf : dnd).filter(spell => known.has(spell.id) && (!spell.rank || hero.spellcasting?.kind === "known" || hero.spellcasting?.kind === "pact" || hero.preparedIds.includes(spell.id) || hero.bonusSpellIds.includes(spell.id) || (hero.system === "pf2e" && spell.id === "heal" && hero.slots.some(slot => slot.note === "шрифт" && slot.max > 0))));
}

export function tutorialSpellPool(system: Character["system"], classId: string): TutorialSpell[] {
  return (system === "pf2e" ? pf : dnd).filter(spell => spell.classes.includes(classId));
}

export function spellDamage(spell: TutorialSpell, hero: Character): string {
  if (!spell.dice) return "0";
  if (spell.rank > 0) return spell.dice;
  const dice = hero.system === "pf2e" ? Math.ceil(hero.level / 2) + 1 : hero.level >= 17 ? 4 : hero.level >= 11 ? 3 : hero.level >= 5 ? 2 : 1;
  return spell.dice.replace(/^\d+d/, `${dice}d`);
}
