#!/usr/bin/env python3
"""Черты, снаряжение, руны, наследия и пакет до ремастера из полей Foundry.

Абзац description не копируется. Русское имя — словарь и передача буквами.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = Path("/tmp/pf2e/packs/pf2e")
OUT = ROOT / "src/data/generated"
CHECKED = "2026-10-16"
ORC = "https://paizo.com/orclicense"
OGL = "https://legacy.aonprd.com"

REMASTER_BOOKS = {
    "Pathfinder Player Core": ("pf-player-core", "Player Core", "Ядро игрока"),
    "Pathfinder Player Core 2": ("pf-orc-more", "Player Core 2", "Ядро игрока 2"),
    "Pathfinder GM Core": ("pf-orc-more", "GM Core", "Ядро ведущего"),
}
LEGACY_BOOKS = {
    "Pathfinder Core Rulebook": ("Core Rulebook", "Основная книга правил"),
    "Pathfinder Advanced Player's Guide": ("Advanced Player's Guide", "Расширенное руководство игрока"),
    "Pathfinder Gamemastery Guide": ("Gamemastery Guide", "Руководство ведущего"),
}
NEW_ANCESTRIES = {"catfolk", "hobgoblin", "kholo", "kobold", "lizardfolk", "ratfolk", "tengu", "tripkee"}
PATH_BOOK = "Pathfinder Player Core 2"

CLASSES = {
    "alchemist": "алхимик",
    "animist": "анимист",
    "barbarian": "варвар",
    "bard": "бард",
    "champion": "поборник",
    "cleric": "жрец",
    "commander": "командир",
    "druid": "друид",
    "exemplar": "экземплар",
    "fighter": "воин",
    "guardian": "страж",
    "gunslinger": "стрелок",
    "inventor": "изобретатель",
    "investigator": "сыщик",
    "kineticist": "кинетик",
    "magus": "магус",
    "monk": "монах",
    "necromancer": "некромант",
    "oracle": "оракул",
    "psychic": "экстрасенс",
    "ranger": "следопыт",
    "rogue": "плут",
    "sorcerer": "чародей",
    "swashbuckler": "сорвиголова",
    "thaumaturge": "тауматург",
    "witch": "ведьма",
    "wizard": "волшебник",
}
ANCESTRIES = {
    "catfolk": "кошачий народ",
    "dwarf": "дварф",
    "elf": "эльф",
    "gnome": "гном",
    "goblin": "гоблин",
    "halfling": "полурослик",
    "hobgoblin": "хобгоблин",
    "human": "человек",
    "kholo": "кхоло",
    "kobold": "кобольд",
    "leshy": "леший",
    "lizardfolk": "ящеролюд",
    "orc": "орк",
    "ratfolk": "крысиный народ",
    "tengu": "тэнгу",
    "tripkee": "трипки",
}
SKILL = {
    "acrobatics": "Акробатика",
    "arcana": "Аркана",
    "athletics": "Атлетика",
    "crafting": "Ремесло",
    "deception": "Обман",
    "diplomacy": "Дипломатия",
    "intimidation": "Запугивание",
    "medicine": "Медицина",
    "nature": "Природа",
    "occultism": "Оккультизм",
    "performance": "Выступление",
    "religion": "Религия",
    "society": "Общество",
    "stealth": "Скрытность",
    "survival": "Выживание",
    "thievery": "Воровство",
}
ABILITY = {
    "strength": "Сила",
    "dexterity": "Ловкость",
    "constitution": "Телосложение",
    "intelligence": "Интеллект",
    "wisdom": "Мудрость",
    "charisma": "Харизма",
}
RANK = {"trained": "обучен", "expert": "эксперт", "master": "мастер", "legendary": "легенда"}
DMG = {
    "slashing": "рубящий",
    "piercing": "колющий",
    "bludgeoning": "дробящий",
    "fire": "огонь",
    "cold": "холод",
    "electricity": "электричество",
    "acid": "кислота",
    "poison": "яд",
    "mental": "ментальный",
    "sonic": "звук",
    "force": "силовое поле",
    "vitality": "жизненная сила",
    "void": "пустота",
    "spirit": "дух",
    "bleed": "кровотечение",
    "untyped": "без типа",
    "physical": "физический",
}
TRAITS = {
    "flourish": "расцвет",
    "press": "нажим",
    "open": "открытое",
    "rage": "ярость",
    "concentrate": "концентрация",
    "manipulate": "манипуляция",
    "attack": "атака",
    "move": "движение",
    "agile": "проворное",
    "finesse": "фехтовальное",
    "versatile-p": "переменное колющее",
    "versatile-s": "переменное рубящее",
    "versatile-b": "переменное дробящее",
    "two-hand-d12": "двуручное к12",
    "two-hand-d10": "двуручное к10",
    "two-hand-d8": "двуручное к8",
    "thrown-10": "метательное 10 футов",
    "thrown-20": "метательное 20 футов",
    "deadly-d8": "смертельное к8",
    "deadly-d10": "смертельное к10",
    "deadly-d6": "смертельное к6",
    "deadly-d12": "смертельное к12",
    "fatal-d10": "роковое к10",
    "fatal-d12": "роковое к12",
    "fatal-d8": "роковое к8",
    "reach": "досягаемость",
    "sweep": "размах",
    "shove": "толчок",
    "trip": "подсечка",
    "parry": "парирование",
    "disarm": "разоружение",
    "grapple": "захват",
    "unarmed": "безоружное",
    "magical": "магический",
    "alchemical": "алхимический",
    "consumable": "расходуемый",
    "elixir": "эликсир",
    "potion": "зелье",
    "oil": "масло",
    "mutagen": "мутаген",
    "poison": "яд",
    "bomb": "бомба",
    "healing": "лечение",
    "light": "свет",
    "common": "обычная",
    "uncommon": "необычная",
    "rare": "редкая",
    "unique": "уникальная",
    "mental": "ментальное",
    "emotion": "эмоция",
    "fear": "страх",
    "auditory": "слуховое",
    "visual": "зрительное",
    "olfactory": "запаховое",
    "fortune": "удача",
    "misfortune": "неудача",
    "stance": "стойка",
    "aura": "аура",
    "dedication": "посвящение",
    "archetype": "архетип",
    "multiclass": "мультикласс",
    "skill": "навык",
    "general": "общая",
    "downtime": "свободное время",
    "exploration": "исследование",
    "secret": "тайное",
    "incapacitation": "нейтрализация",
    "injury": "ранение",
    "inhaled": "вдыхаемый",
    "contact": "контакт",
    "ingested": "проглатываемый",
    "sleep": "сон",
    "disease": "болезнь",
    "virulent": "живучий",
    "talisman": "талисман",
    "snare": "силок",
    "gadget": "устройство",
    "scroll": "свиток",
    "wand": "жезл",
    "staff": "посох",
    "precious": "драгоценный",
    "invested": "настроенный",
    "apex": "вершина",
    "focused": "фокус",
    "monk": "монах",
    "fire": "огонь",
    "cold": "холод",
    "electricity": "электричество",
    "acid": "кислота",
    "holy": "святое",
    "unholy": "нечестивое",
    "darkness": "тьма",
    "shadow": "тень",
    "good": "доброе",
    "evil": "злое",
    "chaotic": "хаотичное",
    "lawful": "законное",
    "additive": "добавка",
    "infused": "настоянный",
    "splash": "брызги",
    "thrown": "метательное",
    "propulsive": "метательное усилие",
    "volley-30": "залп 30",
    "reload-0": "перезарядка 0",
    "reload-1": "перезарядка 1",
    "brutal": "жёсткое",
    "backswing": "замах",
    "forceful": "напор",
    "free-hand": "свободная рука",
    "jousting-d6": "турнирное к6",
    "razor": "бритва",
    "twin": "парное",
    "attached-to-shield": "крепится к щиту",
    "attached-to-crossbow-or-firearm": "крепится к арбалету",
    "hampering": "мешает",
    "nonlethal": "несмертельное",
    "comfort": "удобный",
    "flexible": "гибкий",
    "noisy": "шумный",
    "bulwark": "бастион",
    "cumulative": "накопительный",
    "healing": "лечение",
    "lozenge": "леденец",
    "drug": "снадобье",
    "fey": "фея",
    "plant": "растение",
    "fungus": "гриб",
    "wooden": "деревянный",
    "metal": "металл",
    "clockwork": "заводной",
    "kobold": "кобольд",
    "orc": "орк",
    "dwarf": "дварф",
    "elf": "эльф",
    "gnome": "гном",
    "goblin": "гоблин",
    "halfling": "полурослик",
    "human": "человек",
    "leshy": "леший",
    "catfolk": "кошачий народ",
    "hobgoblin": "хобгоблин",
    "kholo": "кхоло",
    "lizardfolk": "ящеролюд",
    "ratfolk": "крысиный народ",
    "tengu": "тэнгу",
    "tripkee": "трипки",
}
TRAITS.update(CLASSES)
WORDS = {
    "sudden": "внезапный",
    "charge": "рывок",
    "strike": "удар",
    "striking": "ударная",
    "shield": "щит",
    "block": "блок",
    "power": "сила",
    "attack": "атака",
    "weapon": "оружие",
    "armor": "доспех",
    "potency": "мощь",
    "greater": "большая",
    "major": "старшая",
    "minor": "малая",
    "moderate": "средняя",
    "lesser": "меньшая",
    "supreme": "высшая",
    "true": "истинная",
    "flaming": "огненная",
    "frost": "морозная",
    "shock": "грозовая",
    "corrosive": "едкая",
    "ghost": "призрачная",
    "touch": "касание",
    "holy": "святая",
    "unholy": "нечестивая",
    "resilient": "стойкая",
    "slick": "скользкая",
    "shadow": "теневая",
    "invisibility": "невидимость",
    "winged": "крылатая",
    "fearsome": "грозная",
    "grievous": "тяжкая",
    "fortification": "укрепление",
    "extending": "удлиняющая",
    "ready": "готовая",
    "brilliant": "яркая",
    "energy": "энергетическая",
    "resistant": "устойчивая",
    "animated": "оживлённая",
    "vitalizing": "живительная",
    "astral": "звёздная",
    "reinforcing": "укрепляющая",
    "rune": "руна",
    "winter": "зимний",
    "summer": "летний",
    "jungle": "джунгли",
    "hunting": "охотничий",
    "clawed": "когтистый",
    "liminal": "пограничный",
    "nine": "девять",
    "lives": "жизней",
    "sharp": "острый",
    "eared": "ухий",
    "catfolk": "кошачий",
    "hobgoblin": "хобгоблин",
    "kholo": "кхоло",
    "kobold": "кобольд",
    "lizardfolk": "ящеролюд",
    "ratfolk": "крысиный",
    "tengu": "тэнгу",
    "tripkee": "трипки",
    "fury": "яростный",
    "instinct": "инстинкт",
    "animal": "звериный",
    "dragon": "драконий",
    "giant": "великаний",
    "spirit": "духовный",
    "elemental": "стихийный",
    "superstition": "суеверный",
    "braggart": "хвастун",
    "gymnast": "гимнаст",
    "fencer": "фехтовальщик",
    "wit": "остряк",
    "battledancer": "боевой танцор",
    "cosmos": "космос",
    "lore": "знание",
    "flames": "пламя",
    "life": "жизнь",
    "battle": "битва",
    "ancestors": "предки",
    "tempest": "буря",
    "mystery": "тайна",
    "curse": "проклятие",
    "of": "",
    "the": "",
    "and": "и",
    "a": "",
    "an": "",
    "elixir": "эликсир",
    "potion": "зелье",
    "oil": "масло",
    "mutagen": "мутаген",
    "poison": "яд",
    "bomb": "бомба",
    "antidote": "противоядие",
    "healing": "лечения",
    "lesser": "малое",
    "acid": "кислота",
    "alchemist": "алхимика",
    "fire": "огня",
    "frost": "мороза",
    "longsword": "длинный меч",
    "shortsword": "короткий меч",
    "dagger": "кинжал",
    "rapier": "рапира",
    "greatsword": "двуручный меч",
    "longbow": "длинный лук",
    "shortbow": "короткий лук",
    "crossbow": "арбалет",
    "hand": "ручной",
    "heavy": "тяжёлый",
    "light": "лёгкий",
    "leather": "кожаный",
    "chain": "кольчуга",
    "mail": "",
    "shield": "щит",
    "buckler": "баклер",
    "steel": "стальной",
    "wooden": "деревянный",
    "spear": "копьё",
    "staff": "посох",
    "mace": "булава",
    "warhammer": "боевой молот",
    "battleaxe": "секира",
    "greataxe": "бердыш",
    "pick": "клевец",
    "flail": "цеп",
    "whip": "кнут",
    "halberd": "алебарда",
    "lance": "пика",
    "sickle": "серп",
    "club": "дубина",
    "javelin": "дротик",
    "sling": "праща",
    "blowgun": "духовая трубка",
    "arrow": "стрела",
    "bolt": "болт",
    "quiver": "колчан",
    "backpack": "рюкзак",
    "rope": "верёвка",
    "torch": "факел",
    "rations": "паёк",
    "waterskin": "бурдюк",
    "bedroll": "спальник",
    "tent": "палатка",
    "ladder": "лестница",
    "crowbar": "лом",
    "hammer": "молоток",
    "piton": "крюк",
    "grappling": "абордажный",
    "hook": "крюк",
    "lock": "замок",
    "manacles": "кандалы",
    "thieves": "воровские",
    "tools": "инструменты",
    "healer": "лекаря",
    "kit": "набор",
    "holy": "святой",
    "water": "вода",
    "scroll": "свиток",
    "wand": "жезл",
    "potion": "зелье",
    "of": "",
    "healing": "лечения",
    "greater": "большое",
    "moderate": "среднее",
    "lesser": "малое",
    "major": "старшее",
    "minor": "малое",
    "true": "истинное",
    "bestial": "звериное",
    "mutagen": "мутаген",
    "quicksilver": "ртутный",
    "juggernaut": "несокрушимый",
    "serene": "безмятежный",
    "cognitive": "познавательный",
    "silvertongue": "среброязыкий",
    "energy": "энергии",
    "mutagen": "мутаген",
    "drakeheart": "сердце дракона",
    "mistform": "туманный облик",
    "cheetah": "гепарда",
    "elixir": "эликсир",
    "darkvision": "тёмного зрения",
    "comprehension": "понимания",
    "antidote": "противоядие",
    "antiplague": "противочумное",
    "salve": "мазь",
    "smokestick": "дымовая шашка",
    "tindertwig": "запальная ветка",
    "sunrod": "солнечный стержень",
    "glow": "световой",
    "rod": "стержень",
}
_extra_words = Path(__file__).with_name("name_extra.json")
if _extra_words.exists():
    WORDS.update({key: value for key, value in json.loads(_extra_words.read_text()).items() if isinstance(value, str)})
DIGRAPHS = [
    ("sch", "щ"),
    ("sh", "ш"),
    ("ch", "ч"),
    ("th", "т"),
    ("ph", "ф"),
    ("zh", "ж"),
    ("kh", "х"),
    ("ya", "я"),
    ("yu", "ю"),
    ("yo", "ё"),
    ("ee", "и"),
    ("oo", "у"),
]
LAT = {
    "a": "а",
    "b": "б",
    "c": "к",
    "d": "д",
    "e": "е",
    "f": "ф",
    "g": "г",
    "h": "х",
    "i": "и",
    "j": "дж",
    "k": "к",
    "l": "л",
    "m": "м",
    "n": "н",
    "o": "о",
    "p": "п",
    "q": "к",
    "r": "р",
    "s": "с",
    "t": "т",
    "u": "у",
    "v": "в",
    "w": "в",
    "x": "кс",
    "y": "и",
    "z": "з",
}
LETTER = "Имя на экране собрано по словам и по буквам. Это не изданный перевод."
LATIN = re.compile(r"[A-Za-z]")
DICE = re.compile(r"\d+d\d+")


def load(path: Path):
    try:
        data = json.loads(path.read_text())
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def translit(word: str) -> str:
    text = word.lower()
    out = []
    i = 0
    while i < len(text):
        hit = False
        for latin, cyr in DIGRAPHS:
            if text.startswith(latin, i):
                out.append(cyr)
                i += len(latin)
                hit = True
                break
        if hit:
            continue
        out.append(LAT.get(text[i], ""))
        i += 1
    return "".join(out)


def ru_name(english: str) -> str:
    parts = re.findall(r"[A-Za-z]+|\d+|[^A-Za-z\d]+", english)
    out = []
    for part in parts:
        if part.isdigit() or not part[:1].isalpha():
            out.append(part)
            continue
        word = WORDS.get(part.lower())
        out.append(word if word is not None else translit(part))
    name = re.sub(r"\s+", " ", "".join(out)).strip(" -–—")
    name = re.sub(r"\s+([,)])", r"\1", name)
    name = re.sub(r"\(\s+", "(", name)
    if not name:
        name = "запись"
    name = name[:1].upper() + name[1:]
    if LATIN.search(name):
        name = "".join(LAT.get(ch.lower(), ch) if ch.isalpha() else ch for ch in name)
    return name


def traits_of(system: dict) -> tuple[list[str], str]:
    raw = system.get("traits") if isinstance(system.get("traits"), dict) else {}
    values = [item for item in (raw.get("value") or []) if isinstance(item, str)]
    rarity = raw.get("rarity") or "common"
    return values, str(rarity)


def trait_ru(traits: list[str]) -> str:
    names = []
    for trait in traits:
        if trait in CLASSES:
            names.append(CLASSES[trait])
        elif trait in ANCESTRIES:
            names.append(ANCESTRIES[trait])
        elif trait in TRAITS:
            names.append(TRAITS[trait])
        else:
            names.append(translit(trait.replace("-", " ")))
    return ", ".join(names)


def price_text(system: dict) -> str:
    price = system.get("price") if isinstance(system.get("price"), dict) else {}
    value = price.get("value") if isinstance(price.get("value"), dict) else {}
    parts = []
    for key, label in (("pp", "пм"), ("gp", "зм"), ("sp", "см"), ("cp", "мм")):
        amount = value.get(key)
        if isinstance(amount, int) and amount:
            parts.append(f"{amount} {label}")
    if not parts:
        return "без цены в поле"
    text = " ".join(parts)
    per = price.get("per")
    if isinstance(per, int) and per > 1:
        text += f" за {per}"
    return text


def bulk_text(system: dict) -> str:
    bulk = system.get("bulk") if isinstance(system.get("bulk"), dict) else {}
    value = bulk.get("value")
    if value in (0.1, "L", "l"):
        return "лёгкий"
    if value in (0, "0", None, ""):
        return "0"
    if isinstance(value, int):
        return str(value)
    return "не число"


def level_of(system: dict) -> int | None:
    level = system.get("level")
    if isinstance(level, dict):
        level = level.get("value")
    if isinstance(level, int):
        return level
    return None


def prereq_text(system: dict) -> str:
    raw = system.get("prerequisites")
    values = raw.get("value") if isinstance(raw, dict) else raw
    if not isinstance(values, list) or not values:
        return ""
    lines = []
    for item in values:
        text = item.get("value") if isinstance(item, dict) else item
        if not isinstance(text, str) or not text.strip():
            continue
        skill = re.fullmatch(r"(trained|expert|master|legendary) in ([a-z]+)", text.strip(), re.I)
        ability = re.fullmatch(r"(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) \+(\d+)", text.strip())
        if skill and skill.group(2).lower() in SKILL:
            lines.append(f"{RANK[skill.group(1).lower()]} в навыке {SKILL[skill.group(2).lower()]}")
        elif ability:
            lines.append(f"{ABILITY[ability.group(1).lower()]} +{ability.group(2)}")
        else:
            return "В книге есть требование, его текст не скопирован."
    return "; ".join(lines)


def action_text(system: dict) -> str:
    kind = system.get("actionType")
    kind = kind.get("value") if isinstance(kind, dict) else kind
    count = system.get("actions")
    count = count.get("value") if isinstance(count, dict) else count
    if kind == "reaction":
        return "реакция"
    if kind == "free":
        return "свободное действие"
    if kind == "passive" or count in (None, ""):
        return "постоянная"
    if count == 1:
        return "1 действие"
    if count == 2:
        return "2 действия"
    if count == 3:
        return "3 действия"
    return "действие"


def usage_text(system: dict) -> str:
    usage = system.get("usage")
    value = usage.get("value") if isinstance(usage, dict) else usage
    table = {
        "held-in-one-hand": "в одной руке",
        "held-in-two-hands": "в двух руках",
        "held-in-one-plus-hands": "в одной или двух руках",
        "worn": "носится",
        "etched-onto-a-weapon": "вытравливается на оружие",
        "etched-onto-armor": "вытравливается на доспех",
        "etched-onto-a-shield": "вытравливается на щит",
        "etched-onto-melee-weapon": "вытравливается на оружие ближнего боя",
        "etched-onto-weapon-wo-holy-rune": "вытравливается на оружие без святой руны",
        "etched-onto-weapon-wo-unholy-rune": "вытравливается на оружие без нечестивой руны",
        "etched-onto-lm-nonmetal-armor": "вытравливается на лёгкий или средний неметаллический доспех",
        "etched-onto-med-heavy-armor": "вытравливается на средний или тяжёлый доспех",
        "etched-onto-light-armor": "вытравливается на лёгкий доспех",
        "etched-onto-slashing-melee-weapon": "вытравливается на рубящее оружие ближнего боя",
        "affixed-to-armor": "крепится к доспеху",
        "affixed-to-weapon": "крепится к оружию",
        "affixed-to-armor-or-a-weapon": "крепится к доспеху или оружию",
        "carried": "несётся",
        "other": "особый способ",
    }
    if not isinstance(value, str) or not value:
        return ""
    if value in table:
        return table[value]
    if value.startswith("worn"):
        return "носится"
    if "etch" in value:
        return "вытравливается"
    return "способ ношения в поле есть, подпись не перенесена"


def formula_ru(value) -> str:
    if isinstance(value, int):
        return str(value)
    if not isinstance(value, str):
        return ""
    text = value.replace(" ", "")
    if text in ("max(1,floor(@actor.level/2))", "max(1,floor(@actor.level/2))"):
        return "большее из 1 и половины уровня"
    if re.fullmatch(r"\d+", text):
        return text
    return ""


def rule_bits(rules) -> list[str]:
    if not isinstance(rules, list):
        return []
    bits = []
    for rule in rules:
        if not isinstance(rule, dict):
            continue
        key = rule.get("key")
        if key == "Resistance":
            kind = DMG.get(str(rule.get("type")), "")
            number = formula_ru(rule.get("value"))
            if kind and number:
                bits.append(f"сопротивление ({kind}) {number}")
        elif key == "FlatModifier" and isinstance(rule.get("value"), int):
            selector = rule.get("selector")
            skill = SKILL.get(str(selector), "")
            if skill:
                bits.append(f"модификатор {rule['value']:+d} к навыку {skill}")
            elif selector == "perception":
                bits.append(f"модификатор {rule['value']:+d} к восприятию")
        elif key == "Sense":
            sense = {"scent": "нюх", "darkvision": "тёмное зрение", "low-light-vision": "сумеречное зрение"}.get(str(rule.get("selector")), "")
            if sense:
                distance = rule.get("range")
                bits.append(f"чувство «{sense}»" + (f" {distance} футов" if isinstance(distance, int) else ""))
        elif key == "Strike":
            damage = ((rule.get("damage") or {}).get("base") or {}) if isinstance(rule.get("damage"), dict) else {}
            dice = damage.get("dice")
            die = damage.get("die")
            dtype = DMG.get(str(damage.get("damageType")), "")
            if isinstance(dice, int) and isinstance(die, str) and dtype:
                bits.append(f"безоружный удар {dice}{die} {dtype}")
        elif key == "BaseSpeed" and isinstance(rule.get("value"), int):
            bits.append(f"скорость {rule['value']}")
        elif key == "ActiveEffectLike" and isinstance(rule.get("path"), str) and rule.get("path", "").startswith("system.skills."):
            skill_id = rule["path"].split(".")[2] if rule["path"].count(".") >= 2 else ""
            if skill_id in SKILL and rule.get("value") == 1:
                bits.append(f"обучает навыку {SKILL[skill_id]}")
        elif key == "CreatureSize":
            bits.append("меняет размер")
        elif key == "GrantItem":
            bits.append("даёт связанную запись, её абзац не скопирован")
    return bits


def readable(text: str) -> str:
    return DICE.sub("", text)


def card(entry_id: str, name: str, original: str, category: str, title: str, rank, short: str, text: str, source_id: str, prereq: str, location: str, link: str, version: str) -> dict:
    if any(LATIN.search(readable(part)) for part in (name, text, short, prereq)):
        sample = next(part for part in (name, text, short, prereq) if LATIN.search(readable(part)))
        raise SystemExit(f"latin in {entry_id}: {sample[:240]}")
    return {
        "id": entry_id,
        "name": name,
        "originalName": original,
        "altNames": [],
        "category": category,
        "categoryTitle": title,
        "rank": rank,
        "short": short,
        "text": text,
        "sourceId": source_id,
        "prereq": prereq,
        "location": location,
        "link": link,
        "status": "verified-reference",
        "checkedOn": CHECKED,
        "sourceVersion": version,
    }


def walk(folder: str):
    for path in (PACK / folder).rglob("*.json"):
        data = load(path)
        if not data:
            continue
        system = data.get("system")
        if not isinstance(system, dict):
            continue
        yield path, data, system


def publication(system: dict):
    pub = system.get("publication")
    return pub if isinstance(pub, dict) else {}


def feat_cards() -> tuple[list[dict], list[dict]]:
    cards = []
    index = []
    seen = set()
    for path, data, system in walk("feats"):
        pub = publication(system)
        book = REMASTER_BOOKS.get(pub.get("title", ""))
        if not book or pub.get("license") != "ORC" or pub.get("remaster") is not True:
            continue
        category = system.get("category")
        if category not in ("ancestry", "class", "skill", "general"):
            continue
        level = level_of(system)
        if level is None or level < 1 or level > 20:
            continue
        original = str(data.get("name") or path.stem)
        slug = path.stem
        if slug in seen:
            slug = f"{slug}-{len(seen)}"
        seen.add(slug)
        traits, rarity = traits_of(system)
        classes = [trait for trait in traits if trait in CLASSES]
        ancestries = [trait for trait in traits if trait in ANCESTRIES]
        name = ru_name(original)
        prereq = prereq_text(system)
        kind_title = {"ancestry": "Черта народа", "class": "Черта класса", "skill": "Черта навыка", "general": "Общая черта"}[category]
        bits = [
            f"{kind_title}, уровень {level}.",
            f"Действие: {action_text(system)}.",
            f"Редкость: {TRAITS.get(rarity, 'обычная')}.",
        ]
        if traits:
            bits.append(f"Черты: {trait_ru(traits)}.")
        if classes:
            bits.append("В слот класса её можно взять только этому классу.")
        if ancestries:
            bits.append("В слот народа её можно взять только этому народу.")
        if prereq:
            bits.append(f"Требование: {prereq}.")
        rules = rule_bits(system.get("rules"))
        if rules:
            bits.append("Из полей правил: " + "; ".join(rules) + ".")
        bits.append("Остальной эффект в поля числа не вынесен, лист его не применяет.")
        bits.append(LETTER)
        text = " ".join(bits)
        source_id, version, book_ru = book
        entry = card(
            slug,
            name,
            original,
            f"{category}-feat",
            kind_title,
            level,
            f"Уровень {level}. {action_text(system)}.",
            text,
            source_id,
            prereq,
            f"{book_ru}, {kind_title.lower()}, уровень {level}",
            ORC,
            version,
        )
        cards.append(entry)
        index.append({
            "id": slug,
            "name": name,
            "kind": category,
            "level": level,
            "classes": classes,
            "ancestries": ancestries,
        })
    return cards, index


def gear_kind(data: dict, system: dict, traits: list[str]) -> tuple[str, str]:
    usage = system.get("usage")
    value = usage.get("value") if isinstance(usage, dict) else ""
    if isinstance(value, str) and "etch" in value:
        return "rune", "Руна"
    if "alchemical" in traits or system.get("category") in ("elixir", "mutagen", "poison", "bomb"):
        return "alchemical", "Алхимический предмет"
    kind = data.get("type")
    if kind == "weapon":
        return "weapon", "Оружие"
    if kind == "armor":
        return "armor", "Доспех"
    if kind == "shield":
        return "shield", "Щит"
    return "gear", "Снаряжение"


def gear_cards() -> list[dict]:
    cards = []
    seen = set()
    for path, data, system in walk("equipment"):
        pub = publication(system)
        book = REMASTER_BOOKS.get(pub.get("title", ""))
        if not book or pub.get("license") != "ORC" or pub.get("remaster") is not True:
            continue
        original = str(data.get("name") or path.stem)
        slug = path.stem
        if slug in seen:
            slug = f"{slug}-{len(seen)}"
        seen.add(slug)
        traits, rarity = traits_of(system)
        category, title = gear_kind(data, system, traits)
        name = ru_name(original)
        level = level_of(system)
        bits = [f"{title}."]
        if level is not None:
            bits.append(f"Уровень {level}.")
        bits.append(f"Цена: {price_text(system)}.")
        bits.append(f"Объём: {bulk_text(system)}.")
        worn = usage_text(system)
        if worn:
            bits.append(f"Как носят: {worn}.")
        bits.append(f"Редкость: {TRAITS.get(rarity, 'обычная')}.")
        if traits:
            bits.append(f"Черты: {trait_ru(traits)}.")
        damage = system.get("damage") if isinstance(system.get("damage"), dict) else None
        if data.get("type") == "weapon" and damage and isinstance(damage.get("dice"), int) and isinstance(damage.get("die"), str):
            dtype = DMG.get(str(damage.get("damageType")), "урон")
            group = system.get("group") or ""
            bits.append(f"Урон {damage['dice']}{damage['die']} {dtype}.")
            if isinstance(group, str) and group:
                bits.append(f"Группа: {translit(group)}.")
            if system.get("category") in ("simple", "martial", "advanced", "unarmed"):
                bits.append(f"Разряд: { {'simple': 'простое', 'martial': 'воинское', 'advanced': 'продвинутое', 'unarmed': 'безоружное'}[system['category']] }.")
        if data.get("type") == "armor":
            ac = system.get("acBonus")
            if isinstance(ac, int):
                bits.append(f"Предметный бонус к классу брони {ac}.")
            cap = system.get("dexCap")
            if isinstance(cap, int):
                bits.append(f"Предел Ловкости +{cap}.")
        rules = rule_bits(system.get("rules"))
        if rules:
            bits.append("Из полей правил: " + "; ".join(rules) + ".")
        else:
            bits.append("Поля правил пустые или без отдельного числа.")
        if category == "rune":
            bits.append("Лист сам эту руну на удар не накладывает: в карточке нет отдельного числа мощи или ударных костей.")
        elif category == "alchemical":
            bits.append("Алхимический предмет в сумку конструктора сам не кладётся и урон сам не бросает.")
        else:
            bits.append("В атаку и класс брони карточка сама не входит, пока предмет не записан на листе с числом.")
        bits.append(LETTER)
        source_id, version, book_ru = book
        cards.append(card(
            slug,
            name,
            original,
            category,
            title,
            level if isinstance(level, int) else None,
            f"{title}, уровень {level if level is not None else 0}.",
            " ".join(bits),
            source_id,
            "",
            f"{book_ru}, {title.lower()}",
            ORC,
            version,
        ))
    return cards


def heritage_cards() -> tuple[list[dict], dict]:
    cards = []
    grouped: dict[str, list[dict]] = {key: [] for key in NEW_ANCESTRIES}
    for path, data, system in walk("heritages"):
        pub = publication(system)
        book = REMASTER_BOOKS.get(pub.get("title", ""))
        ancestry = system.get("ancestry") if isinstance(system.get("ancestry"), dict) else {}
        slug = ancestry.get("slug")
        if slug not in NEW_ANCESTRIES or not book or pub.get("license") != "ORC" or pub.get("remaster") is not True:
            continue
        original = str(data.get("name") or path.stem)
        name = ru_name(original)
        bits = rule_bits(system.get("rules"))
        effect = "Из полей: " + "; ".join(bits) + "." if bits else "В полях наследия нет отдельного числа."
        text = f"Наследие народа. {effect} Лист сам это число к хитам, скорости и навыкам не прибавляет. {LETTER}"
        source_id, version, book_ru = book
        entry_id = f"{slug}:{path.stem}"
        cards.append(card(
            entry_id,
            name,
            original,
            "heritage",
            "Наследие",
            None,
            effect,
            text,
            source_id,
            "",
            f"{book_ru}, наследие",
            ORC,
            version,
        ))
        grouped[slug].append({"id": path.stem, "name": name, "info": text})
    return cards, grouped


def soft_predicate(node, min_level: list[int]) -> bool:
    if isinstance(node, str):
        return node in ("class:barbarian", "class:swashbuckler", "class:oracle", "feat:instinct-ability", "self:effect:rage") or (
            node == "feature:greater-weapon-specialization" and min_level.append(15) is None
        )
    if isinstance(node, dict):
        if "gte" in node and isinstance(node["gte"], list) and node["gte"][:1] == ["self:level"] and isinstance(node["gte"][1], int):
            min_level.append(node["gte"][1])
            return True
        if "or" in node and isinstance(node["or"], list):
            return all(soft_predicate(item, min_level) for item in node["or"])
        if "and" in node and isinstance(node["and"], list):
            return all(soft_predicate(item, min_level) for item in node["and"])
        return False
    if isinstance(node, list):
        return all(soft_predicate(item, min_level) for item in node)
    return False


def rage_steps(rules) -> list[dict]:
    steps = []
    if not isinstance(rules, list):
        return steps
    for rule in rules:
        if not isinstance(rule, dict) or rule.get("key") != "AdjustModifier" or rule.get("slug") != "rage":
            continue
        if not isinstance(rule.get("value"), int):
            continue
        marks: list[int] = [1]
        if not soft_predicate(rule.get("predicate") or [], marks):
            continue
        steps.append({"minLevel": max(marks), "value": rule["value"]})
    steps.sort(key=lambda item: (item["minLevel"], item["value"]))
    folded = []
    for step in steps:
        if folded and folded[-1]["minLevel"] == step["minLevel"]:
            folded[-1] = step
        else:
            folded.append(step)
    return folded


def skill_from_rules(rules) -> str | None:
    if not isinstance(rules, list):
        return None
    for rule in rules:
        if isinstance(rule, dict) and rule.get("key") == "ActiveEffectLike" and isinstance(rule.get("path"), str):
            parts = rule["path"].split(".")
            if len(parts) >= 3 and parts[0] == "system" and parts[1] == "skills" and parts[2] in SKILL and rule.get("value") == 1:
                return parts[2]
    return None


def curse_from_rules(rules) -> str:
    if not isinstance(rules, list):
        return ""
    for rule in rules:
        if isinstance(rule, dict) and rule.get("key") == "GrantItem" and isinstance(rule.get("uuid"), str) and "Curse of" in rule["uuid"]:
            return rule["uuid"].split("Item.")[-1]
    return ""


def extra_feat(rules) -> bool:
    if not isinstance(rules, list):
        return False
    for rule in rules:
        if isinstance(rule, dict) and rule.get("key") == "ChoiceSet":
            choices = rule.get("choices") if isinstance(rule.get("choices"), dict) else {}
            if choices.get("itemType") == "feat":
                return True
    return False


def path_cards() -> list[dict]:
    groups = {
        "barbarian-instinct": {"classId": "barbarian", "source": "instinct", "title": "Инстинкт"},
        "swashbuckler-style": {"classId": "swashbuckler", "source": "style", "title": "Стиль"},
        "oracle-mystery": {"classId": "oracle", "source": "mystery", "title": "Тайна"},
    }
    found = {key: [] for key in groups}
    for path, data, system in walk("class-features"):
        pub = publication(system)
        if pub.get("title") != PATH_BOOK or pub.get("license") != "ORC" or pub.get("remaster") is not True:
            continue
        traits = system.get("traits") if isinstance(system.get("traits"), dict) else {}
        tags = traits.get("otherTags") or []
        tag = next((item for item in tags if item in groups), None)
        if not tag:
            continue
        if "class-archetype" in tags:
            continue
        rules = system.get("rules") if isinstance(system.get("rules"), list) else []
        original = str(data.get("name") or path.stem)
        skill = skill_from_rules(rules)
        curse = curse_from_rules(rules)
        rage = rage_steps(rules) if tag == "barbarian-instinct" else []
        feat = extra_feat(rules) if tag == "barbarian-instinct" else False
        bits = [f"{groups[tag]['title']} класса."]
        if skill:
            bits.append(f"Поле обучает навыку {SKILL[skill]}, если он ещё не обучен.")
        if rage:
            ladder = ", ".join(f"с {step['minLevel']} уровня +{step['value']}" for step in rage)
            bits.append(f"Пока ярость включена на листе, дополнительный урон удара ближнего боя: {ladder}.")
        elif tag == "barbarian-instinct":
            bits.append("Безусловного числа урона ярости в полях нет. Лист к удару ничего не прибавляет.")
        if feat:
            bits.append("Поле даёт ещё одну классовую черту 1 уровня.")
        if curse:
            bits.append(f"С тайной связано проклятие «{ru_name(curse)}». Ступень проклятия в число не переведена.")
        if tag == "swashbuckler-style":
            bits.append("Остальные пометки стиля в постоянный модификатор не входят.")
        bits.append("Базовое действие ярости отдельным файлом в этой выгрузке не лежит, поэтому без числа из инстинкта лист сам прибавку не пишет.")
        bits.append(LETTER)
        found[tag].append({
            "id": path.stem,
            "name": ru_name(original),
            "originalName": original,
            "skill": skill,
            "curse": ru_name(curse) if curse else "",
            "rage": rage,
            "extraFeat": feat,
            "info": " ".join(bits),
        })
    return [{**groups[tag], "options": options} for tag, options in found.items()]


def legacy_cards() -> list[dict]:
    cards = []
    seen = set()
    for folder, allowed in (("feats", {"class", "ancestry", "skill", "general"}), ("equipment", None)):
        for path, data, system in walk(folder):
            pub = publication(system)
            book = LEGACY_BOOKS.get(pub.get("title", ""))
            if not book or pub.get("license") != "OGL" or pub.get("remaster") is not False:
                continue
            if folder == "feats":
                category = system.get("category")
                if category not in allowed:
                    continue
                if pub.get("title") == "Pathfinder Gamemastery Guide":
                    continue
            else:
                if pub.get("title") == "Pathfinder Advanced Player's Guide":
                    continue
            original = str(data.get("name") or path.stem)
            slug = f"{path.stem}"
            if slug in seen:
                slug = f"{slug}-legacy"
            seen.add(slug)
            version, book_ru = book
            level = level_of(system)
            if folder == "feats":
                if level is None or level < 1 or level > 20:
                    continue
                traits, _rarity = traits_of(system)
                title = {"ancestry": "Черта народа", "class": "Черта класса", "skill": "Черта навыка", "general": "Общая черта"}[system["category"]]
                text = f"Правила до ремастера. {title}, уровень {level}. Действие: {action_text(system)}. Черты: {trait_ru(traits) or 'нет'}. {LETTER} С ремастером эта карточка не смешивается и в его конструктор не входит."
                category = f"{system['category']}-feat"
            else:
                traits, _rarity = traits_of(system)
                category, title = gear_kind(data, system, traits)
                text = f"Правила до ремастера. {title}. Уровень {level if level is not None else 0}. Цена: {price_text(system)}. Объём: {bulk_text(system)}. {LETTER} С ремастером эта карточка не смешивается."
            if LATIN.search(readable(text)):
                raise SystemExit(slug + " " + text[:240])
            cards.append(card(slug, ru_name(original), original, category, title if folder == "equipment" else title, level, f"До ремастера, уровень {level if level is not None else 0}.", text, "pf-ogl", "", f"{book_ru}", OGL, version))
    return cards


def main():
    feats, index = feat_cards()
    gear = gear_cards()
    heritages, grouped = heritage_cards()
    paths = path_cards()
    legacy = legacy_cards()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "pf-lists.json").write_text(json.dumps(feats + gear + heritages, ensure_ascii=False, indent=1) + "\n")
    (OUT / "pf-feat-index.json").write_text(json.dumps(index, ensure_ascii=False) + "\n")
    (OUT / "pf-heritages.json").write_text(json.dumps(grouped, ensure_ascii=False, indent=1) + "\n")
    (OUT / "pf-paths.json").write_text(json.dumps(paths, ensure_ascii=False, indent=1) + "\n")
    (OUT / "pf-legacy.json").write_text(json.dumps(legacy, ensure_ascii=False, indent=1) + "\n")
    print("feats", len(feats), "index", len(index), "gear", len(gear), "heritages", len(heritages), "legacy", len(legacy))
    print("gear kinds", Counter(item["category"] for item in gear))
    print("feat kinds", Counter(item["kind"] for item in index))
    print("books", Counter(item["sourceVersion"] for item in feats + gear + heritages))
    print("paths", [(item["classId"], len(item["options"])) for item in paths])
    print("heritage counts", {key: len(value) for key, value in grouped.items()})
    fury = next(opt for item in paths if item["classId"] == "barbarian" for opt in item["options"] if opt["id"] == "fury-instinct")
    print("fury", fury["rage"], fury["extraFeat"])


if __name__ == "__main__":
    main()
