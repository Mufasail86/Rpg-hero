import { classFace } from "../beginner";
import { LORE, type LoreCard } from "../data/lore";
import { rulesOf } from "../data/editions";
import { sheetDnd } from "../dnd/build";
import { skillPlan } from "../skills/picks";
import { sheetDerived } from "../ui/remaster";
import { attackFor, initiativeOf, skillRows } from "../rules";
import { VOW_LABEL, reminderOf } from "../reminder";
import { type Character, type VowKind, fmt } from "../types";

export type PlayScene = "talk" | "explore" | "fight" | "rest";
export type PlayPlace = "" | "city" | "tavern" | "shop" | "temple" | "court" | "road" | "wild" | "dungeon" | "slum";
export type PlayStance = "melee" | "ranged";

export const PLAY_SCENES: { id: PlayScene; name: string }[] = [
  { id: "talk", name: "Разговор" },
  { id: "explore", name: "Исследование" },
  { id: "fight", name: "Бой" },
  { id: "rest", name: "Отдых / даунтайм" },
];

export const PLAY_PLACES: { id: Exclude<PlayPlace, "">; name: string }[] = [
  { id: "city", name: "Город" },
  { id: "tavern", name: "Таверна" },
  { id: "shop", name: "Магазин / рынок" },
  { id: "temple", name: "Храм" },
  { id: "court", name: "Дворец / знать" },
  { id: "road", name: "Дорога" },
  { id: "wild", name: "Дикие земли" },
  { id: "dungeon", name: "Подземелье" },
  { id: "slum", name: "Трущобы" },
];

export interface PlayMemory {
  scene: PlayScene;
  place: PlayPlace;
  loreId: string;
  stance: PlayStance;
}

export interface TableSkill {
  id: string;
  name: string;
  mod: number;
  rank: string;
}

export interface TableStrike {
  name: string;
  attack: number;
  damage: string;
  ranged: boolean;
  thrown: boolean;
  traits: string;
}

export interface TableSpell {
  name: string;
  level: number;
  range: string;
  ranged: boolean;
}

export interface TableFace {
  system: "pf2e" | "dnd5e";
  edition: string;
  ancestryName: string;
  backgroundId: string;
  backgroundName: string;
  classId: string;
  className: string;
  deityName: string;
  edicts: string;
  anathema: string;
  vows: { kind: VowKind; label: string; text: string }[];
  backstory: string;
  skills: TableSkill[];
  strong: string[];
  strikes: TableStrike[];
  spells: TableSpell[];
  spellAttack: number | null;
  shield: boolean;
  featIds: string[];
}

export interface SkillActionRow {
  skillId: string;
  skill: string;
  mod: number;
  title: string;
  why: string;
  strong: boolean;
}

export interface SceneBrief {
  vows: { label: string; text: string }[];
  vowEmpty: string;
  prompts: string[];
  actions: SkillActionRow[];
  placeTitle: string;
  placeText: string;
}

export interface CombatOption {
  name: string;
  line: string;
}

export interface CombatBrief {
  economy: string;
  map: string;
  strikes: { name: string; attack: string; damage: string; note: string }[];
  maneuvers: CombatOption[];
  classActions: CombatOption[];
  spells: { name: string; line: string }[];
  empty: string;
}

const NOT_A_PLACE = new Set([
  "golarion", "faerun", "open-srd", "cup-policy", "fan-policy",
  "lion-blades", "pathfinder-society", "hellknights", "red-mantis", "eagle-knights", "firebrands", "aspis",
  "harpers", "zhentarim", "lords-alliance",
  "age-creation", "earthfall", "age-destiny", "age-enthronement", "age-lost-omens",
  "sarenrae", "iomedae", "desna", "pharasma", "abadar", "shelyn", "cayden", "gozreh", "nethys", "erastil",
  "torag", "asmodeus", "urgathoa", "lamashtu", "calistria", "norgorber", "rovagug", "gorum",
]);

export function settingPlaces(): LoreCard[] {
  return LORE.filter((card) => card.spoiler !== "gm" && !NOT_A_PLACE.has(card.id))
    .sort((left, right) => left.name.localeCompare(right.name, "ru"));
}

export function loreToken(card: LoreCard): string {
  return `lore~${card.settingId}~${card.id}`;
}

export function blankPlay(): PlayMemory {
  return { scene: "talk", place: "", loreId: "", stance: "melee" };
}

export function parsePlay(raw: string | null): PlayMemory {
  const blank = blankPlay();
  if (!raw) return blank;
  try {
    const value = JSON.parse(raw) as Partial<PlayMemory>;
    const scene = PLAY_SCENES.some((item) => item.id === value.scene) ? value.scene as PlayScene : blank.scene;
    const place = value.place === "" || PLAY_PLACES.some((item) => item.id === value.place) ? value.place as PlayPlace : "";
    const stance = value.stance === "ranged" ? "ranged" : "melee";
    const loreId = typeof value.loreId === "string" ? value.loreId : "";
    return { scene, place, loreId, stance };
  } catch {
    return blank;
  }
}

export function playKey(id: string): string {
  return `rpg-hero-play:${id}`;
}

export function faceFromCharacter(character: Character): TableFace {
  const reminder = reminderOf(character);
  const skills = skillRows(character).map((row) => ({ id: row.id, name: row.name, mod: row.mod, rank: row.rank }));
  if (character.system === "pf2e" && !skills.some((row) => row.id === "perception")) {
    skills.push({ id: "perception", name: "Восприятие", mod: initiativeOf(character).value, rank: character.perceptionRank || "untrained" });
  }
  const plan = skillPlan({
    system: character.system,
    classId: character.classId,
    keyAbility: character.keyAbility,
    role: classFace(character.system, character.classId).role,
    scores: character.abilities,
  });
  const derived = character.system === "pf2e" ? sheetDerived(character) : null;
  const dnd = character.system === "dnd5e" ? sheetDnd(character) : null;
  const rows = derived?.attacks ?? dnd?.attacks;
  const weapons = character.items.filter((item) => item.kind === "weapon");
  const strikes: TableStrike[] = rows
    ? rows.map((row, index) => {
      const item = weapons[index];
      const traits = row.traits ?? "";
      return {
        name: row.name,
        attack: row.attack.value,
        damage: row.damage,
        ranged: row.ranged,
        thrown: Boolean(item?.weapon?.thrown) || /метательн|thrown/i.test(traits),
        traits,
      };
    })
    : weapons.map((item) => {
      const math = attackFor(character, item);
      const traits = item.weapon?.traits ?? "";
      return {
        name: item.name,
        attack: math?.attack ?? 0,
        damage: math?.damage ?? item.weapon?.damage ?? "",
        ranged: Boolean(item.weapon?.ranged),
        thrown: Boolean(item.weapon?.thrown) || /метательн|thrown/i.test(traits),
        traits,
      };
    });
  const numbers = character.spellcasting ? spellAttackOf(character) : null;
  return {
    system: character.system,
    edition: rulesOf(character).edition,
    ancestryName: character.ancestryName || "Герой",
    backgroundId: character.backgroundId,
    backgroundName: character.backgroundName || "без записанного прошлого",
    classId: character.classId,
    className: character.className || "искатель",
    deityName: reminder.deity.name,
    edicts: reminder.deity.edicts,
    anathema: reminder.deity.anathema,
    vows: reminder.vows.filter((vow) => vow.text.trim()).map((vow) => ({ kind: vow.kind, label: VOW_LABEL[vow.kind], text: vow.text.trim() })),
    backstory: reminder.backstory.trim(),
    skills,
    strong: plan.grow.map((row) => row.id),
    strikes,
    spells: character.spells.map((spell) => ({
      name: spell.name,
      level: spell.level,
      range: spell.range,
      ranged: rangedSpell(spell.range),
    })),
    spellAttack: numbers,
    shield: character.items.some((item) => item.kind === "shield"),
    featIds: featIdsOf(character),
  };
}

function featIdsOf(character: Character): string[] {
  const chosen = [
    ...(character.progress?.choices ?? []),
    ...(character.dnd?.choices ?? []),
  ].flatMap((choice) => /feat|style/.test(choice.source) ? [choice.pick.replace(/^feat:/, "")] : []);
  return [...new Set([...character.feats.map((feat) => feat.id), ...chosen])];
}

function spellAttackOf(character: Character): number | null {
  const dnd = character.system === "dnd5e" ? sheetDnd(character) : null;
  if (dnd && character.spellcasting) {
    const ability = dnd.abilities[character.spellcasting.ability]?.mod ?? 0;
    return dnd.pb + ability;
  }
  const derived = character.system === "pf2e" ? sheetDerived(character) : null;
  if (derived?.spell) return derived.spell.value - 10;
  return null;
}

function rangedSpell(range: string): boolean {
  const text = range.toLocaleLowerCase("ru");
  if (!text.trim()) return false;
  return !/касани|на себя|самого себя|touch|self/.test(text);
}

const CLASS_MANNER: Record<string, string> = {
  fighter: "Режете фразу до сути: что случилось, кто опасен, что сделать руками.",
  champion: "Сначала чужая безопасность, потом своя выгода.",
  paladin: "Клятва слышна в том, от чего вы отказываетесь.",
  barbarian: "Говорите прямо. Злость не прячете и не размазываете по трём намёкам.",
  rogue: "Сначала смотрите на руки, кошель и выход, потом на улыбку.",
  ranger: "Замечаете грязь на сапогах и кто смотрит в окно.",
  monk: "Дышите ровно и не хватаетесь за оружие первым.",
  cleric: "Вера у вас не украшение: поступок сверяете с храмом.",
  druid: "Ищете, где здесь живое, и не любите лишний шум.",
  wizard: "Сначала вопрос, потом вывод. Чужие байки проверяете.",
  sorcerer: "Магия у вас на лице. Не притворяйтесь серым, если вас уже узнали.",
  warlock: "Помните, кому вы должны, и не называйте это вслух за чужим столом.",
  bard: "Держите зал: шутка, песня или точный комплимент.",
  alchemist: "Спрашиваете, что в бутылке, раньше чем пьёте.",
  investigator: "Один вопрос за раз. Запоминаете, кто ответил не то.",
  swashbuckler: "Улыбка и шаг в сторону. Дуэль — только если вас задели.",
  witch: "Слушаете то, что говорят шёпотом.",
  oracle: "Не обещаете будущее. Говорите, что видите сейчас.",
};

const ANCESTRY_TONE: Record<string, string> = {
  человек: "Человеческая привычка — спросить, как тут принято, и не выделяться зря.",
  дварф: "Вас раздражает спешка и кривая кружка. Это видно.",
  эльф: "Вы слушаете дольше, чем отвечают, и слышите фальшь в вежливости.",
  орк: "Уважение для вас видно по делу, не по титулу.",
  полурослик: "Садитесь так, чтобы видеть дверь и кухню.",
  гоблин: "Глаз уже ищет, что можно унести и заметят ли.",
  леший: "Среди камня вам тесно: ищете воду или живое растение.",
};

const PLACE_TONE: Record<PlayPlace, string> = {
  "": "Место ещё не названо: держитесь своего характера, пока мастер не скажет, где вы.",
  city: "В городе вы не орёте через площадь.",
  tavern: "В таверне говорите на полтона тише, чем хочется: зал слушает.",
  shop: "У прилавка не машете оружием. Цена любит спокойный голос.",
  temple: "В храме снимаете шлем, если он на вас, и не перебиваете обряд.",
  court: "При знати вы не садитесь выше своего места и не хлопаете по плечу.",
  road: "На дороге вы смотрите на обоз и на того, кто идёт сзади.",
  wild: "В диких землях лишние слова выдают вас веткам и зверью.",
  dungeon: "В подземелье говорите шёпотом и не спорите над ловушкой.",
  slum: "В трущобах не показываете кошель и не обещаете стражу.",
};

const PLACE_ASK: Record<PlayPlace, string> = {
  "": "Спросите мастера, кто здесь главный и что будет, если вы промолчите.",
  city: "Спросите первого стражника или разносчика, куда не пускают чужих и где ночлег.",
  tavern: "У стойки спросите, кто сегодня платит за чужой стол и кого лучше не задевать.",
  shop: "Спросите, что лежит давно и уступят ли, если берёте сразу.",
  temple: "Спросите, какой обряд нельзя прерывать и кому у порога можно помочь.",
  court: "Спросите, как обратиться и когда вам можно говорить.",
  road: "У встречного спросите, что было на прошлом повороте и нет ли сбора за проезд.",
  wild: "Прежде чем кричать, посмотрите следы. Спросите мастера, чья это земля.",
  dungeon: "Шёпотом: что уже слышали впереди и кто держит свет.",
  slum: "Спросите шёпотом, чья это улица.",
};

const BG_LINE: Record<string, string> = {
  "field-medic": "Полевой лекарь сначала видит кровь, потом спор. Спросите, есть ли раненые и кто платит за бинты.",
  warrior: "Воинское прошлое подсказывает спросить, где чинят доспех и не врут ли с ценой.",
  soldier: "Солдат спрашивает, кто командует и где с оружием стоять нельзя.",
  guard: "Караульный спрашивает, чей это пост и что уже случилось сегодня.",
  acolyte: "Служка спрашивает, какому храму тут верят и не обидят ли ваш знак.",
  criminal: "Спросите шёпотом, кто берёт долю и кого не трогать.",
  sage: "Спросите, есть ли человек, который помнит старое имя этого места.",
  scholar: "Спросите, где здесь хранят бумаги, карту или чужое имя.",
  hunter: "Спросите, что водится за околицей и куда не ходят после заката.",
};

const PLACE_TEXT: Record<Exclude<PlayPlace, "">, string> = {
  city: "Город — улицы, стража, вывески и толпа, которая делает вид, что вас не видит. Обычно рядом стражник, разносчик и кто-то, кто знает цену ночлега. Ночь в постоялом дворе — серебро, если город не столица. Спросите мастера: чей это квартал, комендантский час и куда чужака не пустят.",
  tavern: "Таверна — зал, стойка и комнаты наверху. Тут хозяин, разносчик и двое постоянных, которые слышат всё. Кружка — медь или две, комната — серебро, стол у очага уже занят своим. Спросите мастера: кто платит за зал, не слушают ли вас и можно ли оставить оружие у двери.",
  shop: "Лавка — прилавок, задняя полка и хозяин, который смотрит на ваши руки. Рядом ученик или охранник. Обычная мелочь — медь и серебро, оружие и доспех — золото, торг уместен, пока вы вежливы. Спросите мастера: это честная цена города, есть ли второй товар под прилавком и чем платят — монетой или услугой.",
  temple: "Храм — порог, зал и тот, кто ведёт обряд. Обычно служка, жрец и проситель. Подать — медь в чашу, ночлег иногда дают даром, если вы не ломаете правило дома. Спросите мастера: чей это храм, что здесь анафема и можно ли лечить прямо на ступенях.",
  court: "Дворец — зал, где место за столом уже значит чин. Слуга, стража у двери и тот, кто решает, говорить вам или молчать. Ужин может быть даром, а слово — дороже золота. Спросите мастера: как к вам обратятся, где вам стоять и какая тема сегодня запретна.",
  road: "Дорога — колея, обоз и встречный, который может быть купцом или засадой. На заставе берут медь или серебро за телегу. Спросите мастера: чья дорога, далеко ли до ночлега и не было ли накануне грабежа.",
  wild: "Дикие земли — нет вывески и нет цены, пока вы не встретите живого. След, дым и зверь важнее монеты. Спросите мастера: чья охота, есть ли тропа и что будет, если развести огонь.",
  dungeon: "Подземелье — камень, чужой свет и тишина, которая врёт. Стражи, ловушки и то, что уже умерло. Монета тут лежит на трупе, не на прилавке. Спросите мастера: откуда тянет воздух, кто держит карту и что случится, если заговорить в полный голос.",
  slum: "Трущобы — узкая улица, где стража заходит редко и ненадолго. Свой человек у двери, дети, которые всё видят, и цена за проход взглядом. Спросите мастера: чья улица, можно ли здесь достать оружие и не следит ли кто с крыши.",
};

const PLACE_OFFER: Record<PlayPlace, string> = {
  "": "Сделайте одно полезное дело руками, прежде чем просить одолжение.",
  city: "Помогите с телегой или с потерявшимся именем, прежде чем просить карту квартала.",
  tavern: "Закажите кружку и не занимайте чужой стол. Потом уже слухи.",
  shop: "Положите на прилавок то, что нужно отряду, и назовите это вслух один раз.",
  temple: "Предложите руки: воду, бинт, охрану порога. Потом просите.",
  court: "Поклонитесь так, как кланяются здесь, и ждите, пока вам дадут слово.",
  road: "Предложите идти снаружи обоза, если умеете смотреть по сторонам.",
  wild: "Не ломайте стоянку. Сначала вода и след, потом разговор.",
  dungeon: "Возьмите тыл или свет. Спор оставьте на комнату без ловушки.",
  slum: "Не доставайте кошель на виду. Кивните своему и говорите коротко.",
};

interface ActionSeed {
  pf: string;
  dnd: string;
  title: string;
  why: string;
}

const TALK: Record<PlayPlace, ActionSeed[]> = {
  "": [
    { pf: "diplomacy", dnd: "persuasion", title: "Попросить", why: "Спокойная просьба, без угрозы и без лжи." },
    { pf: "deception", dnd: "deception", title: "Солгать", why: "Если правду сейчас говорить нельзя." },
    { pf: "intimidation", dnd: "intimidation", title: "Надавить", why: "Когда вежливость уже не работает." },
    { pf: "perception", dnd: "insight", title: "Понять собеседника", why: "Лжёт ли он и чего боится." },
  ],
  city: [
    { pf: "diplomacy", dnd: "persuasion", title: "Спросить дорогу", why: "Город отвечает тому, кто не командует им с порога." },
    { pf: "society", dnd: "history", title: "Вспомнить порядок", why: "Чей закон, чей герб, куда нельзя с оружием." },
    { pf: "deception", dnd: "deception", title: "Не назваться", why: "Чужое имя иногда дешевле правды." },
  ],
  tavern: [
    { pf: "diplomacy", dnd: "persuasion", title: "Собрать слухи", why: "Хозяин и зал знают, кто сегодня шумел." },
    { pf: "diplomacy", dnd: "persuasion", title: "Попросить", why: "Комната, еда и чтобы вас не выставили." },
    { pf: "intimidation", dnd: "intimidation", title: "Надавить", why: "Если вежливый разговор упёрся." },
    { pf: "performance", dnd: "performance", title: "Выступить", why: "Песня или байка собирает внимание и мелочь." },
  ],
  shop: [
    { pf: "diplomacy", dnd: "persuasion", title: "Сторговаться", why: "Цена двигается, пока вы не хамите." },
    { pf: "society", dnd: "history", title: "Прикинуть товар", why: "Клеймо, обычная цена и не подделка ли." },
    { pf: "deception", dnd: "deception", title: "Не сказать лишнего", why: "Продавцу не обязательно знать, зачем вам верёвка." },
  ],
  temple: [
    { pf: "religion", dnd: "religion", title: "Узнать обряд", why: "Что здесь свято и чего нельзя касаться." },
    { pf: "diplomacy", dnd: "persuasion", title: "Попросить ночлег или благословение", why: "Храм слышит того, кто не ломает его правило." },
    { pf: "medicine", dnd: "medicine", title: "Предложить руки", why: "Раненый у порога — ваш повод заговорить." },
  ],
  court: [
    { pf: "society", dnd: "history", title: "Вспомнить этикет", why: "Как обратиться и где вам стоять." },
    { pf: "diplomacy", dnd: "persuasion", title: "Просить аудиенции", why: "Слово здесь дают, его не берут." },
    { pf: "deception", dnd: "deception", title: "Скрыть цель", why: "Не всякому лорду стоит знать, зачем вы пришли." },
  ],
  road: [
    { pf: "diplomacy", dnd: "persuasion", title: "Поговорить со встречным", why: "Обоз и патруль отвечают, если вы не перекрыли колею." },
    { pf: "survival", dnd: "survival", title: "Спросить о дороге делом", why: "След и развилка проверяют чужой сказ." },
    { pf: "intimidation", dnd: "intimidation", title: "Осадить грабителя", why: "Если разговор уже про кошель." },
  ],
  wild: [
    { pf: "survival", dnd: "survival", title: "Читать место", why: "Здесь собеседник — след, дым и зверь." },
    { pf: "nature", dnd: "nature", title: "Узнать живое", why: "Что можно есть и чего не злить." },
    { pf: "diplomacy", dnd: "persuasion", title: "Говорить с жителем", why: "Охотник и отшельник не любят городской напор." },
  ],
  dungeon: [
    { pf: "perception", dnd: "perception", title: "Слушать", why: "Голос впереди важнее спора." },
    { pf: "stealth", dnd: "stealth", title: "Не выдать себя", why: "Шёпот тоже бывает громким." },
    { pf: "diplomacy", dnd: "persuasion", title: "Заговорить с тем, кто ещё жив", why: "Не всякая тень сразу враг." },
  ],
  slum: [
    { pf: "deception", dnd: "deception", title: "Не показать интерес", why: "Прямой вопрос здесь стоит дорого." },
    { pf: "intimidation", dnd: "intimidation", title: "Обозначить границу", why: "Коротко и без толпы." },
    { pf: "society", dnd: "insight", title: "Понять, чья улица", why: "Герба нет, но хозяин есть." },
  ],
};

const EXPLORE: Record<PlayPlace, ActionSeed[]> = {
  "": [
    { pf: "perception", dnd: "perception", title: "Осмотреться", why: "Что отряд уже прошёл мимо." },
    { pf: "stealth", dnd: "stealth", title: "Пройти тихо", why: "Если впереди могут услышать." },
    { pf: "athletics", dnd: "athletics", title: "Преодолеть", why: "Дверь, уступ, решётка." },
  ],
  city: [
    { pf: "society", dnd: "investigation", title: "Читать город", why: "Вывеска, стража, чужой маршрут." },
    { pf: "perception", dnd: "perception", title: "Заметить хвост", why: "Кто пошёл за вами от площади." },
    { pf: "stealth", dnd: "stealth", title: "Свернуть в переулок", why: "Толпа прячет, если вы не бежите." },
  ],
  tavern: [
    { pf: "perception", dnd: "perception", title: "Слушать зал", why: "Кто замолчал, когда вы вошли." },
    { pf: "stealth", dnd: "stealth", title: "Подойти к чужому столу", why: "Не каждый разговор ведут от стойки." },
    { pf: "thievery", dnd: "sleight", title: "Чужой карман", why: "Только если стол уже решил воровать. Иначе это драка." },
  ],
  shop: [
    { pf: "society", dnd: "investigation", title: "Осмотреть товар", why: "Сколы, клеймо, пустая полка." },
    { pf: "perception", dnd: "perception", title: "Заметить заднюю дверь", why: "Куда хозяин смотрит, когда нервничает." },
    { pf: "crafting", dnd: "investigation", title: "Понять вещь", why: "Починят ли это и не сломано ли уже." },
  ],
  temple: [
    { pf: "religion", dnd: "religion", title: "Узнать символ", why: "Чей алтарь и что на нём нельзя трогать." },
    { pf: "perception", dnd: "perception", title: "Осмотреть зал", why: "Кто молится, а кто смотрит на вас." },
    { pf: "medicine", dnd: "medicine", title: "Осмотреть больного", why: "У порога храма часто лежит тот, кому плохо." },
  ],
  court: [
    { pf: "society", dnd: "history", title: "Читать зал", why: "Кто сидит выше и кто шепчется." },
    { pf: "perception", dnd: "insight", title: "Понять паузу", why: "Молчание при дворе тоже ответ." },
    { pf: "stealth", dnd: "stealth", title: "Выйти незаметно", why: "Не всякий уход должен быть поклоном." },
  ],
  road: [
    { pf: "survival", dnd: "survival", title: "Держать путь", why: "Развилка и чужой след на обочине." },
    { pf: "perception", dnd: "perception", title: "Смотреть вперёд", why: "Засада любит поворот." },
    { pf: "athletics", dnd: "athletics", title: "Вытащить телегу", why: "Грязь и сломанное колесо." },
  ],
  wild: [
    { pf: "survival", dnd: "survival", title: "Идти по следу", why: "Корм, вода и чья это тропа." },
    { pf: "nature", dnd: "nature", title: "Узнать местность", why: "Ягода, зверь, дурная погода." },
    { pf: "perception", dnd: "perception", title: "Не пропустить логово", why: "Тишина тоже след." },
    { pf: "stealth", dnd: "stealth", title: "Обойти зверя", why: "Не всякую встречу надо начинать." },
  ],
  dungeon: [
    { pf: "perception", dnd: "perception", title: "Искать опасность", why: "Щель, нить, чужое дыхание." },
    { pf: "stealth", dnd: "stealth", title: "Идти тихо", why: "Камень отдаёт шаг." },
    { pf: "thievery", dnd: "investigation", title: "Замок и ловушка", why: "Руки и инструмент, не плечо." },
    { pf: "athletics", dnd: "athletics", title: "Выбить или влезть", why: "Когда тонкой работы уже нет." },
  ],
  slum: [
    { pf: "stealth", dnd: "stealth", title: "Не выделяться", why: "Чужая походка здесь видна." },
    { pf: "perception", dnd: "perception", title: "Смотреть на крыши", why: "Следят сверху чаще, чем из двери." },
    { pf: "thievery", dnd: "sleight", title: "Чужие руки", why: "Кошель проверяйте свой, не только чужой." },
  ],
};

const REST: ActionSeed[] = [
  { pf: "medicine", dnd: "medicine", title: "Лечить", why: "День отдыха — время ран, не геройства." },
  { pf: "crafting", dnd: "investigation", title: "Чинить и делать", why: "Снаряжение, формула, то, что сломалось в пути." },
  { pf: "society", dnd: "persuasion", title: "Подработка", why: "Город платит за уменье, если вы не просите милостыню." },
  { pf: "performance", dnd: "performance", title: "Заработать выступлением", why: "Песня и байка кормят, когда приключения молчат." },
];

export function sceneBrief(face: TableFace, scene: PlayScene, place: PlayPlace): SceneBrief {
  const seeds = scene === "rest" ? REST : scene === "explore" ? EXPLORE[place] : TALK[place];
  const actions = seeds.flatMap((seed) => actionRow(face, seed));
  actions.sort((left, right) => Number(right.strong) - Number(left.strong) || right.mod - left.mod);
  const placeTitle = PLAY_PLACES.find((item) => item.id === place)?.name ?? "Место не названо";
  return {
    vows: vowLines(face),
    vowEmpty: "В памятке пусто. Табу, наказ и анафема появятся здесь, когда вы их запишете.",
    prompts: promptsFor(face, place).slice(0, 5),
    actions,
    placeTitle,
    placeText: place ? PLACE_TEXT[place] : "Мастер ещё не назвал место. Держите характер при себе и спросите, город это, дорога или камень над головой. Цены и толпа зависят от ответа.",
  };
}

function actionRow(face: TableFace, seed: ActionSeed): SkillActionRow[] {
  const id = face.system === "dnd5e" ? seed.dnd : seed.pf;
  const skill = face.skills.find((row) => row.id === id);
  if (!skill) return [];
  return [{
    skillId: id,
    skill: skill.name,
    mod: skill.mod,
    title: seed.title,
    why: seed.why,
    strong: face.strong.includes(id),
  }];
}

function vowLines(face: TableFace): { label: string; text: string }[] {
  const lines: { label: string; text: string }[] = [];
  if (face.deityName) lines.push({ label: "Божество", text: face.deityName });
  if (face.edicts) lines.push({ label: "Эдикты", text: face.edicts });
  if (face.anathema) lines.push({ label: "Анафема", text: face.anathema });
  for (const vow of face.vows) lines.push({ label: vow.label, text: vow.text });
  if (face.backstory) lines.push({ label: "История", text: firstLine(face.backstory) });
  return lines;
}

function promptsFor(face: TableFace, place: PlayPlace): string[] {
  const ancestry = face.ancestryName.trim();
  const tone = ANCESTRY_TONE[ancestry.toLocaleLowerCase("ru")] ?? "";
  const manner = CLASS_MANNER[face.classId] ?? "Держитесь того, что умеете, и не играйте чужой характер.";
  const past = BG_LINE[face.backgroundId] ?? `Прошлое «${face.backgroundName}» — ваш повод открыть рот.`;
  const lines = [
    `Вы ${ancestry.toLocaleLowerCase("ru")} и ${face.className.toLocaleLowerCase("ru")}. ${manner} ${PLACE_TONE[place]} ${tone}`.replace(/\s+/g, " ").trim(),
    `${past} ${PLACE_ASK[place]}`.replace(/\s+/g, " ").trim(),
    neverLine(face),
    offerLine(face, place),
    closingLine(face, place),
  ];
  return lines.filter(Boolean);
}

/** Total modifier once. Specialization and rage are parts of that total, not a second bonus. */
export function plainDamage(raw: string): string {
  const spec = raw.match(/спец\.\s*([+−-]?\d+)/);
  const rage = raw.match(/ярость\s*([+−-]?\d+)/);
  const base = raw.replace(/\s*спец\.\s*[+−-]?\d+/, "").replace(/\s*ярость\s*[+−-]?\d+/, "").replace(/\s+/g, " ").trim();
  const parts = [
    spec ? `специализация ${spec[1]}` : "",
    rage ? `ярость ${rage[1]}` : "",
  ].filter(Boolean);
  return parts.length ? `${base} (уже входит: ${parts.join(", ")})` : base;
}

function midSentence(text: string): string {
  const trimmed = text.trim().replace(/[.。]+$/, "");
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleLowerCase("ru") + trimmed.slice(1);
}

function neverLine(face: TableFace): string {
  if (face.anathema) return `Этого вы не сделаете даже за удачную сделку: ${midSentence(face.anathema)}.`;
  const taboo = face.vows.find((vow) => vow.kind === "taboo");
  if (taboo) return `Ваше табу действует и здесь: ${midSentence(taboo.text)}.`;
  const vow = face.vows.find((row) => row.kind === "vow" || row.kind === "duty");
  if (vow) return `${vow.label} не отпускает: ${midSentence(vow.text)}.`;
  if (face.edicts) return `Эдикт напоминает раньше, чем выгода: ${midSentence(face.edicts)}.`;
  return "Не обещайте того, чего нет в памятке. Пустая клятва за столом легко забывается.";
}

function offerLine(face: TableFace, place: PlayPlace): string {
  if (face.backgroundId === "field-medic" || face.classId === "cleric" || face.classId === "oracle") {
    if (place === "tavern") return "Осмотритесь, кто сидит криво или держится за бок. Сначала предложите перевязку, потом спросите, кто ударил.";
    if (place === "dungeon" || place === "wild" || place === "road") return "После стычки не бегите дальше, пока не проверите, кто ещё дышит.";
    return "Если кто-то ранен, это ваш вход в разговор: помощь открывает рот лучше угрозы.";
  }
  if (face.classId === "fighter" || face.classId === "champion" || face.classId === "paladin" || face.classId === "barbarian") {
    if (place === "shop") return "Не торгуйтесь криком. Назовите, что нужно отряду, и спросите цену спокойно, второй раз.";
    if (place === "tavern") return "Сядьте так, чтобы видеть дверь. Оружие на стол не кладите, пока вас не попросили.";
    if (place === "court") return "Стоите прямо, говорите коротко и не хватаетесь за меч, чтобы подчеркнуть фразу.";
  }
  if (face.classId === "rogue" || face.classId === "bard" || face.classId === "swashbuckler") {
    if (place === "tavern" || place === "slum") return "Улыбнитесь хозяину, запомните, кто молчит, и не лезьте в карман, пока сцена ещё про слова.";
  }
  return PLACE_OFFER[place];
}

function closingLine(face: TableFace, place: PlayPlace): string {
  if (face.deityName && face.edicts) return `Если речь зайдёт о ${face.deityName}, сначала эдикты, потом спор.`;
  if (face.deityName) return `Если назовут ${face.deityName}, не отшучивайтесь: это ваша вера, не украшение.`;
  if (face.backstory) return `Из вашей истории сюда ложится вот это: ${firstLine(face.backstory)}`;
  if (place === "shop") return "Спросите мастера, торг здесь в порядке вещей или цена названа последний раз.";
  if (place === "tavern") return "Спросите мастера, свободная ли комната и не ждут ли в зале кого-то вроде вас.";
  return "Спросите мастера одну конкретную вещь о месте, прежде чем играть догадку.";
}

function firstLine(text: string): string {
  const line = text.split(/[\n.!?]/)[0]?.trim() ?? text.trim();
  return line.length > 140 ? `${line.slice(0, 137)}…` : line;
}

const FEAT_ACT: Record<string, CombatOption & { stance: PlayStance | "both" }> = {
  "sudden-charge": { name: "Внезапный натиск", line: "Два действия: подойти и ударить.", stance: "melee" },
  knockdown: { name: "Сбить ударом", line: "Удар и сразу попытка уронить.", stance: "melee" },
  "double-slice": { name: "Двойной взмах", line: "Два удара с двух рук, второй штрафуется мягче.", stance: "melee" },
  "combat-grab": { name: "Боевой захват", line: "Удар и захват одним приёмом.", stance: "melee" },
  "intimidating-strike": { name: "Устрашающий удар", line: "Удар и деморализация вместе.", stance: "melee" },
  "vicious-swing": { name: "Тяжёлый взмах", line: "Одно действие, удар больнее обычного.", stance: "melee" },
  "snagging-strike": { name: "Цепкий удар", line: "После удара цель хуже защищается.", stance: "melee" },
  "brutish-shove": { name: "Грубый толчок", line: "Толчок дальше обычного шага.", stance: "melee" },
  "dueling-parry": { name: "Дуэльный отвод", line: "Свободная рука закрывает вас, как щит.", stance: "melee" },
  "doctors-visitation": { name: "Обход лекаря", line: "Шаг к союзнику и боевая медицина.", stance: "melee" },
  "aggressive-block": { name: "Жёсткий блок", line: "Щит не только закрывает, но и отвечает.", stance: "melee" },
  "lightning-swap": { name: "Молниеносная смена", line: "Сменить оружие в руках быстрее обычного жеста.", stance: "both" },
  "power-attack": { name: "Мощная атака", line: "Два действия на один тяжёлый удар.", stance: "melee" },
  "exacting-strike": { name: "Точный удар", line: "Промах меньше портит следующий удар.", stance: "melee" },
};

const CLASS_ACT: Record<string, Record<PlayStance, CombatOption>> = {
  fighter: {
    melee: { name: "Удар воина", line: "Ближний бой — ваша работа. Бейте тем оружием, которое уже в руках." },
    ranged: { name: "Дальний удар воина", line: "Стреляйте, если оружие дальнее. Иначе это не ваш ход стоять и смотреть." },
  },
  champion: {
    melee: { name: "Реакция поборника", line: "Когда бьют союзника рядом, закройте его или ответьте." },
    ranged: { name: "Держать строй", line: "Дальняя стрельба вам чужая. Отойдите, если надо, и вернитесь к союзнику." },
  },
  paladin: {
    melee: { name: "Кара", line: "Удар клинком можно усилить заклинанием, если ячейка ещё есть." },
    ranged: { name: "Не ваша дистанция", line: "Если метательного нет, шагните ближе: кара ждёт клинок." },
  },
  barbarian: {
    melee: { name: "Ярость", line: "Вблизи вы бьёте злее. Дальний бой ярость обычно не любит." },
    ranged: { name: "Ярость и дистанция", line: "Издалека ярость почти не помогает. Подойдите." },
  },
  rogue: {
    melee: { name: "Скрытая атака", line: "Удар больнее, если цель не ждёт вас или союзник стоит рядом." },
    ranged: { name: "Скрытый выстрел", line: "Дальний удар тоже может быть скрытым, если вас не видят." },
  },
  ranger: {
    melee: { name: "Охотничий удар", line: "Бейте отмеченную добычу, не распыляйтесь на толпу." },
    ranged: { name: "Выстрел охотника", line: "Дальняя атака — ваш привычный первый ход." },
  },
  monk: {
    melee: { name: "Удар без оружия", line: "Руки и ноги — оружие. Не ищите лук, если его нет." },
    ranged: { name: "Дистанция монаха", line: "Метательного может не быть. Сократите расстояние шагом." },
  },
  wizard: {
    melee: { name: "Не стойте в толпе", line: "Клинок — запасной. Рядом с врагом вам плохо." },
    ranged: { name: "Заклинание", line: "Дальняя магия — ваш удар. Оружие доставайте, только если магия кончилась." },
  },
  sorcerer: {
    melee: { name: "Не ваш клинок", line: "Вплотную вы хрупки. Бейте, только если отходить некуда." },
    ranged: { name: "Врождённая магия", line: "Фокус и заклинание бьют дальше руки." },
  },
  warlock: {
    melee: { name: "Короткий клинок", line: "Если враг уже рядом, бейте тем, что в руке, и ищите шаг назад." },
    ranged: { name: "Потусторонний заряд", line: "Ваш привычный удар — заклинание на дистанции." },
  },
  cleric: {
    melee: { name: "Булава и молитва", line: "Можно ударить и можно закрыть союзника. Выберите, кто сейчас нужнее." },
    ranged: { name: "Молитва издалека", line: "Лечение и кара не требуют, чтобы вы стояли в зубах." },
  },
  druid: {
    melee: { name: "Зверь или посох", line: "Вблизи бейте тем, во что вы сейчас обращены, или посохом." },
    ranged: { name: "Заклинание рощи", line: "Дальняя магия природы держит вас вне досягаемости." },
  },
  bard: {
    melee: { name: "Клинок между куплетами", line: "Удар — если враг уже на вас. Иначе поддержите союзника словом." },
    ranged: { name: "Слово и выстрел", line: "Песнь и дальний фокус достают дальше меча." },
  },
};

export function combatBrief(face: TableFace, stance: PlayStance): CombatBrief {
  const pf = face.system === "pf2e";
  const melee = face.strikes.filter((row) => !row.ranged);
  const ranged = face.strikes.filter((row) => row.ranged || row.thrown);
  const spells = face.spells.filter((spell) => spell.ranged);
  const shown = stance === "melee" ? melee : ranged;
  const agile = face.strikes.some((row) => /agile|ловк/i.test(row.traits));
  const empty = stance === "ranged" && ranged.length === 0 && spells.length === 0
    ? "Дальнего удара нет: ни лука, ни метательного, ни заклинания с дистанцией. Достаньте дротик, если он лежит в сумке, шагните ближе и бейте вплотную, поднимите щит или помогите союзнику."
    : stance === "melee" && melee.length === 0
      ? "Ближнего оружия в сумке нет. Бейте безоружным, если умеете, или отойдите и стреляйте."
      : "";
  return {
    economy: pf
      ? "В ход три действия и одна реакция. Удар, шаг, поднять щит и достать оружие стоят по одному действию. Перемещение на скорость — тоже одно."
      : "В ход действие, бонусное действие, перемещение и одна реакция до вашего следующего хода. Атака оружием — действие. У воина и части других классов в это действие входит больше одного удара. Это верно и для 2014, и для 2024: лист уже посчитал попадание.",
    map: pf
      ? agile
        ? "Штраф повторных атак: второй удар −5, третий −10. У ловкого оружия мягче: −4 и −8."
        : "Штраф повторных атак: второй удар −5, третий −10."
      : "",
    strikes: shown.map((row) => ({
      name: row.name,
      attack: fmt(row.attack),
      damage: plainDamage(row.damage),
      note: row.thrown && stance === "ranged" ? "метательное" : row.traits,
    })),
    maneuvers: stance === "melee" ? meleeManeuvers(face) : rangedManeuvers(face),
    classActions: classActions(face, stance),
    spells: stance === "ranged" ? spells.map((spell) => ({
      name: spell.name,
      line: `${spell.level === 0 ? "фокус" : `круг ${spell.level}`}, дальность ${spell.range}${face.spellAttack != null ? `, бросок атаки ${fmt(face.spellAttack)}` : ""}`,
    })) : [],
    empty,
  };
}

function skillMod(face: TableFace, id: string): string {
  const skill = face.skills.find((row) => row.id === id);
  return skill ? `${skill.name} ${fmt(skill.mod)}` : id;
}

function meleeManeuvers(face: TableFace): CombatOption[] {
  const athletic = skillMod(face, "athletics");
  const scare = skillMod(face, face.system === "dnd5e" ? "intimidation" : "intimidation");
  if (face.system === "pf2e") {
    return [
      { name: "Сбить с ног", line: `${athletic}. Одно действие, это атака: повторный приём получает штраф.` },
      { name: "Захват", line: `${athletic}. Одно действие, атака. Успех держит цель до вашего следующего хода.` },
      { name: "Толчок", line: `${athletic}. Одно действие, атака. Цель сдвигается, если не устояла.` },
      { name: "Деморализация", line: `${scare}. Одно действие. Это не атака, штраф повторных ударов на неё не ложится.` },
      { name: "Поднять щит", line: face.shield ? "Щит в сумке есть. Одно действие, пока щит не поднят, он почти не защищает." : "Щита в сумке нет. Без него этот приём не из чего делать." },
      { name: "Шаг", line: "Пять футов, одно действие. Обычную реакцию на уход это не вызывает." },
    ];
  }
  return [
    { name: "Сбить с ног", line: `${athletic}. Заменяет одну атаку внутри действия.` },
    { name: "Захват", line: `${athletic}. Заменяет одну атаку. Пока держите, цель рядом.` },
    { name: "Толчок", line: `${athletic}. Заменяет одну атаку и отодвигает, если проверка взята.` },
    { name: "Запугать", line: `${scare}. Обычно целое действие, не удар.` },
    { name: "Поднять щит", line: face.shield ? "Щит уже в сумке. Пока он в руке, класс брони на листе его учитывает." : "Щита нет. Закрыться нечем: уйдите за союзника или за угол." },
    { name: "Отойти", line: "Действие, чтобы уйти от врага вплотную без удара в ответ. Обычное перемещение этого не даёт." },
  ];
}

function rangedManeuvers(face: TableFace): CombatOption[] {
  if (face.system === "pf2e") {
    return [
      { name: "Занять укрытие", line: "Одно действие, если рядом угол, низкая стена или кто-то крупнее вас." },
      { name: "Шаг или перемещение", line: "Шаг — пять футов. Перемещение — одно действие на всю скорость, чтобы оторваться." },
      { name: "Достать оружие", line: "Взаимодействие, одно действие: вынуть лук, дротик или стрелу, если рука занята." },
    ];
  }
  return [
    { name: "Укрытие", line: "Встаньте за угол или за союзника. Мастер скажет, мешает ли это по вам стрелять." },
    { name: "Отойти на дистанцию", line: "Перемещение — ваша скорость. Если враг уже рядом, сначала действие «отойти», иначе он ударит в спину." },
    { name: "Достать оружие", line: "Один предмет за ход можно вынуть свободно, пока рука не занята щитом и клинком сразу." },
  ];
}

function classActions(face: TableFace, stance: PlayStance): CombatOption[] {
  const fromFeats = face.featIds.flatMap((id) => {
    const hint = FEAT_ACT[id];
    if (!hint || (hint.stance !== "both" && hint.stance !== stance)) return [];
    return [{ name: hint.name, line: hint.line }];
  }).slice(0, 4);
  const generic = CLASS_ACT[face.classId]?.[stance];
  return generic ? [generic, ...fromFeats] : fromFeats;
}
