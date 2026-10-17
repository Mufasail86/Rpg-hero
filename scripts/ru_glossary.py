#!/usr/bin/env python3
"""Свой словарь имён. Транслит — только для проверки, не для экрана."""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

import import_pf_lists as pf  # noqa: E402

GLOSSARY = ROOT / "scripts" / "glossary"
PHRASE_FILES = [ROOT / "scripts" / "pf_names_1.json", ROOT / "scripts" / "pf_names_2.json"]

# Свои формулировки. Они перекрывают и машинный словарь, и куски глоссария.
LOCK = {
    "s": "",
    "you": "",
    "your": "",
    "yourself": "",
    "yours": "",
    "on": "",
    "it": "",
    "me": "",
    "ve": "",
    "we": "",
    "what": "",
    "very": "",
    "the": "",
    "a": "",
    "an": "",
    "of": "",
    "to": "",
    "champion": "поборник",
    "exemplar": "экземплар",
    "yaoguai": "яогуай",
    "eidolon": "эйдолон",
    "bugbear": "багбир",
    "shrink": "сжатие",
    "shrinking": "сжимающее",
    "know": "знание",
    "enemy": "враг",
    "enemies": "враги",
    "spell": "заклинание",
    "spells": "заклинания",
    "fulu": "фулу",
    "banner": "знамя",
    "rounds": "патроны",
    "pistol": "пистолет",
    "heart": "сердце",
    "sight": "прицел",
    "tattoo": "татуировка",
    "pact": "договор",
    "war": "война",
    "standard": "обычный",
    "crown": "корона",
    "soul": "душа",
    "sea": "море",
    "explosive": "взрывной",
    "purification": "очищение",
    "clockwork": "заводной",
    "mantis": "богомол",
    "golden": "золотой",
    "mental": "ментальный",
    "sanguine": "кровавый",
    "sky": "небо",
    "demon": "демон",
    "bloom": "цветение",
    "doom": "гибель",
    "thousand": "тысяча",
    "guardian": "страж",
    "beast": "зверь",
    "bullet": "пуля",
    "essence": "сущность",
    "star": "звезда",
    "world": "мир",
    "powder": "порох",
    "ink": "чернила",
    "mythic": "мифический",
    "gun": "ружьё",
    "psychic": "экстрасенс",
    "warding": "оберег",
    "spellgun": "заклинательное ружьё",
    "suit": "масть",
    "gaze": "взор",
    "living": "живой",
    "claw": "коготь",
    "mantle": "мантия",
    "coil": "спираль",
    "dazzling": "ослепительный",
    "piercing": "колющий",
    "implement": "регалия",
    "moon": "луна",
    "crescent": "полумесяц",
    "no": "без",
    "legerdemain": "ловкость рук",
    "root": "корень",
    "rapid": "быстрый",
    "rolling": "катящийся",
    "heroic": "героический",
    "lesson": "урок",
    "deep": "глубокий",
    "ally": "союзник",
    "elf": "эльф",
    "tail": "хвост",
    "gnome": "гном",
    "fang": "клык",
    "tonic": "тоник",
    "bracelet": "браслет",
    "field": "поле",
    "dragonet": "дракончик",
    "phantom": "фантом",
    "cause": "повод",
    "alarm": "тревога",
    "for": "для",
    "binds": "узы",
    "that": "",
    "tie": "связь",
    "cutting": "режущий",
    "rebuke": "укор",
    "oddity": "диковина",
    "identification": "опознание",
    "benthic": "глубинный",
    "hopeful": "надеющийся",
    "coral": "коралловый",
    "cardan": "кардан",
    "calls": "зовёт",
    "vigorous": "бодрый",
    "zoom": "рывок",
    "moonflower": "лунный цветок",
    "doppelganger": "двойник",
    "abrogail": "аброгейл",
    "niyahaat": "нияхаат",
    "kimanez": "киманес",
    "i": "я",
    "ii": "2",
    "iii": "3",
    "iv": "4",
    "vi": "6",
    "vii": "7",
    "viii": "8",
    "ix": "9",
}

PHRASE_LOCK = {
    "Dubious Knowledge": "Сомнительное знание",
    "General Training": "Общая подготовка",
    "Yaoguai": "Яогуай",
    "Exemplar": "Экземплар",
    "Champion": "Поборник",
    "Know Your Enemy": "Знай своего врага",
    "Shrink Spell": "Сжатие заклинания",
    "Shield Block": "Блок щитом",
    "Heal": "Лечение",
    "Nimble Dodge": "Ловкое уклонение",
    "Medic Dedication": "Посвящение медика",
    "Reactive Strike": "Ответный удар",
    "Binds That Tie": "Связующие узы",
    "Cutting Rebuke": "Режущий укор",
    "No Cause for Alarm": "Нет повода для тревоги",
    "Shrinking Potion": "Зелье уменьшения",
    "No! No! I Created You!": "Нет! Нет! Это я тебя создал!",
    "I've Had Many Jobs": "У меня было много занятий",
    "I Sense Malevolence": "Я чую злобу",
    "I am the Weapon": "Я и есть оружие",
    "Stand Back, I'm A Doctor!": "Назад, я врач!",
    "I Meant to do That": "Так и задумано",
    "I Knew the Heroes": "Я знал этих героев",
    "I've Been Here Before": "Я уже здесь был",
    "Do You Know Who I Am?": "Ты знаешь, кто я?",
    "The Truth As I See It": "Правда, как я её вижу",
    "Know I Approach": "Знай: я иду",
    "Zip! Zoom!": "Вжик! Рывок!",
    "I Will Return": "Я вернусь",
    "Blood Calls Blood": "Кровь зовёт кровь",
    "Ember Doppelgänger": "Угольный двойник",
    "Abrogail I Script": "Письмена Аброгейл Первой",
    "Kimanéz Luminescent Toadstool": "Светящийся гриб киманеса",
    "Niyaháat": "Нияхаат",
    "Preserved Moonflower": "Сохранённый лунный цветок",
}

PROPER: set[str] = set()
WORDS = dict(pf.WORDS)


def load() -> None:
    WORDS.update(LOCK)
    if GLOSSARY.exists():
        for path in sorted(GLOSSARY.glob("*.json")):
            data = json.loads(path.read_text())
            if isinstance(data, dict) and isinstance(data.get("words"), dict):
                for key, value in data["words"].items():
                    if isinstance(key, str) and isinstance(value, str):
                        WORDS[key.lower()] = value
                for key in data.get("proper") or []:
                    if isinstance(key, str):
                        PROPER.add(key.lower())
            elif isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(key, str) and isinstance(value, str):
                        WORDS[key.lower()] = value
    WORDS.update(LOCK)
    for path in PHRASE_FILES:
        if path.exists():
            PHRASE_LOCK.update({key: value for key, value in json.loads(path.read_text()).items() if isinstance(value, str)})


def translit_word(word: str) -> str:
    return pf.translit(word)


def fold_accents(text: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))


def compose(english: str) -> str | None:
    if english in PHRASE_LOCK:
        return PHRASE_LOCK[english]
    english = fold_accents(english)
    if english in PHRASE_LOCK:
        return PHRASE_LOCK[english]
    parts = re.findall(r"[A-Za-z]+|\d+|[^A-Za-z\d]+", english)
    roman = {"i": "1", "ii": "2", "iii": "3", "iv": "4", "vi": "6", "vii": "7", "viii": "8", "ix": "9"}
    out: list[str] = []
    for part in parts:
        if part.isdigit() or not part[:1].isalpha():
            out.append(part)
            continue
        key = part.lower()
        previous = next((piece.strip().lower() for piece in reversed(out) if piece.strip()), "")
        if key in roman and (key != "i" or previous == "тип"):
            out.append(roman[key])
            continue
        word = WORDS.get(key)
        if word is None:
            return None
        out.append(word)
    name = re.sub(r"\s+", " ", "".join(out)).strip(" -–—")
    name = re.sub(r"\s+([,)])", r"\1", name)
    name = re.sub(r"\(\s+", "(", name)
    name = re.sub(r"\s+'", "'", name)
    if not name:
        return None
    return name[:1].upper() + name[1:]


def machine_name(english: str) -> str:
    parts = re.findall(r"[A-Za-z]+|\d+|[^A-Za-z\d]+", english)
    out = []
    for part in parts:
        if part.isdigit() or not part[:1].isalpha():
            out.append(part)
        else:
            out.append(pf.translit(part))
    name = re.sub(r"\s+", " ", "".join(out)).strip(" -–—")
    if not name:
        return ""
    return name[:1].upper() + name[1:]


def content_words(english: str) -> list[str]:
    words = re.findall(r"[A-Za-z]+", english)
    return [word for word in words if WORDS.get(word.lower(), "x") != ""]


def translit_tokens(english: str) -> list[str]:
    bad = []
    for word in content_words(english):
        if word.lower() in PROPER:
            continue
        if word.lower() in {"fulu", "orc", "dwarf", "goblin", "kobold", "hobgoblin", "tengu", "cardan", "athamaru"}:
            continue
        token = pf.translit(word)
        if token:
            bad.append(token)
    return bad


load()
