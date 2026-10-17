#!/usr/bin/env python3
"""Карточки черт, заклинаний, фокусов, ритуалов и посвящений из полей Foundry.

Абзац description не сохраняется. Итог — свои короткие фразы по числам и меткам.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import ru_glossary as ru

ROOT = Path(__file__).resolve().parents[1]
PACK = Path("/tmp/pf2e/packs/pf2e")
OUT = ROOT / "src/data/generated"

BOOKS = {
    "Pathfinder Player Core": "Ядро игрока",
    "Pathfinder Player Core 2": "Ядро игрока 2",
    "Pathfinder GM Core": "Ядро ведущего",
    "Pathfinder Impossible Magic": "Невозможная магия",
    "Pathfinder War of Immortals": "Война бессмертных",
    "Pathfinder Howl of the Wild": "Вой дикой природы",
    "Pathfinder Dark Archive (Remastered)": "Тёмный архив",
    "Pathfinder Lost Omens Tian Xia Character Guide": "Тянь-Ся",
    "Pathfinder Battlecry!": "Боевой клич",
    "Pathfinder Guns & Gears": "Пушки и шестерни",
    "Pathfinder Lost Omens Divine Mysteries": "Божественные тайны",
    "Pathfinder Lost Omens Hellfire Dispatches": "Адские сводки",
    "Pathfinder Lost Omens Cheliax, Infernal Inheritance": "Челиакс",
    "Pathfinder Lost Omens Rival Academies": "Соперничающие академии",
    "Pathfinder Lost Omens Shining Kingdoms": "Сияющие королевства",
    "Pathfinder Lost Omens Draconic Codex": "Драконий кодекс",
    "Pathfinder Lost Omens High Seas": "Открытое море",
    "Pathfinder Treasure Vault (Remastered)": "Сокровищница",
    "Pathfinder NPC Core": "Ядро персонажей ведущего",
    "Pathfinder Monster Core": "Ядро чудовищ",
    "Pathfinder Monster Core 2": "Ядро чудовищ 2",
    "Pathfinder Claws of the Tyrant": "Когти тирана",
    "Pathfinder Adventure: Prey for Death": "Добыча смерти",
    "The Dead God's Hand": "Рука мёртвого бога",
    "Pathfinder Lost Omens Tian Xia World Guide": "Тянь-Ся: мир",
    "Gatewalkers Player's Guide (Remastered)": "Проводники врат",
    "Paizo Blog: Foolish Housekeeping and Other Articles": "Заметки издателя",
}

SKILL_EN = {
    "acrobatics": "acrobatics",
    "arcana": "arcana",
    "athletics": "athletics",
    "crafting": "crafting",
    "deception": "deception",
    "diplomacy": "diplomacy",
    "intimidation": "intimidation",
    "medicine": "medicine",
    "nature": "nature",
    "occultism": "occultism",
    "performance": "performance",
    "religion": "religion",
    "society": "society",
    "stealth": "stealth",
    "survival": "survival",
    "thievery": "thievery",
}
SKILL_RU = {
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
RANK_RU = {"trained": "обучен", "expert": "эксперт", "master": "мастер", "legendary": "легенда"}
ABILITY_EN = {
    "Strength": "str",
    "Dexterity": "dex",
    "Constitution": "con",
    "Intelligence": "int",
    "Wisdom": "wis",
    "Charisma": "cha",
}
ABILITY_RU = {"str": "Сила", "dex": "Ловкость", "con": "Телосложение", "int": "Интеллект", "wis": "Мудрость", "cha": "Харизма"}
TRADITION_RU = {"arcane": "арканная", "divine": "божественная", "occult": "оккультная", "primal": "первозданная"}
SAVE_RU = {"fortitude": "Стойкость", "reflex": "Рефлексы", "will": "Воля"}
PER_RU = {
    "day": "день",
    "round": "раунд",
    "turn": "ход",
    "week": "неделю",
    "PT1M": "минуту",
    "PT10M": "10 минут",
    "PT1H": "час",
    "PT24H": "сутки",
}
SEL_RU = {
    "ac": "класс брони",
    "attack": "атаку",
    "attack-roll": "бросок атаки",
    "damage": "урон",
    "perception": "восприятие",
    "saving-throw": "испытание",
    "fortitude": "стойкость",
    "reflex": "рефлексы",
    "will": "волю",
    "skill-check": "проверку навыка",
    "strike-damage": "урон удара",
    "strike-attack-roll": "бросок удара",
}
TYPE_RU = {"circumstance": "обстоятельств", "status": "статуса", "item": "предмета", "untyped": "без типа"}
TIME_RU = {
    "1": "1 действие",
    "2": "2 действия",
    "3": "3 действия",
    "1 to 3": "от 1 до 3 действий",
    "1 or 2": "1 или 2 действия",
    "2 or 3": "2 или 3 действия",
    "reaction": "реакция",
    "free": "свободное действие",
    "1 minute": "1 минута",
    "10 minutes": "10 минут",
    "1 hour": "1 час",
    "8 hours": "8 часов",
    "1 day": "1 день",
}
TRAIT_NAMES = {
    "additive": "Добавка",
    "aftermath": "Последствие",
    "aiuvarin": "Айуварин",
    "archetype": "Архетип",
    "ardande": "Арданде",
    "artifact": "Артефакт",
    "auditory": "Слуховой",
    "class": "Класс",
    "concentrate": "Концентрация",
    "consecration": "Освящение",
    "cursebound": "Проклятие оракула",
    "dhampir": "Дампир",
    "disease": "Болезнь",
    "downtime": "Свободное время",
    "dromaar": "Дромаар",
    "emotion": "Эмоция",
    "ghoran": "Горан",
    "hungerseed": "Голодное семя",
    "impulse": "Импульс",
    "incapacitation": "Недееспособность",
    "inhaled": "Вдыхаемый",
    "kineticist": "Кинетик",
    "lineage": "Родословная",
    "mindshift": "Сдвиг разума",
    "move": "Движение",
    "multiclass": "Несколько классов",
    "naari": "Наари",
    "oread": "Ореад",
    "scrying": "Прорицание",
    "structure": "Строение",
    "suli": "Сули",
    "sylph": "Сильф",
    "talos": "Талос",
    "transcendence": "Превосхождение",
    "undine": "Ундина",
    "yaksha": "Якша",
}

TRAIT_INFO = {
    "concentrate": "Нужна сосредоточенность. Состояния вроде ярости этому мешают.",
    "manipulate": "Нужна свободная рука. Без руки действие не выходит.",
    "archetype": "Черта архетипа. Её берут в слот черты класса после посвящения.",
    "dedication": "Посвящение в архетип. Следующее посвящение — после двух черт этого архетипа.",
    "focus": "Фокусное заклинание. Тратит очко фокуса, а не обычную ячейку.",
    "mental": "Ментальный эффект. Бесплотный разум его не ловит.",
    "mythic": "Мифическая ступень. Обычный герой без мифического пути её не берёт.",
    "skill": "Черта навыка. Часто требует обученность.",
    "general": "Общая черта. Её берут в общий слот.",
    "flourish": "Росчерк. В этот ход другой росчерк уже не сделать.",
    "auditory": "Цель должна слышать.",
    "visual": "Цель должна видеть.",
    "emotion": "Эмоция. Действует на чувства, а не на голый расчёт.",
    "healing": "Лечение. Мёртвого этой меткой не поднять, если поле не говорит иначе.",
    "incapacitation": "Недееспособность. Существу выше вашего уровня ступень успеха лучше.",
    "attack": "Это атака. В ход она считается в серии атак.",
    "magical": "Магический эффект.",
    "fortune": "Удача. Повторный бросок удачи в тот же бросок не складывают.",
    "misfortune": "Неудача. Худший из двух бросков.",
    "spellshape": "Форма заклинания. Меняет следующее сотворение, а не даёт новое заклинание.",
    "cantrip": "Заговор. Его готовят отдельно и он растёт с уровнем.",
    "stance": "Стойка. Новая стойка сменяет прежнюю.",
    "rage": "Связано с яростью варвара.",
    "aura": "Аура вокруг вас. Союзники в ней получают указанный эффект.",
    "fear": "Страх. Не действует на существо без эмоций, если поле не спорит.",
    "teleportation": "Перенос. Пространство назначения должно быть свободно.",
    "polymorph": "Облик. Боевая форма сменяет прежнее превращение.",
    "morph": "Морф. Меньше полного превращения: меняется часть тела.",
    "illusion": "Иллюзия. Проверка разоблачения идёт по правилам иллюзий.",
    "linguistic": "Нужен общий язык с целью.",
    "hex": "Сглаз ведьмы. Обычно один сглаз на цель, пока он не спадёт.",
    "exploration": "Для исследования, не для обмена ударами.",
    "curse": "Проклятие. Снимается не обычным лечением.",
    "light": "Свет. Тьма более высокой ступени его гасит.",
    "darkness": "Тьма. Мешает зрению в области.",
    "fire": "Огонь.",
    "cold": "Холод.",
    "water": "Вода.",
    "air": "Воздух.",
    "earth": "Земля.",
    "wood": "Дерево.",
    "vitality": "Жизненная сила. Нежить от неё обычно страдает.",
    "void": "Пустота. Живых ей обычно ранят.",
    "spirit": "Дух.",
    "plant": "Растение.",
    "force": "Силовое поле. Его мало что держит.",
    "sonic": "Звук.",
    "poison": "Яд.",
    "acid": "Кислота.",
    "electricity": "Электричество.",
    "disease": "Болезнь.",
    "death": "Смерть. Эффект на грани гибели.",
    "detection": "Обнаружение. Говорит, есть ли искомое, а не рисует карту.",
    "revelation": "Откровение оракула.",
    "composition": "Композиция барда.",
    "spellshot": "Выстрел заклинанием стрелка.",
    "finisher": "Завершающий приём сорвиголовы. Тратит панache.",
    "press": "Нажим. Обычно после вашей же атаки в этот ход.",
    "open": "Открывающий приём. Им часто начинают обмен.",
    "move": "Движение. Обычно вместе с шагом.",
}

UUID_ITEM = re.compile(r"@UUID\[[^\]]*Item\.([^\]]+)\](?:\{([^}]*)\})?")
UUID_ANY = re.compile(r"@UUID\[[^\]]+\](?:\{([^}]*)\})?")
TAG = re.compile(r"<[^>]+>")


def load_json(path: Path):
    try:
        data = json.loads(path.read_text())
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def orc_remaster(system: dict) -> bool:
    pub = system.get("publication") if isinstance(system.get("publication"), dict) else {}
    return pub.get("license") == "ORC" and pub.get("remaster") is True


def book_of(system: dict) -> str:
    pub = system.get("publication") if isinstance(system.get("publication"), dict) else {}
    title = str(pub.get("title") or "")
    if title in BOOKS:
        return BOOKS[title]
    page = pub.get("page")
    if isinstance(page, int):
        return f"книга ремастера, с. {page}"
    return "книга ремастера"


def page_of(system: dict):
    pub = system.get("publication") if isinstance(system.get("publication"), dict) else {}
    page = pub.get("page")
    return page if isinstance(page, int) else None


def plain(html: str) -> str:
    text = UUID_ITEM.sub(lambda m: m.group(2) or m.group(1).replace("-", " "), html or "")
    text = UUID_ANY.sub(lambda m: m.group(1) or "", text)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n", text, flags=re.I)
    text = TAG.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def labeled(html: str) -> dict[str, str]:
    head = (html or "").split("<hr", 1)[0]
    text = plain(head)
    found: dict[str, str] = {}
    for label, key in (("Trigger", "trigger"), ("Frequency", "frequency"), ("Requirements", "requirements")):
        match = re.search(rf"\b{label}\b\s+(.*?)(?=\b(?:Trigger|Frequency|Requirements)\b|$)", text)
        if match:
            found[key] = match.group(1).strip(" .;")
    return found


def phrase_or_stub(english: str, stub: str) -> str:
    if not english:
        return ""
    name = ru.compose(english)
    if name and not re.search(r"[A-Za-z]", name):
        return name[:1].lower() + name[1:] if name else ""
    return stub


def frequency_struct(raw) -> str:
    if not isinstance(raw, dict):
        return ""
    per = str(raw.get("per") or "")
    unit = PER_RU.get(per)
    if not unit:
        return ""
    count = raw.get("max") if isinstance(raw.get("max"), int) else 1
    if count == 1:
        return f"1 раз в {unit}"
    return f"{count} раза в {unit}"


def action_of(system: dict) -> str:
    kind = (system.get("actionType") or {}).get("value") if isinstance(system.get("actionType"), dict) else None
    count = (system.get("actions") or {}).get("value") if isinstance(system.get("actions"), dict) else None
    if kind == "reaction":
        return "reaction"
    if kind == "free":
        return "free"
    if kind == "passive" or kind is None:
        return "passive"
    if kind == "action" and count in (1, 2, 3):
        return str(count)
    if kind == "action":
        return "1"
    return "passive"


def spell_cast(time: str) -> str:
    return TIME_RU.get(time.strip(), "")


def spell_actions(time: str) -> str:
    value = time.strip().lower()
    if value in {"1", "2", "3"}:
        return value
    if value == "reaction":
        return "reaction"
    if value == "free":
        return "free"
    if "to" in value or "or" in value:
        return "varies"
    return "other"


def summarize_rules(rules: list) -> str:
    lines: list[str] = []
    for rule in rules:
        if not isinstance(rule, dict):
            continue
        key = rule.get("key")
        if key == "FlatModifier":
            selector = SEL_RU.get(str(rule.get("selector") or ""), "проверку")
            bonus = TYPE_RU.get(str(rule.get("type") or ""), "без типа")
            value = rule.get("value")
            if isinstance(value, (int, float)):
                lines.append(f"Пока условие включено, {selector} получает бонус {bonus} {value:+}.")
        elif key == "Resistance" and rule.get("type") and rule.get("value") is not None:
            lines.append(f"Сопротивление указанному типу урона равно {rule.get('value')}.")
        elif key == "Weakness" and rule.get("value") is not None:
            lines.append(f"Уязвимость указанного типа равна {rule.get('value')}.")
        elif key == "BaseSpeed" and rule.get("value") is not None:
            lines.append(f"Скорость меняется на {rule.get('value')} футов.")
        elif key == "DamageDice":
            lines.append("К урону удара прибавляется кость из поля черты.")
        elif key == "ActiveEffectLike" and "medicine" in str(rule.get("path")):
            lines.append("Медицина поднимается до эксперта, если была ниже.")
        elif key == "ActiveEffectLike" and "rank" in str(rule.get("path")):
            lines.append("Ступень владения из поля поднимается, если была ниже.")
        elif key == "GrantItem":
            lines.append("Открывает связанное действие или предмет.")
        elif key == "MartialProficiency":
            lines.append("Поднимает владение оружием или доспехом.")
        elif key == "Sense":
            lines.append("Даёт чувство из поля черты.")
        elif key == "AdjustDegreeOfSuccess":
            lines.append("Может сдвинуть ступень успеха проверки.")
        elif key == "Strike":
            lines.append("Даёт особый удар с полями урона и черт.")
        elif key == "Aura":
            lines.append("Держит ауру с радиусом из поля.")
    unique = list(dict.fromkeys(lines))
    if not unique and rules:
        return "В полях есть формула эффекта. Лист прибавляет только те числа, которые уже умеет читать."
    if not unique:
        return "Постоянного числа в полях нет. Смысл остаётся в действии, чертах и имени."
    return " ".join(unique[:3])


def spell_summary(system: dict, cast: str, defense: str, heightened: str) -> str:
    bits = []
    if cast:
        bits.append(f"Сотворение: {cast}.")
    damage = system.get("damage") if isinstance(system.get("damage"), dict) else {}
    formula = ""
    for value in damage.values():
        if isinstance(value, dict) and value.get("formula"):
            formula = str(value["formula"])
            kinds = value.get("kinds") or []
            if "healing" in kinds and "damage" in kinds:
                bits.append(f"Кость {formula} лечит живого или ранит нежить.")
            elif "healing" in kinds:
                bits.append(f"Лечение {formula}.")
            else:
                bits.append(f"Урон {formula}.")
            break
    if defense:
        bits.append(defense + ".")
    if heightened:
        bits.append(heightened)
    if not bits:
        return "Круг, традиции и область задают эффект. Абзац книги не перенесён."
    return " ".join(bits)


def defense_text(system: dict) -> str:
    defense = system.get("defense") if isinstance(system.get("defense"), dict) else None
    if not defense:
        return ""
    save = defense.get("save") if isinstance(defense.get("save"), dict) else None
    if not save:
        return ""
    stat = SAVE_RU.get(str(save.get("statistic") or ""))
    if not stat:
        return ""
    return f"Спасбросок {stat}" + (", базовый" if save.get("basic") else "")


def heightened_text(system: dict) -> str:
    raw = system.get("heightening") if isinstance(system.get("heightening"), dict) else None
    if not raw:
        return ""
    if raw.get("type") == "interval":
        interval = raw.get("interval") or 1
        dice = ""
        damage = raw.get("damage") if isinstance(raw.get("damage"), dict) else {}
        if damage:
            dice = str(next(iter(damage.values())))
        if dice:
            return f"Каждые {interval} круг прибавляется {dice}."
        return f"Эффект растёт каждые {interval} круг."
    return "На повышенном круге эффект сильнее. Точная ступень лежит в поле повышения."


def measure(value: str, kind: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    known = {
        "touch": "касание",
        "varies": "зависит от действий",
        "planetary": "планетарная",
        "unlimited": "без предела",
        "see text": "",
    }
    if text.lower() in known:
        return known[text.lower()]
    feet = re.fullmatch(r"(\d+) feet", text, flags=re.I)
    if feet:
        return f"{feet.group(1)} футов"
    miles = re.fullmatch(r"(\d+) miles?", text, flags=re.I)
    if miles:
        return f"{miles.group(1)} миль"
    name = ru.compose(text)
    if name and not re.search(r"[A-Za-z]", name) and len(text.split()) <= 4:
        return name[:1].lower() + name[1:]
    return ""


def existing_names() -> dict[str, str]:
    found: dict[str, str] = {}
    for name in ("pf-lists.json", "pf-wide.json", "pf-feat-index.json", "pf-feat-wide.json", "pf-backgrounds.json"):
        path = OUT / name
        if not path.exists():
            continue
        rows = json.loads(path.read_text())
        if isinstance(rows, list):
            for row in rows:
                if isinstance(row, dict) and row.get("id") and row.get("name"):
                    found.setdefault(str(row["id"]), str(row["name"]))
    return found


def walk(folder: Path):
    for path in folder.rglob("*.json"):
        if path.name.startswith("_"):
            continue
        data = load_json(path)
        if not data:
            continue
        system = data.get("system")
        if isinstance(system, dict) and orc_remaster(system):
            yield path, data, system


def main() -> None:
    names = existing_names()
    feats = []
    by_english: dict[str, str] = {}
    dedications: dict[str, str] = {}
    for path, data, system in walk(PACK / "feats"):
        traits = [item for item in ((system.get("traits") or {}).get("value") or []) if isinstance(item, str)]
        english = str(data.get("name") or "")
        feat_id = path.stem
        by_english[english.lower()] = feat_id
        if "dedication" in traits:
            dedications[english.lower()] = feat_id
        feats.append((path, data, system, traits, english, feat_id))

    cards = []
    trait_ids: set[str] = set()
    for path, data, system, traits, english, feat_id in feats:
        trait_ids.update(traits)
        labels = labeled((system.get("description") or {}).get("value") or "")
        prereq_raw = []
        for item in (system.get("prerequisites") or {}).get("value") or []:
            if isinstance(item, dict) and item.get("value"):
                prereq_raw.append(str(item["value"]))
        gates = []
        for text in prereq_raw:
            skill = re.fullmatch(r"(trained|expert|master|legendary) in ([A-Za-z][A-Za-z ]+)", text.strip())
            ability = re.fullmatch(r"(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) \+(\d+)", text.strip())
            if skill and skill.group(2).strip().lower() in SKILL_EN:
                gates.append({"kind": "skill", "skill": skill.group(2).strip().lower(), "rank": skill.group(1)})
            elif ability:
                gates.append({"kind": "ability", "ability": ABILITY_EN[ability.group(1)], "mod": int(ability.group(2))})
            elif text.strip().lower() in dedications:
                gates.append({"kind": "dedication", "id": dedications[text.strip().lower()]})
            elif text.strip().lower() in by_english:
                gates.append({"kind": "feat", "id": by_english[text.strip().lower()]})
        kind = "dedication" if "dedication" in traits else "feat"
        missed = len(prereq_raw) - len(gates)
        freq = frequency_struct(system.get("frequency")) or phrase_or_stub(labels.get("frequency", ""), "Частота задана полем, фраза не перенесена." if labels.get("frequency") else "")
        trigger = phrase_or_stub(labels.get("trigger", ""), "Условие задано, фраза книги не перенесена." if labels.get("trigger") else "")
        requirements = phrase_or_stub(labels.get("requirements", ""), "Нужное условие задано, фраза книги не перенесена." if labels.get("requirements") else "")
        composed = ru.compose(english)
        cards.append({
            "id": feat_id,
            "kind": kind,
            "name": composed or names.get(feat_id) or "Черта",
            "originalName": english,
            "level": int((system.get("level") or {}).get("value") or 0),
            "actions": action_of(system),
            "traits": traits,
            "gates": gates,
            "prereqNote": "Есть ещё требование, его фраза в поля не разобрана." if missed else "",
            "frequency": freq,
            "trigger": trigger,
            "requirements": requirements,
            "summary": summarize_rules(system.get("rules") or []),
            "book": book_of(system),
            "page": page_of(system),
        })

    for path, data, system in walk(PACK / "spells"):
        traits = [item for item in ((system.get("traits") or {}).get("value") or []) if isinstance(item, str)]
        trait_ids.update(traits)
        ritual = bool(system.get("ritual")) or "rituals" in path.parts
        if ritual:
            kind = "ritual"
        elif "focus" in traits:
            kind = "focus"
        else:
            kind = "spell"
        english = str(data.get("name") or "")
        time = str((system.get("time") or {}).get("value") or "")
        cast = spell_cast(time) or ("особое время" if time else "")
        traditions = [TRADITION_RU[item] for item in ((system.get("traits") or {}).get("traditions") or []) if item in TRADITION_RU]
        area = system.get("area") if isinstance(system.get("area"), dict) else {}
        area_text = measure(str(area.get("value") or area.get("type") or ""), "area") if area else ""
        if isinstance(system.get("area"), dict) and system["area"].get("type") and not area_text:
            area_text = {"burst": "взрыв", "cone": "конус", "line": "линия", "emanation": "эманация"}.get(str(system["area"].get("type")), "")
        target = system.get("target") if isinstance(system.get("target"), dict) else {}
        duration = system.get("duration") if isinstance(system.get("duration"), dict) else {}
        duration_text = "поддерживаемое" if duration.get("sustained") else measure(str(duration.get("value") or ""), "duration")
        if duration.get("sustained") and duration.get("value"):
            extra = measure(str(duration.get("value")), "duration")
            duration_text = f"поддерживаемое{', ' + extra if extra else ''}"
        defense = defense_text(system)
        heightened = heightened_text(system)
        range_text = measure(str((system.get("range") or {}).get("value") or ""), "range") if isinstance(system.get("range"), dict) else ""
        target_text = measure(str(target.get("value") or ""), "target")
        composed = ru.compose(english)
        ritual_note = ""
        if ritual and isinstance(system.get("ritual"), dict):
            primary = (system["ritual"].get("primary") or {}).get("check")
            if isinstance(primary, str):
                primary_ru = ru.compose(primary)
                ritual_note = f"Основная проверка: {primary_ru}." if primary_ru and not re.search(r"[A-Za-z]", primary_ru) else "Есть основная и вторичные проверки ритуала."
        summary = spell_summary(system, cast, defense, heightened)
        if ritual_note:
            summary = f"{summary} {ritual_note}"
        cards.append({
            "id": path.stem,
            "kind": kind,
            "name": composed or names.get(path.stem) or "Заклинание",
            "originalName": english,
            "level": int((system.get("level") or {}).get("value") or 0),
            "actions": spell_actions(time),
            "cast": cast,
            "traditions": traditions,
            "traits": traits,
            "gates": [],
            "prereqNote": "",
            "range": range_text,
            "area": area_text,
            "targets": target_text,
            "defense": defense,
            "duration": duration_text or ("мгновенная" if kind != "ritual" else ""),
            "heightened": heightened,
            "frequency": "",
            "trigger": "",
            "requirements": "",
            "summary": summary,
            "book": book_of(system),
            "page": page_of(system),
        })

    features = []
    for path in (PACK / "classes").glob("*.json"):
        data = load_json(path)
        if not data:
            continue
        system = data.get("system")
        if not isinstance(system, dict) or not orc_remaster(system):
            continue
        items = system.get("items") if isinstance(system.get("items"), dict) else {}
        for item in items.values():
            if not isinstance(item, dict):
                continue
            english = str(item.get("name") or "")
            level = item.get("level")
            if not english or not isinstance(level, int):
                continue
            composed = ru.compose(english)
            features.append({
                "classId": path.stem,
                "level": level,
                "originalName": english,
                "name": composed or "особенность класса",
            })

    traits = []
    for trait in sorted(trait_ids):
        composed = ru.compose(trait.replace("-", " "))
        name = TRAIT_NAMES.get(trait) or composed or trait
        if re.search(r"[A-Za-z]", name):
            name = "метка"
        info = TRAIT_INFO.get(trait, f"Метка «{name}». Сама по себе числа листа не меняет.")
        traits.append({"id": trait, "name": name[:1].upper() + name[1:], "info": info})

    cards.sort(key=lambda row: (row["kind"], row["name"].casefold(), row["id"]))
    (OUT / "pf-cards.json").write_text(json.dumps(cards, ensure_ascii=False, indent=1) + "\n")
    (OUT / "pf-traits.json").write_text(json.dumps(traits, ensure_ascii=False, indent=1) + "\n")
    (OUT / "pf-class-features.json").write_text(json.dumps(features, ensure_ascii=False, indent=1) + "\n")
    kinds: dict[str, int] = {}
    for row in cards:
        kinds[row["kind"]] = kinds.get(row["kind"], 0) + 1
    print("cards", len(cards), kinds, "traits", len(traits), "features", len(features))


if __name__ == "__main__":
    main()
