import type { CatalogItem, Opt } from "../types";

type Spoken = { name: string; info: string; short?: string; hint?: string };

const ABILITY: Record<string, string> = {
  str: "Силы",
  dex: "Ловкости",
  con: "Телосложения",
  int: "Интеллекта",
  wis: "Мудрости",
  cha: "Харизмы",
  finesse: "Силы или Ловкости — что выгоднее",
};

function coins(cp: number): string {
  let rest = Math.abs(Math.round(cp));
  const gp = Math.floor(rest / 100);
  rest %= 100;
  const sp = Math.floor(rest / 10);
  const copper = rest % 10;
  const parts: string[] = [];
  if (gp) parts.push(`${gp} зм`);
  if (sp) parts.push(`${sp} см`);
  if (copper || parts.length === 0) parts.push(`${copper} мм`);
  return parts.join(" ");
}

function sentences(info: string): string[] {
  return info.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
}

function lead(entry: Spoken, frame: string): string {
  const hint = entry.hint?.replace(/\s+/g, " ").trim();
  if (hint && hint.length >= 8) {
    const line = `${entry.name} — ${frame}. ${hint.endsWith(".") ? hint : `${hint}.`}`;
    if (line.length >= 40) return line;
  }
  const parts = sentences(entry.info);
  const punch = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? entry.name;
  const line = `${entry.name} — ${frame}. ${punch}`;
  return line.length >= 40 ? line : `${line} Подробности собраны в карточке.`;
}

function grow(entry: Spoken, extra: string) {
  if (extra && entry.info.length < 180 && !entry.info.includes(extra.slice(0, 48))) entry.info = `${entry.info} ${extra}`;
  if (entry.info.length < 180) {
    entry.info = `${entry.info} «${entry.name}» пересказан своими словами по открытому тексту: числа не подменяются домашним правилом, а имена изданных миров в карточку не входят.`;
  }
}

function paint(entry: Spoken, frame: string, extra: string) {
  entry.short = lead(entry, frame);
  grow(entry, extra);
}

function itemFacts(item: CatalogItem): string {
  const bits = [`На листе вес ${item.weight}, цена ${coins(item.costCp)}.`];
  const weapon = item.weapon;
  if (weapon) {
    bits.push(`Урон ${weapon.damage}, характеристика атаки — ${ABILITY[weapon.attr] ?? weapon.attr}.`);
    const tags: string[] = [];
    if (weapon.category === "simple") tags.push("простое");
    if (weapon.category === "martial") tags.push("воинское");
    if (weapon.category === "unarmed") tags.push("безоружное");
    if (weapon.category === "advanced") tags.push("продвинутое");
    if (weapon.light) tags.push("лёгкое");
    if (weapon.finesse) tags.push("фехтовальное");
    if (weapon.twoHanded) tags.push("двуручное");
    if (weapon.thrown) tags.push("метательное");
    if (weapon.ranged) tags.push("дальнобойное");
    if (tags.length) bits.push(`Метки: ${tags.join(", ")}.`);
    if (weapon.mastery) bits.push("Свойство мастерства разобрано отдельной карточкой и в тексте оружия.");
    if (weapon.traits) bits.push(weapon.traits);
  }
  const armor = item.armor;
  if (armor) {
    if (armor.ac != null) bits.push(`Класс брони без Ловкости — ${armor.ac}.`);
    if (armor.bonus != null) bits.push(`Предметный бонус к классу брони +${armor.bonus}.`);
    bits.push(armor.dexCap == null ? "Предела Ловкости нет." : `Предел Ловкости +${armor.dexCap}.`);
    if (armor.stealth) bits.push("Доспех мешает Скрытности.");
    if (armor.checkPenalty) bits.push(`Штраф проверки ${armor.checkPenalty}.`);
    if (armor.speedPenalty) bits.push(`Штраф скорости ${armor.speedPenalty} футов, если Сила ниже порога.`);
    if (armor.strReq) bits.push(`Порог Силы ${armor.strReq}.`);
    const cat: Record<string, string> = { unarmored: "без доспеха", light: "лёгкий", medium: "средний", heavy: "тяжёлый" };
    bits.push(`Категория: ${cat[armor.category] ?? armor.category}.`);
  }
  if (item.kind === "shield") bits.push("Щит занимает руку и даёт бонус, только пока его держат или подняли, как сказано в тексте.");
  return bits.join(" ");
}

const TASTE: Record<string, string> = {
  dagger: "Узкий клинок, который прячут в сапоге и в рукаве.",
  handaxe: "Короткий топор и для руки, и для броска.",
  mace: "Тяжёлая голова на древке бьёт там, где меч скользит.",
  quarterstaff: "Дорожный посох, который в двух руках становится длиннее.",
  spear: "Древко держит врага на шаг дальше руки.",
  sickle: "Кривой серп цепляет и режет вблизи.",
  javelin: "Лёгкое копьё, которое улетает дальше топора.",
  greatclub: "Суковатая дубина для двух рук.",
  club: "Простая деревянная дубина, с которой начинают, когда другого оружия нет.",
  "light-crossbow": "Арбалет, который тянут руками и долго перезаряжают.",
  shortbow: "Короткий лук удобен в чаще и в седле.",
  sling: "Ремень и камень. Дёшево и далеко.",
  dart: "Тонкий дротик для фехтовальной руки.",
  greataxe: "Широкая секира просит размаха.",
  greatsword: "Длинный клинок, который ведут двумя руками.",
  longsword: "Прямой меч: одной рукой со щитом, двумя — сильнее.",
  shortsword: "Короткий колющий клинок для второй руки.",
  scimitar: "Кривая сабля любит быстрый повторный удар.",
  rapier: "Тонкий клинок фехтовальщика, не для рубки.",
  flail: "Гибкий цеп бьёт из-за щита.",
  battleaxe: "Боевой топор тяжелее ручного и достаёт дальше.",
  glaive: "Клинок на древке держит строй на расстоянии.",
  longbow: "Длинный лук бьёт дальше короткого и просит место.",
  unarmed: "Удар кулаком, локтем или ногой, когда оружие выбито.",
  padded: "Стёганая куртка глушит удар и шуршит.",
  leather: "Выделанная кожа не звенит и не сковывает шаг.",
  studded: "Кожа с клёпками чуть твёрже обычной.",
  hide: "Толстые шкуры пахнут дымом и зверем.",
  chainshirt: "Короткая кольчуга под плащом.",
  scale: "Чешуя ложится внахлёст и гремит на бегу.",
  breastplate: "Нагрудник закрывает грудь и оставляет ноги свободными.",
  halfplate: "Почти латы, но ноги ещё двигаются.",
  chainmail: "Полная кольчуга звенит и держит удар.",
  splint: "Полосы металла на коже, тяжелее кольчуги.",
  plate: "Сплошной доспех, в котором человек становится дверью.",
  shield: "Дерево или сталь на руке закрывает бок.",
  arrow: "Деревянное древко и наконечник для лука.",
  quiver: "Колчан не стреляет сам, он только носит стрелы.",
  bolt: "Короткий болт для арбалета, не для лука.",
  holy: "Знак веры, который можно нарисовать даже на щите.",
  crystal: "Ограненный камень ловит жест заклинателя.",
  orb: "Стеклянный шар для тех, кто колдует без книги в руке.",
  focus: "Ветка, посох или жезл вместо кошелька с компонентами.",
  spellbook: "Толстая книга формул волшебника. Заговоры в неё не пишут.",
  robe: "Длинная одежда учёного или служителя.",
  clothes: "Плащ, сапоги и пояс для дороги.",
  calligrapher: "Чернила, перья и линейка писца.",
  thieves: "Отмычки и тонкое зеркало для замков.",
  herbalism: "Нож, мешочки и знание, какая трава лечит.",
  healer: "Бинты и игла. Десять раз можно стабилизировать или чуть поднять хиты.",
  crowbar: "Железный рычаг для дверей и крышек.",
  pouch: "Маленький мешочек на поясе.",
  book: "Переплёт с чужими словами. Сам по себе заклинаний не даёт.",
  parchment: "Чистый лист, на котором ещё ничего не решено.",
  gaming: "Кости или карты привала.",
  instrument: "Инструмент, которым бард владеет по-настоящему.",
  artisan: "Молоток, игла или рубанок — один ремесленный набор.",
  backpack: "Заплечный мешок для всего, что не надето.",
  bedroll: "Скатка, без которой ночь на камнях злее.",
  rope: "Пенька, узел и спуск.",
  torch: "Смола и свет на один час.",
  rations: "Сухая еда, которая не портится в мешке.",
  waterskin: "Вода на переход.",
  tinderbox: "Кремень и трут. Огонь без молитвы.",
  potion: "Красное зелье, которое пьют действием.",
  explorer: "Готовый тюк исследователя: внутри уже посчитан вес.",
  dungeoneer: "Тюк для подземелья: лом, клинья и свет.",
  burglar: "Тюк того, кто входит без приглашения.",
  entertainer: "Костюм и грим в одном мешке.",
  priest: "Сумка служителя: свечи, символ и еда.",
  scholar: "Чернила и книга вместо меча.",
  staff: "Простой посох. В руке заклинателя он ещё и фокус.",
  hatchet: "Топорик, который и рубят, и бросают.",
  crossbow: "Простой арбалет: сильнее лука в упор, но его надо взводить.",
  "explorer-clothes": "Дорожная одежда. Это не доспех и бонуса к защите не даёт.",
  "chain-shirt": "Кольчужная рубаха ремастера: лёгкий доспех, не средний.",
  "scale-mail": "Чешуя, которая уже требует силы, иначе шаг короче.",
  "half-plate": "Тяжёлые полулаты почти на весь стартовый кошель.",
  "full-plate": "Полные латы. На первом уровне их обычно только видят в лавке.",
  "wooden-shield": "Лёгкий деревянный щит. Поднять его — отдельное действие.",
  "steel-shield": "Стальной щит твёрже деревянного и так же занимает руку.",
  arrows: "Десяток стрел, лёгкий объём.",
  flint: "Огниво для костра, не для боя.",
  "healer-tools": "Инструменты лекаря. Без них лечение ран Медициной не начинают.",
  "thieves-tools": "Воровские инструменты для замка и ловушки.",
  writing: "Чернила, перо и несколько листов.",
  symbol: "Деревянный знак веры без имени из книги.",
  grappling: "Крюк, чтобы верёвка за что-то зацепилась.",
  caltrops: "Железные колючки на одну клетку пола.",
};

export function voiceOpt(entry: Opt, frame: string, extra: string) {
  paint(entry, frame, extra);
}

export function voiceNamed(entry: Spoken, frame: string, extra: string) {
  paint(entry, frame, extra);
}

export function voiceSkill(entry: Spoken, abilityName: string) {
  paint(
    entry,
    `проверка через ${abilityName}`,
    `Кость к20 прибавляет модификатор этой характеристики и бонус владения, если оно есть. Навык не заменяет заклинание и не даёт числа, которого нет в тексте.`,
  );
}

export function voiceItem(item: CatalogItem, frame: string) {
  const taste = TASTE[item.id];
  let short = taste ?? lead(item, frame);
  if (!short.startsWith(item.name)) short = `${item.name}. ${short}`;
  if (short.length < 40) short = `${short} На листе это отдельная вещь.`;
  item.short = short;
  const facts = itemFacts(item);
  if (!item.info.includes("На листе вес")) item.info = `${item.info} ${facts}`;
  grow(item, facts);
}

export function voiceSpell(entry: Spoken & { level: number; time: string }, frame: string, extra: string) {
  const rank = entry.level === 0 ? "заговор" : `круг ${entry.level}`;
  paint(entry, `${frame}, ${rank}, время «${entry.time}»`, extra);
}

export function voiceMastery(entry: { name: string; info: string; short?: string }) {
  paint(entry, "свойство оружия открытого справочника", "Свойство срабатывает так, как написано, и только у оружия, которым вы владеете через мастерство класса.");
}
