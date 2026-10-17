#!/usr/bin/env python3
"""Свои русские имена вместо побуквенной передачи и русские черты бестиария.

Абзац книги не копируется. Меняются только уже лежащие карточки.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from import_pf_lists import ru_name

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "src/data/generated"
LETTER = "Имя на экране собрано по словам и по буквам. Это не изданный перевод."
OWN = "Название собрано своими словами из открытого имени. Это не книжный перевод."

TRAITS = {
    "Unaligned": "без мировоззрения",
    "unaligned": "без мировоззрения",
    "Neutral": "нейтральный",
    "neutral": "нейтральный",
    "Chaotic Evil": "хаотичное зло",
    "chaotic evil": "хаотичное зло",
    "lawful evil": "законное зло",
    "Lawful Evil": "законное зло",
    "Neutral Evil": "нейтральное зло",
    "neutral evil": "нейтральное зло",
    "Chromatic": "хроматический",
    "Lawful Good": "законное добро",
    "Metallic": "металлический",
    "lawful good": "законное добро",
    "devil": "дьявол",
    "Devil": "дьявол",
    "any alignment": "любое мировоззрение",
    "demon": "демон",
    "Demon": "демон",
    "any race": "любой народ",
    "celestial": "небожитель",
    "earth": "земля",
    "human": "человек",
    "water": "вода",
    "soulbound": "связанный душой",
    "chaotic good": "хаотичное добро",
    "wood": "дерево",
    "Chaotic Good": "хаотичное добро",
    "air": "воздух",
    "dinosaur": "динозавр",
    "Dinosaur": "динозавр",
    "Goblinoid": "гоблиноид",
    "goblinoid": "гоблиноид",
    "Chaotic Neutral": "хаотичный нейтральный",
    "chaotic neutral": "хаотичный нейтральный",
    "dwarf": "дварф",
    "Neutral Good": "нейтральное добро",
    "neutral good": "нейтральное добро",
    "serpentfolk": "змеелюд",
    "archon": "архон",
    "orc": "орк",
    "genie": "джинн",
    "Genie": "джинн",
    "skeleton": "скелет",
    "azata": "азата",
    "aeon": "эон",
    "daemon": "дэмон",
    "qlippoth": "клипот",
    "angel": "ангел",
    "Angel": "ангел",
    "oni": "они",
    "hag": "ведьма",
    "nymph": "нимфа",
    "gnome": "гном",
    "kobold": "кобольд",
    "lizardfolk": "ящеролюд",
    "psychopomp": "психопомп",
    "zombie": "зомби",
    "werecreature": "оборотень",
    "mutant": "мутант",
    "elf": "эльф",
    "protean": "протеан",
    "boggard": "боггард",
    "caligni": "калигни",
    "dero": "деро",
    "sprite": "спрайт",
    "leshy": "леший",
    "hobgoblin": "хобгоблин",
    "duergar": "дуэргар",
    "gremlin": "гремлин",
    "kholo": "кхоло",
    "merfolk": "морской народ",
    "sedacthy": "седакти",
    "vampire": "вампир",
    "xulgath": "зулгат",
    "lawful neutral": "законный нейтральный",
    "Lawful Neutral": "законный нейтральный",
    "shapechanger": "перевёртыш",
    "Lycanthrope": "ликантроп",
    "human, shapechanger": "человек, перевёртыш",
    "demon, shapechanger": "демон, перевёртыш",
    "devil, shapechanger": "дьявол, перевёртыш",
    "Wizard": "волшебник",
    "Cleric": "жрец",
    "Druid": "друид",
    "azarketi": "азаркети",
    "bugbear": "багбир",
    "troll": "тролль",
    "ghost": "привидение",
    "ghoul": "упырь",
    "halfling": "полурослик",
    "nephilim": "нефилим",
    "mummy": "мумия",
    "ethereal": "эфирный",
    "phantom": "фантом",
    "rakshasa": "ракшас",
    "titan": "титан",
    "Titan": "титан",
    "aiuvarin": "айуварин",
    "locathah": "локата",
    "tane": "тане",
    "catfolk": "кошачий народ",
    "centaur": "кентавр",
    "changeling": "подменыш",
    "dhampir": "дхампир",
    "dromaar": "дромар",
    "duskwalker": "сумеречный странник",
    "graveknight": "могильный рыцарь",
    "metal": "металл",
    "alchemical": "алхимический",
    "couatl": "куатль",
    "ratfolk": "крысиный народ",
    "shadow": "тень",
    "tengu": "тэнгу",
    "wight": "умертвие",
    "wraith": "призрачный ужас",
    "gnoll": "гнолл",
    "grimlock": "гримлок",
    "any evil alignment": "любое злое мировоззрение",
    "sahuagin": "сахуагин",
    "any chaotic alignment": "любое хаотичное мировоззрение",
}

PHRASES = [
    ("Passive Perception", "пассивное восприятие"),
    ("passive perception", "пассивное восприятие"),
    ("Darkvision", "ночное зрение"),
    ("darkvision", "ночное зрение"),
    ("Blindsight", "слепое зрение"),
    ("blindsight", "слепое зрение"),
    ("Truesight", "истинное зрение"),
    ("Tremorsense", "чувство вибрации"),
    ("telepathy", "телепатия"),
    ("Deep Speech", "глубинная речь"),
    ("Lawful Evil", "законное зло"),
    ("Chaotic Evil", "хаотичное зло"),
    ("Neutral Evil", "нейтральное зло"),
    ("Lawful Good", "законное добро"),
    ("Chaotic Good", "хаотичное добро"),
    ("Neutral Good", "нейтральное добро"),
    ("Chaotic Neutral", "хаотичный нейтральный"),
    ("Lawful Neutral", "законный нейтральный"),
    ("Unaligned", "без мировоззрения"),
    ("Perception", "Восприятие"),
    ("Stealth", "Скрытность"),
    ("History", "История"),
    ("Insight", "Проницательность"),
    ("Athletics", "Атлетика"),
    ("Acrobatics", "Акробатика"),
    ("Arcana", "Магия"),
    ("Deception", "Обман"),
    ("Intimidation", "Запугивание"),
    ("Investigation", "Расследование"),
    ("Medicine", "Медицина"),
    ("Nature", "Природа"),
    ("Religion", "Религия"),
    ("Survival", "Выживание"),
    ("Persuasion", "Убеждение"),
    ("Performance", "Выступление"),
]


def walk(node):
    if isinstance(node, dict):
        blob = " ".join(value for value in node.values() if isinstance(value, str))
        if isinstance(node.get("originalName"), str) and (LETTER in blob or OWN in blob):
            node["name"] = ru_name(node["originalName"])
        for key, value in list(node.items()):
            if isinstance(value, str) and LETTER in value:
                node[key] = value.replace(LETTER, OWN)
            else:
                walk(value)
    elif isinstance(node, list):
        for item in node:
            walk(item)


def feat_index(rows: list[dict]) -> None:
    for row in rows:
        slug = str(row.get("id") or "")
        if not slug or " " in slug:
            continue
        english = slug.replace("-", " ")
        row["name"] = ru_name(english)


def polish_monsters(rows: list[dict]) -> None:
    for row in rows:
        traits = row.get("traits")
        if isinstance(traits, list):
            row["traits"] = [TRAITS.get(trait, trait) for trait in traits]
        text = row.get("text")
        if isinstance(text, str):
            for source, target in PHRASES:
                text = text.replace(source, target)
            row["text"] = text


def main() -> None:
    for name in ("pf-lists.json", "pf-legacy.json", "pf-paths.json", "pf-heritages.json"):
        path = GENERATED / name
        data = json.loads(path.read_text())
        walk(data)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
        print("names", name)
    index_path = GENERATED / "pf-feat-index.json"
    index = json.loads(index_path.read_text())
    feat_index(index)
    index_path.write_text(json.dumps(index, ensure_ascii=False) + "\n")
    print("index", len(index))
    for name in ("monsters-pf.json", "monsters-2024.json", "monsters-2014.json"):
        path = GENERATED / name
        rows = json.loads(path.read_text())
        polish_monsters(rows)
        path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")
        print("monsters", name, len(rows))


if __name__ == "__main__":
    main()
