#!/usr/bin/env python3
"""Карточки ремастера из JSON Foundry (ORC). Числа из полей, русский текст свой."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = Path("/tmp/pf2e/packs/pf2e")
OUT = ROOT / "src/data/generated/pf-core.json"
CHECKED = "2026-10-16"
LINK = "https://paizo.com/orclicense"

BOOKS = {
    "Pathfinder Player Core": ("pf-player-core", "Ядро игрока", "Player Core"),
    "Pathfinder Player Core 2": ("pf-orc-more", "Ядро игрока 2", "Player Core 2"),
    "Pathfinder GM Core": ("pf-orc-more", "Ядро ведущего", "GM Core"),
}

NAMES = {}
NAMES.update(json.loads((ROOT / "scripts/pf_names_1.json").read_text()))
NAMES.update(json.loads((ROOT / "scripts/pf_names_2.json").read_text()))
NAMES.update(json.loads((ROOT / "scripts/ru_spells.json").read_text()))

TRAITS = {
    "manipulate": "манипуляция",
    "concentrate": "концентрация",
    "focus": "фокус",
    "mental": "ментальное",
    "illusion": "иллюзия",
    "cantrip": "заговор",
    "emotion": "эмоция",
    "incapacitation": "нейтрализация",
    "polymorph": "полиморф",
    "healing": "лечение",
    "vitality": "жизненная сила",
    "void": "пустота",
    "visual": "зрительное",
    "attack": "атака",
    "fire": "огонь",
    "curse": "проклятие",
    "hex": "сглаз",
    "plant": "растение",
    "air": "воздух",
    "composition": "композиция",
    "wood": "дерево",
    "water": "вода",
    "auditory": "слуховое",
    "subtle": "тонкое",
    "earth": "земля",
    "spirit": "дух",
    "teleportation": "телепортация",
    "aura": "аура",
    "fortune": "удача",
    "cold": "холод",
    "summon": "призыв",
    "light": "свет",
    "fear": "страх",
    "death": "смерть",
    "morph": "изменение облика",
    "detection": "обнаружение",
    "electricity": "электричество",
    "force": "силовое поле",
    "sanctified": "освящённое",
    "sonic": "звук",
    "linguistic": "речевое",
    "scrying": "подглядывание",
    "darkness": "тьма",
    "shadow": "тень",
    "prediction": "предсказание",
    "poison": "яд",
    "metal": "металл",
    "nonlethal": "несмертельное",
    "unholy": "нечестивое",
    "extradimensional": "внепространственное",
    "acid": "кислота",
    "spellshape": "форма заклинания",
    "holy": "святое",
    "olfactory": "запаховое",
    "revelation": "откровение",
    "sleep": "сон",
    "misfortune": "неудача",
    "stance": "стойка",
    "consecration": "освящение",
    "possession": "одержимость",
    "structure": "строение",
    "disease": "болезнь",
    "move": "движение",
    "fungus": "гриб",
}

CLASS_TRAITS = {
    "cleric": "жрец",
    "sorcerer": "чародей",
    "oracle": "оракул",
    "witch": "ведьма",
    "bard": "бард",
    "wizard": "волшебник",
    "monk": "монах",
    "ranger": "следопыт",
    "druid": "друид",
    "champion": "чемпион",
}

TRADITION = {
    "arcane": "арканная",
    "divine": "божественная",
    "occult": "оккультная",
    "primal": "первозданная",
}

DMG = {
    "fire": "огонь",
    "bludgeoning": "дробящий",
    "void": "пустота",
    "cold": "холод",
    "mental": "ментальный",
    "vitality": "жизненная сила",
    "electricity": "электричество",
    "spirit": "дух",
    "piercing": "колющий",
    "sonic": "звук",
    "poison": "яд",
    "acid": "кислота",
    "force": "силовое поле",
    "slashing": "рубящий",
    "bleed": "кровотечение",
    "untyped": "без типа",
}

TIME = {
    "1": "1 действие",
    "2": "2 действия",
    "3": "3 действия",
    "1 to 3": "от 1 до 3 действий",
    "1 or 2": "1 или 2 действия",
    "reaction": "реакция",
    "free": "свободное действие",
    "10 minutes": "10 минут",
    "1 minute": "1 минута",
    "1 day": "1 день",
    "1 hour": "1 час",
    "7 days": "7 дней",
    "4 hours": "4 часа",
    "3 days": "3 дня",
    "1 week": "1 неделя",
}

DURATION = {
    "": "мгновенно",
    "1 minute": "1 минута",
    "10 minutes": "10 минут",
    "varies": "зависит от способа",
    "1 hour": "1 час",
    "1 round": "1 раунд",
    "8 hours": "8 часов",
    "until your next daily preparations": "до следующей ежедневной подготовки",
    "until the next time you make your daily preparations": "до следующей ежедневной подготовки",
    "5 minutes": "5 минут",
    "until the start of your next turn": "до начала вашего следующего хода",
    "unlimited": "без срока",
    "1 year": "1 год",
    "see text": "в шапке отсылка к тексту книги, срок сюда не скопирован",
    "until the end of your next turn": "до конца вашего следующего хода",
    "until the end of the target's next turn": "до конца следующего хода цели",
    "1 day": "1 день",
    "until you leave the stance": "пока вы не выйдете из стойки",
    "4 rounds": "4 раунда",
    "up to 10 minutes": "до 10 минут",
    "10 minutes or 8 hours": "10 минут или 8 часов",
    "1 month": "1 месяц",
    "until the end of your target's next turn": "до конца следующего хода вашей цели",
    "until the end of the current turn": "до конца текущего хода",
    "3 rounds": "3 раунда",
    "1 week": "1 неделя",
    "1 year or until dismissed": "1 год или пока не отмените",
    "4d12 hours": "4d12 часов",
    "12 hours": "12 часов",
    "1 round or sustained up to 1 minute": "1 раунд или поддержка до 1 минуты",
    "see below": "срок в шапке отсылает ниже по книге и сюда не скопирован",
    "until full tribute is paid": "пока не выплачена полная дань",
    "2 rounds": "2 раунда",
    "until the end of your turn": "до конца вашего хода",
    "1 or more rounds (see below)": "1 или больше раундов, подробность в книге не скопирована",
    "1 or more rounds": "1 или больше раундов",
    "20 minutes": "20 минут",
    "24 hours": "24 часа",
}

RANGE = {
    "": "",
    "touch": "касание",
    "planetary": "планетарная",
    "varies": "зависит от способа",
    "see text": "в шапке отсылка к тексту книги",
    "0 feet": "0 футов",
    "interplanar": "межпланарная",
    "unlimited": "без предела",
    "30 feet (burst only)": "30 футов, только для взрыва",
    "60 feet; 10-foot radius, 60-foot tall cylinder": "60 футов; цилиндр радиусом 10 футов и высотой 60 футов",
    "touch or 30 feet": "касание или 30 футов",
    "30 feet; 1 cube 20 feet on each side": "30 футов; один куб со стороной 20 футов",
    "1,000 feet": "1000 футов",
    "emanation up to 40-feet": "эманация до 40 футов",
}

AREA = {
    "burst": "взрыв",
    "emanation": "эманация",
    "cone": "конус",
    "line": "линия",
    "cylinder": "цилиндр",
    "square": "квадрат",
    "cube": "куб",
}

SAVE = {"fortitude": "стойкости", "reflex": "рефлексов", "will": "воли"}

RANK_NAME = {0: "не обучен", 1: "обучен", 2: "эксперт", 3: "мастер", 4: "легенда"}
ABILITY = {
    "str": "Сила",
    "dex": "Ловкость",
    "con": "Телосложение",
    "int": "Интеллект",
    "wis": "Мудрость",
    "cha": "Харизма",
}
SKILL = {
    "crafting": "Ремесло",
    "religion": "Религия",
    "occultism": "Оккультизм",
    "performance": "Выступление",
    "nature": "Природа",
    "arcana": "Аркана",
    "society": "Общество",
    "survival": "Выживание",
    "athletics": "Атлетика",
    "acrobatics": "Акробатика",
    "medicine": "Медицина",
    "stealth": "Скрытность",
    "thievery": "Воровство",
    "deception": "Обман",
    "diplomacy": "Дипломатия",
    "intimidation": "Запугивание",
}

CLASS_RU = {
    "alchemist": "Алхимик",
    "barbarian": "Варвар",
    "champion": "Поборник",
    "investigator": "Сыщик",
    "monk": "Монах",
    "oracle": "Оракул",
    "sorcerer": "Чародей",
    "swashbuckler": "Сорвиголова",
}
ANCESTRY_RU = {
    "catfolk": "Кошачий народ",
    "hobgoblin": "Хобгоблин",
    "kholo": "Кхоло",
    "kobold": "Кобольд",
    "lizardfolk": "Ящеролюд",
    "ratfolk": "Крысиный народ",
    "tengu": "Тэнгу",
    "tripkee": "Трипки",
}

CONDITIONS = {
    "broken": (
        "Сломан",
        "Состояние предмета: хиты не выше порога поломки. Обычная функция и бонусы пропадают. Сломанный доспех всё же даёт свой предметный бонус к КБ и статусный штраф: −1 лёгкий, −2 средний, −3 тяжёлый. Предел Ловкости и штраф проверки остаются.",
    ),
    "concealed": (
        "Скрыт пеленой",
        "Вас всё ещё можно наблюдать, но атака, заклинание или иной прицельный эффект по вам требуют чистую проверку СЛ 5. Провал — эффекта нет. Область эту проверку не проходит.",
    ),
    "confused": (
        "Сбит с толку",
        "Вы застигнуты врасплох, никого не считаете союзником, не можете откладывать ход, готовить действие и тратить реакции. Свои действия уходят на удары или атакующие заговоры.",
    ),
    "controlled": (
        "Подчинён",
        "Чужая воля указывает ваши действия, включая атаки, реакции и откладывание хода. Контролёр обычно не тратит на это свои действия.",
    ),
    "cursebound": (
        "Скован проклятием",
        "Только для оракула, всегда со значением. Чем выше значение, тем тяжелее ваше проклятие тайны. Снимается перефокусировкой, не обычным лечением. Конкретный штраф вашей тайны в эту карточку не переносился.",
    ),
    "fleeing": (
        "Бежит",
        "В свой ход каждое действие тратится на то, чтобы уйти от источника состояния как можно быстрее. Действовать против источника нельзя.",
    ),
    "friendly": (
        "Дружелюбен",
        "Отношение к одному персонажу. На игрока его накладывает только сверхъестественный эффект. Простые и безопасные просьбы, скорее всего, примет.",
    ),
    "helpful": (
        "Помогает",
        "Отношение к одному персонажу. На игрока его накладывает только сверхъестественный эффект. Разумные просьбы примет, пока они не вредят ему самому.",
    ),
    "hidden": (
        "Спрятан",
        "Наблюдатель знает клетку, но не точное место. Он застигнут врасплох против вас. Прицельный эффект требует чистую проверку СЛ 11, иначе не действует. Область эту проверку не проходит.",
    ),
    "hostile": (
        "Враждебен",
        "Отношение к одному персонажу. На игрока его накладывает только сверхъестественный эффект. Просьбы не принимает и ищет, как навредить.",
    ),
    "indifferent": (
        "Безразличен",
        "Отношение по умолчанию: существо не за и не против персонажа. На игрока его накладывает только сверхъестественный эффект.",
    ),
    "invisible": (
        "Невидим",
        "Вас нельзя увидеть: для всех вы незамечены местом. Успешный Поиск против вашей СЛ Скрытности делает вас спрятанным для этого существа, пока вы снова не прокрадётесь. Если невидимость пришла на глазах, вы сразу спрятаны, а не незамечены местом. Наблюдаемым вас делает только особая магия.",
    ),
    "observed": (
        "Наблюдаем",
        "Вас видят точно. Скрытность может сменить это на «спрятан» или «незамечен местом». Точное чутьё, не только зрение, тоже может держать вас наблюдаемым.",
    ),
    "paralyzed": (
        "Парализован",
        "Вы застигнуты врасплох и не действуете, кроме воспоминания знания и действий одного лишь разума. Искать взглядом нельзя: чувства работают только там, куда вы уже смотрите без движения.",
    ),
    "persistent-damage": (
        "Длящийся урон",
        "В конце вашего хода урон выпадает заново, пока состояние держится. После этого чистая проверка СЛ 15: успех снимает состояние. Кости и тип пишет эффект, который его наложил.",
    ),
    "petrified": (
        "Окаменел",
        "Вы предмет: не действуете и не чувствуете. Объём вдвое больше обычного, КБ 9, твёрдость 8, хиты те же, что были. Порога поломки нет. Когда состояние спадает, хиты остаются такими, какими были у статуи.",
    ),
    "quickened": (
        "Ускорен",
        "В начале хода у вас на 1 действие больше. Многие эффекты ограничивают, на что его можно потратить. Несколько источников не дают второго лишнего действия.",
    ),
    "restrained": (
        "Скован",
        "Вы застигнуты врасплох и обездвижены. Атаки и манипуляции недоступны, кроме попытки вырваться или силой открыть путы. Состояние перекрывает простое обездвиживание.",
    ),
    "undetected": (
        "Незамечен местом",
        "Вас нельзя выбрать целью: клетка неизвестна. Область всё же может задеть. Наблюдатель застигнут врасплох против вас. Угаданная клетка бьётся как по спрятанному, чистая проверка СЛ 11, и броски скрыты.",
    ),
    "unfriendly": (
        "Недружелюбен",
        "Отношение к одному персонажу. На игрока его накладывает только сверхъестественный эффект. Просьбы не принимает.",
    ),
    "unnoticed": (
        "Не замечен вовсе",
        "Существо не знает, что вы здесь. Вы при этом и незамечены местом. Это нужно эффектам, которым требуется полная неосведомлённость.",
    ),
}


def block_ids(start: str, end: str) -> set[str]:
    text = (ROOT / "src/data/pf2e.ts").read_text()
    chunk = text.split(start, 1)[1].split(end, 1)[0]
    return set(re.findall(r'id: "([^"]+)"', chunk))


def load_docs(folder: str) -> list[dict]:
    rows = []
    for path in (PACK / folder).rglob("*.json"):
        if path.name.startswith("_"):
            continue
        data = json.loads(path.read_text())
        if not isinstance(data, dict) or "system" not in data:
            continue
        pub = data["system"].get("publication") or {}
        if pub.get("title") not in BOOKS or pub.get("license") != "ORC" or not pub.get("remaster"):
            continue
        data["_file"] = path.stem
        rows.append(data)
    return rows


def feet(value: str) -> str | None:
    match = re.fullmatch(r"(\d+) feet", value)
    if match:
        return f"{match.group(1)} футов"
    match = re.fullmatch(r"(\d+) miles?", value)
    if match:
        return f"{match.group(1)} миль"
    return None


def ru_range(value: str) -> str:
    if value in RANGE:
        return RANGE[value]
    converted = feet(value)
    if converted:
        return converted
    raise SystemExit(f"неизвестная дистанция: {value!r}")


def format_damage(damage: dict | None) -> str:
    if not isinstance(damage, dict):
        return ""
    parts = []
    for entry in damage.values():
        if isinstance(entry, str):
            parts.append(entry)
            continue
        if not isinstance(entry, dict):
            continue
        formula = entry.get("formula") or ""
        if not formula:
            continue
        kinds = entry.get("kinds") or []
        dtype = DMG.get(entry.get("type") or "", "")
        bit = formula
        if dtype:
            bit += f" ({dtype})"
        if "healing" in kinds and "damage" in kinds:
            bit += ", урон или лечение"
        elif "healing" in kinds:
            bit += ", лечение"
        parts.append(bit)
    return "; ".join(parts)


def spell_card(data: dict) -> dict:
    system = data["system"]
    name_en = data["name"].replace("\u2019", "'")
    name = NAMES.get(name_en)
    if not name:
        raise SystemExit(f"нет русского имени: {name_en}")
    if re.search(r"[A-Za-z]", name):
        raise SystemExit(f"латиница в имени: {name_en} -> {name}")
    source_id, book, version = BOOKS[system["publication"]["title"]]
    level = int(system["level"]["value"])
    traits = system["traits"].get("value") or []
    cantrip = "cantrip" in traits
    traditions = [TRADITION[item] for item in system["traits"].get("traditions") or []]
    mechanic = []
    classes = []
    for trait in traits:
        if trait in CLASS_TRAITS:
            classes.append(CLASS_TRAITS[trait])
        elif trait in TRAITS:
            if trait != "cantrip":
                mechanic.append(TRAITS[trait])
        else:
            raise SystemExit(f"неизвестная черта {trait} у {name_en}")
    time = TIME[system["time"]["value"]]
    distance = ru_range((system.get("range") or {}).get("value") or "")
    area = system.get("area") or {}
    area_text = ""
    if isinstance(area, dict) and area.get("type"):
        kind = AREA.get(area["type"])
        if not kind:
            raise SystemExit(f"область {area}")
        area_text = f"{kind} {area.get('value')} футов"
    defense = system.get("defense") or {}
    save = (defense.get("save") or {}) if isinstance(defense, dict) else {}
    save_text = ""
    if save.get("statistic"):
        stat = SAVE[save["statistic"]]
        save_text = f"базовый спасбросок {stat}" if save.get("basic") else f"спасбросок {stat}"
    duration = system.get("duration") or {}
    duration_text = DURATION[duration.get("value") or ""]
    if duration.get("sustained") and "поддерж" not in duration_text:
        duration_text += ", можно поддерживать"
    damage = format_damage(system.get("damage"))
    height = system.get("heightening") or {}
    height_text = ""
    if height.get("type") == "interval":
        extra = format_damage(height.get("damage"))
        interval = height.get("interval") or 1
        if extra:
            height_text = f"На каждом +{interval} круге прибавляется {extra}."
    elif height.get("type") == "fixed":
        bits = []
        levels = height.get("levels") or {}
        for key in sorted(levels, key=lambda item: int(item)):
            extra = format_damage((levels[key] or {}).get("damage"))
            if extra:
                bits.append(f"круг {key}: {extra}")
        if bits:
            height_text = "Усиление на отдельных кругах: " + "; ".join(bits) + "."
        else:
            height_text = "На отдельных кругах меняются цель или дистанция. Английские строки цели в карточку не копировались."
    rank_label = "Заговор" if cantrip else f"Круг {level}"
    if cantrip:
        rank_label += f". В книге ремастера записан на {level}-м круге и повышается"
    bits = [f"{rank_label}."]
    if traditions:
        bits.append("Традиции: " + ", ".join(traditions) + ".")
    if mechanic:
        bits.append("Черты: " + ", ".join(mechanic) + ".")
    if classes:
        bits.append("Черта указывает классы: " + ", ".join(classes) + ".")
    bits.append(f"Сотворение: {time}.")
    if distance:
        bits.append(f"Дистанция: {distance}.")
    if area_text:
        bits.append(f"Область: {area_text}.")
    if save_text:
        bits.append(save_text.capitalize() + ".")
    bits.append(f"Длительность: {duration_text}.")
    if damage:
        bits.append(f"Кости в шапке: {damage}.")
    if height_text:
        bits.append(height_text)
    bits.append("Абзац книги не копировался. Лист эти кости сам не кидает.")
    text = " ".join(bits)
    short = f"{'Заговор' if cantrip else f'{level} круг'}"
    if damage:
        short += f", {damage}"
    elif save_text:
        short += f", {save_text}"
    else:
        short += f", {time}"
    rarity = (system["traits"].get("rarity") or "common")
    if rarity == "uncommon":
        text = "Необычное. " + text
    elif rarity == "rare":
        text = "Редкое. " + text
    return {
        "id": data["_file"],
        "name": name,
        "originalName": name_en,
        "altNames": [],
        "category": "spell",
        "categoryTitle": "Заклинание",
        "rank": level,
        "short": short,
        "text": text,
        "sourceId": source_id,
        "prereq": "",
        "location": f"{book}, заклинание {level} круга",
        "link": LINK,
        "status": "verified-reference",
        "checkedOn": CHECKED,
        "sourceVersion": version,
    }


def class_card(data: dict) -> dict | None:
    slug = data["_file"]
    if slug not in CLASS_RU:
        return None
    system = data["system"]
    source_id, book, version = BOOKS[system["publication"]["title"]]
    key = ", ".join(ABILITY[item] for item in system["keyAbility"]["value"])
    saves = system["savingThrows"]
    attacks = system["attacks"]
    defenses = system["defenses"]
    other = attacks.get("other") or {}
    other_name = "алхимические бомбы" if other.get("name") == "Alchemical Bombs" else ""
    lines = [
        f"{system['hp']} хитов за уровень + Телосложение.",
        f"Ключевая характеристика: {key}.",
        f"Восприятие: {RANK_NAME[system['perception']]}.",
        f"Стойкость: {RANK_NAME[saves['fortitude']]}. Рефлексы: {RANK_NAME[saves['reflex']]}. Воля: {RANK_NAME[saves['will']]}.",
        f"Простое оружие: {RANK_NAME[attacks['simple']]}. Воинское: {RANK_NAME[attacks['martial']]}. Безоружные: {RANK_NAME[attacks['unarmed']]}. Продвинутое: {RANK_NAME[attacks['advanced']]}.",
    ]
    if other_name and other.get("rank"):
        lines.append(f"{other_name.capitalize()}: {RANK_NAME[other['rank']]}.")
    lines.append(
        f"Без доспеха: {RANK_NAME[defenses['unarmored']]}. Лёгкий: {RANK_NAME[defenses['light']]}. Средний: {RANK_NAME[defenses['medium']]}. Тяжёлый: {RANK_NAME[defenses['heavy']]}."
    )
    skills = system.get("trainedSkills") or {}
    trained = [SKILL[item] for item in skills.get("value") or []]
    skill_line = f"Дополнительных навыков: {skills.get('additional', 0)}."
    if trained:
        skill_line += " Уже обучен: " + ", ".join(trained) + "."
    lines.append(skill_line)
    if system.get("spellcasting"):
        lines.append("Класс связан с заклинаниями. Число ячеек и традиция в эту карточку не переносились: в данных класса их нет отдельным числом.")
    lines.append("Конструктор этот класс не предлагает. Автопрогрессия до 20 уровня по-прежнему только у воина ядра игрока.")
    text = " ".join(lines)
    return {
        "id": slug,
        "name": CLASS_RU[slug],
        "originalName": data["name"],
        "altNames": [],
        "category": "class",
        "categoryTitle": "Класс",
        "rank": None,
        "short": f"{system['hp']} хитов · {key}",
        "text": text,
        "sourceId": source_id,
        "prereq": "",
        "location": f"{book}, класс",
        "link": LINK,
        "status": "verified-reference",
        "checkedOn": CHECKED,
        "sourceVersion": version,
    }


def ancestry_card(data: dict) -> dict | None:
    slug = data["_file"]
    if slug not in ANCESTRY_RU:
        return None
    system = data["system"]
    source_id, book, version = BOOKS[system["publication"]["title"]]
    size = {"med": "средний", "sm": "малый", "tiny": "крошечный", "lg": "крупный"}.get(system.get("size"), "")
    if not size:
        raise SystemExit(f"размер {system.get('size')} у {slug}")
    vision = {
        "low-light-vision": "сумеречное зрение",
        "darkvision": "тёмное зрение",
        "normal": "обычное зрение",
    }.get(system.get("vision"), "")
    if not vision:
        raise SystemExit(f"зрение {system.get('vision')} у {slug}")
    boosts = system.get("boosts") or {}
    flaws = system.get("flaws") or {}

    def ability_list(block: dict) -> list[str]:
        found = []
        for item in block.values():
            values = item.get("value") or []
            if len(values) >= 6:
                found.append("одно свободное")
            else:
                found.extend(ABILITY[value] for value in values)
        return found

    boost_text = ", ".join(ability_list(boosts)) or "не указаны"
    flaw_values = ability_list(flaws)
    flaw_text = ", ".join(flaw_values) if flaw_values else "нет"
    rarity = (system.get("traits") or {}).get("rarity") or "common"
    rarity_text = {"common": "обычный", "uncommon": "необычный", "rare": "редкий"}[rarity]
    text = (
        f"{system['hp']} хитов от народа. Размер {size}. Скорость {system['speed']} футов. {vision.capitalize()}. "
        f"Повышения: {boost_text}. Изъян: {flaw_text}. Редкость: {rarity_text}. "
        "Наследия этого народа в карточки не разложены. Конструктор по-прежнему предлагает восемь народов ядра игрока, не этот. Лист эти хиты сам не подставляет."
    )
    return {
        "id": slug,
        "name": ANCESTRY_RU[slug],
        "originalName": data["name"],
        "altNames": [],
        "category": "ancestry",
        "categoryTitle": "Народ",
        "rank": None,
        "short": f"{system['hp']} хитов, скорость {system['speed']}, {vision}",
        "text": text,
        "sourceId": source_id,
        "prereq": "",
        "location": f"{book}, народ",
        "link": LINK,
        "status": "verified-reference",
        "checkedOn": CHECKED,
        "sourceVersion": version,
    }


def condition_card(data: dict) -> dict | None:
    slug = data["_file"]
    if slug not in CONDITIONS:
        return None
    system = data["system"]
    source_id, book, version = BOOKS[system["publication"]["title"]]
    name, text = CONDITIONS[slug]
    text += " Лист это состояние к числам не прибавляет."
    valued = (system.get("value") or {}).get("isValued")
    if valued:
        text = "Со значением. " + text
    return {
        "id": slug,
        "name": name,
        "originalName": data["name"],
        "altNames": [],
        "category": "condition",
        "categoryTitle": "Состояние",
        "rank": None,
        "short": text.split(".")[0] + ".",
        "text": text,
        "sourceId": source_id,
        "prereq": "",
        "location": f"{book}, состояние",
        "link": LINK,
        "status": "verified-reference",
        "checkedOn": CHECKED,
        "sourceVersion": version,
    }


def main() -> None:
    spell_skip = block_ids("export const SPELLS", "export const ITEMS")
    class_skip = block_ids("export const CLASSES", "export const CONDITIONS")
    ancestry_skip = block_ids("export const ANCESTRIES", "export const CLASSES")
    condition_skip = block_ids("export const CONDITIONS", "export const SPELLS")
    rows: list[dict] = []
    seen: set[str] = set()
    for data in load_docs("spells"):
        if data["_file"] in spell_skip:
            continue
        card = spell_card(data)
        key = (card["sourceId"], card["category"], card["id"])
        if key in seen:
            raise SystemExit(f"повтор {key}")
        seen.add(key)
        rows.append(card)
    for data in load_docs("classes"):
        if data["_file"] in class_skip:
            continue
        card = class_card(data)
        if card:
            rows.append(card)
    for data in load_docs("ancestries"):
        if data["_file"] in ancestry_skip:
            continue
        card = ancestry_card(data)
        if card:
            rows.append(card)
    for data in load_docs("conditions"):
        if data["_file"] in condition_skip or data["_file"] == "off-guard":
            continue
        card = condition_card(data)
        if card:
            rows.append(card)
    rows.sort(key=lambda item: (item["sourceId"], item["category"], item["id"]))
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")
    from collections import Counter

    counts = Counter((item["sourceId"], item["category"]) for item in rows)
    print("entries", len(rows))
    for key, value in sorted(counts.items()):
        print(f"  {key[0]} {key[1]} {value}")


if __name__ == "__main__":
    main()
