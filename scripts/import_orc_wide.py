#!/usr/bin/env python3
"""Добирает народы, классы и карточки ORC, которых не было в трёх книгах ядра.

Абзац description не читается. В ремастер попадает только license ORC и remaster true.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import import_pf_lists as pf

ROOT = Path(__file__).resolve().parents[1]
PACK = Path("/tmp/pf2e/packs/pf2e")
OUT = ROOT / "src/data/generated"
ART = ROOT / "public/art/portraits"
CHECKED = "2026-10-17"

ANCESTRY_RU = {
    "automaton": "Автоматон",
    "athamaru": "Атамару",
    "wayang": "Ваянг",
    "gnome": "Гном",
    "goblin": "Гоблин",
    "dwarf": "Дварф",
    "dragonet": "Дракончик",
    "jotunborn": "Йотунорождённый",
    "centaur": "Кентавр",
    "kobold": "Кобольд",
    "catfolk": "Котолюд",
    "ratfolk": "Крысолюд",
    "leshy": "Леший",
    "lizardfolk": "Людоящер",
    "merfolk": "Мерфолк",
    "minotaur": "Минотавр",
    "orc": "Орк",
    "halfling": "Полурослик",
    "awakened-animal": "Пробуждённое животное",
    "samsaran": "Самсаран",
    "sarangay": "Сарангай",
    "surki": "Сурки",
    "tanuki": "Тануки",
    "tripkee": "Трипки",
    "tengu": "Тэнгу",
    "hobgoblin": "Хобгоблин",
    "kholo": "Холо",
    "human": "Человек",
    "elf": "Эльф",
    "yaksha": "Якша",
    "yaoguai": "Яогуай",
    "bugbear": "Багбир",
    "fetchling": "Фетчлинг",
    "strix": "Стрикс",
}
CLASS_RU = {
    "alchemist": "Алхимик",
    "animist": "Анимист",
    "bard": "Бард",
    "barbarian": "Варвар",
    "witch": "Ведьма",
    "fighter": "Воин",
    "wizard": "Волшебник",
    "druid": "Друид",
    "cleric": "Жрец",
    "guardian": "Защитник",
    "inventor": "Изобретатель",
    "commander": "Командор",
    "monk": "Монах",
    "necromancer": "Некромант",
    "oracle": "Оракул",
    "summoner": "Призыватель",
    "runesmith": "Рунотворец",
    "investigator": "Следователь",
    "ranger": "Следопыт",
    "swashbuckler": "Сорвиголова",
    "gunslinger": "Стрелок",
    "thaumaturge": "Тауматург",
    "sorcerer": "Чародей",
    "exemplar": "Экземплар",
    "psychic": "Экстрасенс",
    "magus": "Колдун",
    "champion": "Поборник",
    "rogue": "Плут",
}
ABILITY = {
    "strength": "str",
    "dexterity": "dex",
    "constitution": "con",
    "intelligence": "int",
    "wisdom": "wis",
    "charisma": "cha",
    "str": "str",
    "dex": "dex",
    "con": "con",
    "int": "int",
    "wis": "wis",
    "cha": "cha",
}
ABILITY_RU = {
    "str": "Сила",
    "dex": "Ловкость",
    "con": "Телосложение",
    "int": "Интеллект",
    "wis": "Мудрость",
    "cha": "Харизма",
}
SIZE_RU = {"tiny": "Крошечный", "sm": "Малый", "med": "Средний", "lg": "Крупный", "huge": "Огромный", "grg": "Исполинский"}
VISION_RU = {
    "low-light-vision": "Сумеречное зрение",
    "darkvision": "Тёмное зрение",
    "greater-darkvision": "Тёмное зрение дальше обычного",
    "normal": "Обычное зрение",
}
RANK = {0: "untrained", 1: "trained", 2: "expert", 3: "master", 4: "legendary"}
RANK_RU = {"untrained": "не обучен", "trained": "обучен", "expert": "эксперт", "master": "мастер", "legendary": "легенда"}
TRADITION = {"arcane": "арканная", "divine": "божественная", "occult": "оккультная", "primal": "первозданная"}
ALL_ABILITIES = {"str", "dex", "con", "int", "wis", "cha"}

pf.CLASSES.update({key: value.lower() for key, value in CLASS_RU.items()})
pf.ANCESTRIES.update({key: value.lower() for key, value in ANCESTRY_RU.items()})


def scrub(text: str) -> str:
    return pf.LATIN.sub(lambda match: pf.translit(match.group(0)), text)


def safe_card(*args, **kwargs):
    entry_id, name, original, category, title, rank, short, text, source_id, prereq, location, link, version = args
    name = scrub(name) or "Запись"
    short = scrub(short)
    text = scrub(text)
    prereq = scrub(prereq)
    return pf.card(entry_id, name, original, category, title, rank, short, text, source_id, prereq, location, link, version)


def known_ids() -> set[str]:
    found = set()
    for name in ("pf-lists.json", "pf-core.json", "pf-legacy.json"):
        path = OUT / name
        if not path.exists():
            continue
        for row in json.loads(path.read_text()):
            found.add(row["id"])
    return found


def orc_remaster(system: dict) -> bool:
    pub = pf.publication(system)
    return pub.get("license") == "ORC" and pub.get("remaster") is True


def boost_parts(block) -> tuple[list[str], int]:
    fixed: list[str] = []
    free = 0
    if not isinstance(block, dict):
        return fixed, free
    keys = sorted(block, key=lambda item: int(item) if str(item).isdigit() else 99)
    for key in keys:
        slot = block.get(key)
        values = slot.get("value") if isinstance(slot, dict) else []
        if not isinstance(values, list) or not values:
            continue
        mapped = [ABILITY.get(item, item) for item in values if isinstance(item, str)]
        if len(mapped) >= 6 or set(mapped) >= ALL_ABILITIES:
            free += 1
        elif len(mapped) == 1 and mapped[0] in ALL_ABILITIES:
            fixed.append(mapped[0])
        else:
            free += 1
    return fixed, free


def size_text(data_system: dict) -> str:
    size = SIZE_RU.get(str(data_system.get("size")), "Средний")
    for rule in data_system.get("rules") or []:
        if isinstance(rule, dict) and rule.get("key") == "ChoiceSet" and rule.get("flag") == "size":
            return "На выбор"
    return size


def heritage_rows(slug: str) -> list[dict]:
    folder = PACK / "heritages" / slug
    rows = []
    if not folder.is_dir():
        return rows
    for path in sorted(folder.glob("*.json")):
        data = pf.load(path)
        if not data:
            continue
        system = data.get("system") or {}
        if not orc_remaster(system):
            continue
        bits = pf.rule_bits(system.get("rules"))
        effect = "Из полей: " + "; ".join(bits) + "." if bits else "В полях наследия нет отдельного числа."
        original = str(data.get("name") or path.stem)
        rows.append({
            "id": path.stem,
            "name": scrub(pf.ru_name(original)),
            "info": f"Наследие народа. {effect} Лист сам это к хитам и скорости не прибавляет.",
        })
    return rows


def ancestry_row(path: Path) -> dict | None:
    data = pf.load(path)
    if not data:
        return None
    system = data.get("system") or {}
    if not orc_remaster(system):
        return None
    slug = path.stem
    name = ANCESTRY_RU.get(slug, scrub(pf.ru_name(str(data.get("name") or slug))))
    boosts, free_boost = boost_parts(system.get("boosts"))
    flaws, _free_flaw = boost_parts(system.get("flaws"))
    flaw = flaws[0] if flaws else None
    if not boosts and free_boost < 2:
        free_boost = 2
    hp = int(system.get("hp") or 8)
    speed = int(system.get("speed") or 25)
    size = size_text(system)
    senses = VISION_RU.get(str(system.get("vision")), "Обычное зрение")
    boost_ru = ", ".join(ABILITY_RU[item] for item in boosts) if boosts else "два свободных"
    flaw_ru = ABILITY_RU[flaw] if flaw else "нет"
    info = (
        f"{name}. {hp} хитов, размер {size.lower()}, скорость {speed} футов. {senses}. "
        f"Повышения: {boost_ru}. Свободных повышений: {free_boost}. Изъян: {flaw_ru}. "
        "Числа сняты с полей. Абзац книги не копировался."
    )
    return {
        "id": slug,
        "name": name,
        "hint": f"{hp} хитов, скорость {speed}",
        "hp": hp,
        "size": size,
        "speed": speed,
        "senses": senses,
        "languages": "Всеобщий и дополнительные языки по Интеллекту. Имена языков сеттинга в карточку не переносятся.",
        "boosts": boosts,
        "flaw": flaw,
        "freeBoosts": free_boost,
        "info": info,
        "short": f"{hp} хитов. {senses}.",
        "heritages": heritage_rows(slug),
        "feats": [],
    }


def class_row(path: Path) -> dict | None:
    data = pf.load(path)
    if not data:
        return None
    system = data.get("system") or {}
    if not orc_remaster(system):
        return None
    slug = path.stem
    name = CLASS_RU.get(slug, scrub(pf.ru_name(str(data.get("name") or slug))))
    keys = [ABILITY[item] for item in (system.get("keyAbility") or {}).get("value") or [] if item in ABILITY]
    if not keys:
        keys = ["str", "dex", "con", "int", "wis", "cha"]
        key_note = "Поле ключа пустое, поэтому ключ выбирается из всех характеристик."
    else:
        key_note = "Ключ: " + ", ".join(ABILITY_RU[item] for item in keys) + "."
    hp = int(system.get("hp") or 8)
    saves = system.get("savingThrows") or {}
    attacks = system.get("attacks") or {}
    defenses = system.get("defenses") or {}
    trained = system.get("trainedSkills") or {}
    skills = [item for item in trained.get("value") or [] if item in pf.SKILL]
    extra = int(trained.get("additional") or 0)
    class_levels = [int(item) for item in (system.get("classFeatLevels") or {}).get("value") or [] if isinstance(item, int)]
    skill_levels = [int(item) for item in (system.get("skillFeatLevels") or {}).get("value") or [] if isinstance(item, int)]
    casts = bool(system.get("spellcasting"))
    attack_map = {
        "simple": RANK.get(int(attacks.get("simple") or 0), "untrained"),
        "martial": RANK.get(int(attacks.get("martial") or 0), "untrained"),
        "unarmed": RANK.get(int(attacks.get("unarmed") or 0), "untrained"),
        "advanced": RANK.get(int(attacks.get("advanced") or 0), "untrained"),
    }
    armor_map = {
        "unarmored": RANK.get(int(defenses.get("unarmored") or 0), "untrained"),
        "light": RANK.get(int(defenses.get("light") or 0), "untrained"),
        "medium": RANK.get(int(defenses.get("medium") or 0), "untrained"),
        "heavy": RANK.get(int(defenses.get("heavy") or 0), "untrained"),
    }
    skill_ru = ", ".join(pf.SKILL[item] for item in skills) if skills else "фиксированного навыка в поле нет"
    info = (
        f"{name}. {hp} хитов. {key_note} Восприятие: {RANK_RU[RANK.get(int(system.get('perception') or 0), 'untrained')]}. "
        f"Стойкость {RANK_RU[RANK.get(int(saves.get('fortitude') or 0), 'untrained')]}, "
        f"рефлексы {RANK_RU[RANK.get(int(saves.get('reflex') or 0), 'untrained')]}, "
        f"воля {RANK_RU[RANK.get(int(saves.get('will') or 0), 'untrained')]}. "
        f"Навыки: {skill_ru}, и ещё {extra}. "
        f"Черты класса на уровнях {', '.join(str(item) for item in class_levels) or 'не указаны'}. "
        f"{'В поле есть признак заклинателя. Таблица ячеек из абзаца не снималась.' if casts else 'Признака заклинателя в поле нет.'} "
        "Числа сняты с полей. Абзац книги не копировался."
    )
    tradition = "arcane"
    for skill, trad in (("arcana", "arcane"), ("religion", "divine"), ("occultism", "occult"), ("nature", "primal")):
        if skill in skills:
            tradition = trad
            break
    row = {
        "id": slug,
        "name": name,
        "hint": f"{hp} хитов",
        "hp": hp,
        "key": keys,
        "perception": RANK.get(int(system.get("perception") or 0), "untrained"),
        "fort": RANK.get(int(saves.get("fortitude") or 0), "untrained"),
        "ref": RANK.get(int(saves.get("reflex") or 0), "untrained"),
        "will": RANK.get(int(saves.get("will") or 0), "untrained"),
        "skillsFixed": skills,
        "extraSkills": extra,
        "attacks": attack_map,
        "armor": armor_map,
        "classDc": "trained" if casts else "untrained",
        "spellRank": "trained" if casts else "untrained",
        "featLevel1": 1 in class_levels,
        "classFeatLevels": class_levels,
        "skillFeatLevels": skill_levels,
        "features": [{"name": "Поля класса", "info": info, "short": f"{hp} хитов"}],
        "choices": [],
        "feats": [],
        "kit": [],
        "info": info,
        "short": f"{hp} хитов. {key_note}",
    }
    if casts:
        row["spell"] = {"tradition": tradition, "cantrips": 0, "slots": 2, "prepared": True}
    return row


def excluded_rows() -> list[dict]:
    rows = []
    for folder, label in (("ancestries", "народ"), ("classes", "класс")):
        for path in sorted((PACK / folder).glob("*.json")):
            data = pf.load(path)
            if not data:
                continue
            system = data.get("system") or {}
            pub = pf.publication(system)
            if pub.get("license") == "ORC" and pub.get("remaster") is True:
                continue
            rows.append({
                "id": path.stem,
                "kind": label,
                "name": str(data.get("name") or path.stem),
                "license": pub.get("license") or "",
                "remaster": bool(pub.get("remaster")),
                "title": pub.get("title") or "",
            })
    folder = PACK / "heritages" / "versatile-heritages"
    for path in sorted(folder.glob("*.json")):
        data = pf.load(path)
        if not data:
            continue
        system = data.get("system") or {}
        pub = pf.publication(system)
        if pub.get("license") == "ORC" and pub.get("remaster") is True:
            continue
        rows.append({
            "id": path.stem,
            "kind": "универсальное наследие",
            "name": str(data.get("name") or path.stem),
            "license": pub.get("license") or "",
            "remaster": bool(pub.get("remaster")),
            "title": pub.get("title") or "",
        })
    return rows


def companion_rows() -> list[dict]:
    rows = []
    seen = set()
    for path, data, system in pf.walk("class-features"):
        if not orc_remaster(system):
            continue
        stem = path.stem
        low = stem.lower()
        kind = ""
        if "animal-companion" in low or low == "animal-companion":
            kind = "companion"
        elif "familiar" in low:
            kind = "familiar"
        elif "eidolon" in low:
            kind = "follower"
        elif "follower" in low or "retainer" in low:
            kind = "follower"
        if not kind or stem in seen:
            continue
        seen.add(stem)
        original = str(data.get("name") or stem)
        title = {"companion": "Звериный спутник", "familiar": "Фамильяр", "follower": "Спутник"}[kind]
        bits = pf.rule_bits(system.get("rules"))
        effect = "Из полей: " + "; ".join(bits) + "." if bits else "Отдельного числа в полях нет."
        rows.append({
            "id": stem,
            "name": scrub(pf.ru_name(original)),
            "kind": kind,
            "title": title,
            "info": f"{title}. {effect} Абзац книги не копировался. Блок существа в расчёт не подставлен.",
        })
    for path, data, system in pf.walk("feats"):
        if not orc_remaster(system):
            continue
        stem = path.stem
        if stem in seen:
            continue
        low = stem.lower()
        if low in ("animal-companion",) or low.startswith("mature-animal-companion") or "familiar" == low or low.endswith("-familiar"):
            kind = "companion" if "companion" in low else "familiar"
        else:
            continue
        seen.add(stem)
        original = str(data.get("name") or stem)
        title = "Звериный спутник" if kind == "companion" else "Фамильяр"
        rows.append({
            "id": stem,
            "name": scrub(pf.ru_name(original)),
            "kind": kind,
            "title": title,
            "info": f"{title}. Черта есть в полях. Породы отдельным пакетом в этой выгрузке не лежат, поэтому список животных не выдуман.",
        })
    return rows


def calling_rows() -> list[dict]:
    rows = []
    folder = PACK / "class-features" / "mythic-callings"
    if not folder.is_dir():
        return rows
    for path in sorted(folder.rglob("*.json")):
        data = pf.load(path)
        if not data:
            continue
        system = data.get("system") or {}
        if not orc_remaster(system):
            continue
        original = str(data.get("name") or path.stem)
        bits = pf.rule_bits(system.get("rules"))
        effect = "Из полей: " + "; ".join(bits) + "." if bits else "Отдельного числа в полях нет."
        rows.append({
            "id": path.stem,
            "name": scrub(pf.ru_name(original)),
            "info": f"Мифическое призвание. {effect} Наказы и запреты из абзаца книги не переписывались.",
        })
    return rows


def wide_cards(seen: set[str]) -> tuple[list[dict], list[dict]]:
    cards = []
    index = []

    def add_feat(path: Path, data: dict, system: dict):
        category = system.get("category")
        if category not in ("ancestry", "class", "skill", "general"):
            return
        level = pf.level_of(system)
        if level is None or level < 1 or level > 20:
            return
        slug = path.stem
        if slug in seen:
            return
        seen.add(slug)
        traits, rarity = pf.traits_of(system)
        archetype = "archetype" in path.parts or "dedication" in traits or "mythic" in path.parts
        kind = "archetype" if archetype and "mythic" not in path.parts else ("mythic" if "mythic" in path.parts else category)
        classes = [trait for trait in traits if trait in pf.CLASSES]
        ancestries = [trait for trait in traits if trait in pf.ANCESTRIES]
        original = str(data.get("name") or slug)
        name = scrub(pf.ru_name(original))
        title = {"ancestry": "Черта народа", "class": "Черта класса", "skill": "Черта навыка", "general": "Общая черта", "archetype": "Архетип", "mythic": "Мифическая черта"}[kind]
        prereq = pf.prereq_text(system)
        bits = [f"{title}, уровень {level}.", f"Действие: {pf.action_text(system)}."]
        if traits:
            bits.append(f"Черты: {pf.trait_ru(traits)}.")
        if prereq:
            bits.append(f"Требование: {prereq}.")
        rules = pf.rule_bits(system.get("rules"))
        if rules:
            bits.append("Из полей правил: " + "; ".join(rules) + ".")
        bits.append("Остальной эффект в поля числа не вынесен, лист его не применяет.")
        bits.append(pf.LETTER)
        cards.append(safe_card(
            slug, name, original, "archetype" if kind == "archetype" else ("mythic-feat" if kind == "mythic" else f"{category}-feat"),
            title, level, f"Уровень {level}. {pf.action_text(system)}.", " ".join(bits),
            "pf-orc-more", prereq, "книга ORC", pf.ORC, "ORC",
        ))
        index.append({"id": slug, "name": name, "kind": kind if kind in ("ancestry", "class", "skill", "general", "archetype", "mythic") else category, "level": level, "classes": classes, "ancestries": ancestries})

    for path, data, system in pf.walk("feats"):
        if orc_remaster(system):
            add_feat(path, data, system)

    for path, data, system in pf.walk("equipment"):
        if not orc_remaster(system):
            continue
        slug = path.stem
        if slug in seen:
            continue
        seen.add(slug)
        traits, rarity = pf.traits_of(system)
        category, title = pf.gear_kind(data, system, traits)
        original = str(data.get("name") or slug)
        name = scrub(pf.ru_name(original))
        level = pf.level_of(system)
        bits = [f"{title}.", f"Цена: {pf.price_text(system)}.", f"Объём: {pf.bulk_text(system)}."]
        if level is not None:
            bits.append(f"Уровень {level}.")
        if traits:
            bits.append(f"Черты: {pf.trait_ru(traits)}.")
        rules = pf.rule_bits(system.get("rules"))
        if rules:
            bits.append("Из полей правил: " + "; ".join(rules) + ".")
        bits.append("В атаку и класс брони карточка сама не входит, пока предмет не записан на листе с числом.")
        bits.append(pf.LETTER)
        cards.append(safe_card(
            slug, name, original, category, title, level if isinstance(level, int) else None,
            f"{title}.", " ".join(bits), "pf-orc-more", "", "книга ORC", pf.ORC, "ORC",
        ))

    for path, data, system in pf.walk("spells"):
        if not orc_remaster(system):
            continue
        slug = path.stem
        if slug in seen:
            continue
        seen.add(slug)
        original = str(data.get("name") or slug)
        name = scrub(pf.ru_name(original))
        level = pf.level_of(system) or 0
        traits, _rarity = pf.traits_of(system)
        traditions = []
        raw_traits = system.get("traits") if isinstance(system.get("traits"), dict) else {}
        for item in raw_traits.get("traditions") or []:
            if item in TRADITION:
                traditions.append(TRADITION[item])
        ritual = "rituals" in path.parts
        category = "ritual" if ritual else "spell"
        title = "Ритуал" if ritual else "Заклинание"
        bits = [f"{title}, круг {level}."]
        if traditions:
            bits.append("Традиции: " + ", ".join(traditions) + ".")
        if traits:
            bits.append(f"Черты: {pf.trait_ru(traits)}.")
        bits.append("Абзац книги не копировался. Лист кости сам не кидает.")
        cards.append(safe_card(
            slug, name, original, category, title, level, f"Круг {level}.", " ".join(bits),
            "pf-orc-more", "", "книга ORC", pf.ORC, "ORC",
        ))

    for path, data, system in pf.walk("heritages"):
        if not orc_remaster(system):
            continue
        if path.parent.name == "versatile-heritages":
            continue
        ancestry = system.get("ancestry") if isinstance(system.get("ancestry"), dict) else {}
        slug_a = ancestry.get("slug") or "heritage"
        entry_id = f"{slug_a}:{path.stem}"
        if entry_id in seen or path.stem in seen:
            continue
        seen.add(entry_id)
        original = str(data.get("name") or path.stem)
        name = scrub(pf.ru_name(original))
        bits = pf.rule_bits(system.get("rules"))
        effect = "Из полей: " + "; ".join(bits) + "." if bits else "В полях наследия нет отдельного числа."
        text = f"Наследие народа. {effect} Лист сам это число не прибавляет. {pf.LETTER}"
        cards.append(safe_card(entry_id, name, original, "heritage", "Наследие", None, effect, text, "pf-orc-more", "", "книга ORC", pf.ORC, "ORC"))
    return cards, index


def palette(slug: str) -> tuple[str, str, str]:
    hues = [
        ("#24303c", "#e7c27a", "#8fd0c6"),
        ("#2a2438", "#d98b6a", "#f2e2c4"),
        ("#1d3330", "#7dcea0", "#f6e7c1"),
        ("#3a2a22", "#e0b07a", "#f4d7c4"),
        ("#243044", "#9bb7e0", "#f3e6cf"),
        ("#332818", "#c9843a", "#efe2c0"),
        ("#1e2c28", "#6fbfb0", "#f7edd4"),
        ("#3a2430", "#e09ab2", "#f6e4d4"),
    ]
    return hues[sum(ord(ch) for ch in slug) % len(hues)]


def portrait_svg(slug: str, title: str) -> str:
    ink, gold, skin = palette(slug)
    ears = "dragonet" in slug or slug in ("kobold", "lizardfolk", "dragonet")
    horns = slug in ("minotaur", "sarangay", "centaur", "jotunborn")
    long_ears = slug in ("elf", "goblin", "gnome", "leshy", "sprite", "wayang")
    snout = slug in ("kholo", "catfolk", "ratfolk", "tengu", "awakened-animal", "yaoguai")
    mark = ""
    if horns:
        mark = f'<path d="M58 78 Q48 36 70 58 M122 78 Q132 36 110 58" fill="none" stroke="{gold}" stroke-width="6" stroke-linecap="round"/>'
    elif long_ears:
        mark = f'<path d="M52 96 Q28 70 48 48 M128 96 Q152 70 132 48" fill="{skin}" stroke="{ink}" stroke-width="3"/>'
    elif snout:
        mark = f'<ellipse cx="90" cy="118" rx="16" ry="10" fill="{gold}"/>'
    elif ears:
        mark = f'<path d="M48 100 L34 46 L70 78 M132 100 L146 46 L110 78" fill="{gold}"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 240" role="img" aria-label="{title}">
<title>{title}</title>
<!-- Свой геометрический портрет. Не официальная иллюстрация. -->
<rect width="180" height="240" rx="28" fill="{ink}"/>
<ellipse cx="90" cy="196" rx="62" ry="36" fill="{gold}" opacity="0.9"/>
<circle cx="90" cy="104" r="48" fill="{skin}"/>
<circle cx="74" cy="98" r="4" fill="{ink}"/>
<circle cx="106" cy="98" r="4" fill="{ink}"/>
<path d="M78 122 Q90 132 102 122" fill="none" stroke="{ink}" stroke-width="3" stroke-linecap="round"/>
{mark}
</svg>
'''


def main():
    ancestries = []
    for path in sorted((PACK / "ancestries").glob("*.json")):
        row = ancestry_row(path)
        if row:
            ancestries.append(row)
    classes = []
    for path in sorted((PACK / "classes").glob("*.json")):
        row = class_row(path)
        if row:
            classes.append(row)
    companions = companion_rows()
    callings = calling_rows()
    roster = {
        "ancestries": ancestries,
        "classes": classes,
        "companions": companions,
        "callings": callings,
        "excluded": excluded_rows(),
    }
    seen = known_ids()
    cards, index = wide_cards(seen)
    for row in companions + callings:
        if row["id"] in seen:
            continue
        kind = row.get("kind") or "calling"
        title = row.get("title") or "Мифическое призвание"
        category = kind if kind in ("companion", "familiar", "follower") else "calling"
        cards.append(safe_card(
            row["id"], row["name"], row["name"], category, title, 1, title, row["info"],
            "pf-orc-more", "", "книга ORC", pf.ORC, "ORC",
        ))
    ART.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for row in ancestries:
        # Illustrated portraits (own generated art) win; the SVG placeholder is only a fallback.
        if (ART / f"{row['id']}.webp").exists():
            manifest[row["id"]] = f"portraits/{row['id']}.webp"
            continue
        file_name = f"{row['id']}.svg"
        (ART / file_name).write_text(portrait_svg(row["id"], row["name"]), encoding="utf-8")
        manifest[row["id"]] = f"portraits/{file_name}"
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "pf-roster.json").write_text(json.dumps(roster, ensure_ascii=False) + "\n")
    (OUT / "pf-wide.json").write_text(json.dumps(cards, ensure_ascii=False) + "\n")
    (OUT / "pf-feat-wide.json").write_text(json.dumps(index, ensure_ascii=False) + "\n")
    for extra in sorted(ART.glob("*.webp")):
        manifest.setdefault(extra.stem, f"portraits/{extra.name}")
    manifest = dict(sorted(manifest.items()))
    (OUT / "portraits.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n")
    from collections import Counter
    print("ancestries", len(ancestries), "classes", len(classes), "companions", len(companions), "callings", len(callings))
    print("wide", len(cards), "index", len(index), Counter(item["category"] for item in cards))
    print("excluded", len(roster["excluded"]))
    print("portraits", len(manifest))


if __name__ == "__main__":
    main()
