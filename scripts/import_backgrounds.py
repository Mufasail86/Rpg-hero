#!/usr/bin/env python3
"""Происхождения ремастера из полей Foundry. Абзац книги в карточку не попадает."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = Path("/tmp/pf2e/packs/pf2e/backgrounds")
OUT = ROOT / "src/data/generated/pf-backgrounds.json"

ALL = ["str", "dex", "con", "int", "wis", "cha"]
ABILITY = {"str": "Сил", "dex": "Лов", "con": "Тел", "int": "Инт", "wis": "Мдр", "cha": "Хар"}
ABILITY_FULL = {
    "str": "Сила",
    "dex": "Ловкость",
    "con": "Телосложение",
    "int": "Интеллект",
    "wis": "Мудрость",
    "cha": "Харизма",
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
LORE = {
    "Academia Lore": "Знание академии",
    "Accounting Lore": "Знание счетов",
    "Acupuncture Lore": "Знание иглоукалывания",
    "Alcohol Lore": "Знание напитков",
    "Art Lore": "Знание искусства",
    "Astrology Lore": "Знание астрологии",
    "Boneyard Lore": "Знание костяного двора",
    "Circus Lore": "Знание цирка",
    "Cooking Lore": "Знание кухни",
    "Cryptography Lore": "Знание шифров",
    "Curse Lore": "Знание проклятий",
    "Engineering Lore": "Знание механизмов",
    "Farming Lore": "Знание земледелия",
    "Fey Lore": "Знание фей",
    "Fireworks Lore": "Знание фейерверков",
    "Fortune-Telling Lore": "Знание гадания",
    "Games Lore": "Знание игр",
    "Gem Lore": "Знание самоцветов",
    "Genealogy Lore": "Знание родословных",
    "Gladatorial Lore": "Знание гладиаторов",
    "Gladiatorial Lore": "Знание арены",
    "Guild Lore": "Знание гильдии",
    "Herbalism Lore": "Знание трав",
    "Hunting Lore": "Знание охоты",
    "Kaiju Lore": "Знание кайдзю",
    "Labor Lore": "Знание труда",
    "Legal Lore": "Знание права",
    "Library Lore": "Знание библиотеки",
    "Mana Wastes Lore": "Знание пустошей маны",
    "Mercantile Lore": "Знание торговли",
    "Mining Lore": "Знание шахт",
    "Ocean Lore": "Знание моря",
    "Piloting Lore": "Знание пилотирования",
    "Plains Lore": "Знание равнин",
    "Planar Rift Lore": "Знание планарных разломов",
    "Politics Lore": "Знание политики",
    "Sailing Lore": "Знание мореходства",
    "Scouting Lore": "Знание разведки",
    "Scribing Lore": "Знание письма",
    "Sericulture Lore": "Знание шелководства",
    "Spirit Lore": "Знание духов",
    "Stabling Lore": "Знание конюшни",
    "Surgery Lore": "Знание хирургии",
    "Tanning Lore": "Знание выделки кожи",
    "Theater Lore": "Знание театра",
    "Underworld Lore": "Знание преступного мира",
    "Vehicle Lore": "Знание повозок",
    "Warfare Lore": "Знание войны",
}
FEAT_ID = {
    "Intimidating Glare": "glare",
    "Student of the Canon": "student-canon",
    "Fascinating Performance": "fascinating",
    "Bargain Hunter": "bargain",
    "Courtly Graces": "courtly",
    "Survey Wildlife": "survey",
    "Hefty Hauler": "hefty",
    "Dubious Knowledge": "dubious",
    "Underwater Marauder": "underwater",
    "Cat Fall": "cat-fall",
}
FEAT_RU = {
    "Forager": "Собиратель",
    "Specialty Crafting": "Узкое ремесло",
    "Streetwise": "Знаток улиц",
    "Quick Repair": "Быстрый ремонт",
    "Fascinating Performance": "Завораживающее выступление",
    "Battle Medicine": "Боевая медицина",
    "Experienced Professional": "Опытный профессионал",
    "Hefty Hauler": "Тяжёлая ноша",
    "Crafter's Appraisal": "Оценка ремесленника",
    "Group Coercion": "Групповое давление",
    "Impressive Performance": "Впечатляющее выступление",
    "Risky Surgery": "Рискованная хирургия",
    "Group Impression": "Общее впечатление",
    "Armor Assist": "Помощь с доспехом",
    "Courtly Graces": "Придворные манеры",
    "Intimidating Glare": "Устрашающий взгляд",
    "Assurance": "Уверенность",
    "Train Animal": "Дрессировка",
    "Dubious Knowledge": "Сомнительные знания",
    "Glean Contents": "Беглый просмотр",
    "Charming Liar": "Обаятельный лжец",
    "Lie To Me": "Мне не солжёшь",
    "Pilgrim's Token": "Знак паломника",
    "Express Rider": "Срочный гонец",
    "Quick Coercion": "Быстрое давление",
    "Concealing Legerdemain": "Скрытая ловкость рук",
    "Additional Lore": "Дополнительное знание",
    "Terrain Stalker": "Сталкер местности",
    "Experienced Smuggler": "Опытный контрабандист",
    "Pickpocket": "Карманник",
    "Oddity Identification": "Опознание диковин",
    "Underwater Marauder": "Подводный мародёр",
    "Hobnobber": "Светский собеседник",
    "Multilingual": "Полиглот",
    "Experienced Tracker": "Опытный следопыт",
    "Seasoned": "Бывалый повар",
    "Natural Medicine": "Природная медицина",
    "Root Magic": "Магия кореньев",
    "Bargain Hunter": "Торг",
    "Steady Balance": "Устойчивое равновесие",
    "Virtuosic Performer": "Виртуоз",
    "Schooled In Secrets": "Школа тайн",
    "Recognize Spell": "Узнать заклинание",
    "Bon Mot": "Меткое слово",
    "Eye For Numbers": "Глаз на числа",
    "Sign Language": "Язык жестов",
    "Read Lips": "Чтение по губам",
    "Lengthy Diversion": "Долгая диверсия",
    "Dirty Trick": "Грязный приём",
    "Terrain Expertise": "Знаток местности",
    "Inoculation": "Прививка",
    "Student of the Canon": "Ученик канона",
    "Improvise Tool": "Импровизированный инструмент",
    "Quick Identification": "Быстрое опознание",
    "Diehard": "Несгибаемый",
    "Forensic Acumen": "Судебная хватка",
    "Survey Wildlife": "Обзор дичи",
    "Subtle Theft": "Незаметная кража",
    "Arcane Sense": "Арканное чутьё",
    "Cat Fall": "Мягкое падение",
    "Quick Jump": "Быстрый прыжок",
    "Pet": "Питомец",
    "Fey's Fortune": "Удача феи",
    "Warding Sign": "Охранный знак",
    "Enlightenment in Adversity": "Просветление в беде",
    "Name Drop": "Громкое имя",
}
CRAFT = {
    "artistry": "искусство",
    "blacksmithing": "кузнечное дело",
    "glassmaking": "стекло",
    "leatherworking": "кожа",
    "tailoring": "портняжное дело",
    "woodworking": "дерево",
}
BOOK = {
    "Pathfinder Player Core": ("Ядро игрока", "pf-player-core", "Player Core"),
    "Pathfinder Player Core 2": ("Ядро игрока 2", "pf-orc-more", "ORC"),
    "Pathfinder GM Core": ("Ядро ведущего", "pf-orc-more", "ORC"),
    "Pathfinder Guns & Gears": ("Пушки и шестерни", "pf-orc-more", "ORC"),
    "Pathfinder Lost Omens Tian Xia Character Guide": ("Тянь-Ся", "pf-orc-more", "ORC"),
    "Pathfinder Battlecry!": ("Боевой клич", "pf-orc-more", "ORC"),
    "Pathfinder Lost Omens Rival Academies": ("Соперничающие академии", "pf-orc-more", "ORC"),
    "Pathfinder Dark Archive (Remastered)": ("Тёмный архив", "pf-orc-more", "ORC"),
}
RARITY = {"common": "обычное", "uncommon": "необычное", "rare": "редкое"}
# Имена pf2.ru. Водитель в том списке не назван: там «Диверсант», а это ядро игрока 2.
OFFICIAL = {
    "acolyte": "Послушник",
    "acrobat": "Акробат",
    "animal-whisperer": "Друг животных",
    "artisan": "Ремесленник",
    "artist": "Художник",
    "bandit": "Разбойник",
    "barkeep": "Трактирщик",
    "barrister": "Адвокат",
    "bounty-hunter": "Охотник за головами",
    "charlatan": "Шарлатан",
    "cook": "Повар",
    "criminal": "Преступник",
    "cultist": "Культист",
    "detective": "Сыщик",
    "emissary": "Посланник",
    "entertainer": "Артист",
    "farmhand": "Землепашец",
    "field-medic": "Полевой медик",
    "fortune-teller": "Гадатель",
    "gambler": "Азартный игрок",
    "gladiator": "Гладиатор",
    "guard": "Стражник",
    "herbalist": "Травник",
    "hermit": "Отшельник",
    "hunter": "Охотник",
    "laborer": "Разнорабочий",
    "martial-disciple": "Адепт боевых искусств",
    "merchant": "Купец",
    "miner": "Рудокоп",
    "noble": "Благородный",
    "nomad": "Кочевник",
    "prisoner": "Заключённый",
    "raised-by-belief": "Воспитанный в вере",
    "sailor": "Моряк",
    "scholar": "Учёный",
    "scout": "Разведчик",
    "street-urchin": "Бродяга",
    "teacher": "Учитель",
    "tinker": "Механик",
    "warrior": "Боец",
    "amnesiac": "Потерявший память",
    "astrologer": "Астролог",
    "barber": "Цирюльник",
    "blessed": "Благословлённый",
    "bookkeeper": "Счетовод",
    "courier": "Посыльный",
    "cursed": "Проклятый",
    "feral-child": "Дикое дитя",
    "feybound": "Должник фей",
    "haunted": "Терзаемый призраками",
    "insurgent": "Повстанец",
    "outrider": "Конный разведчик",
    "pilgrim": "Паломник",
    "refugee": "Беженец",
    "returned": "Возвращённый",
    "root-worker": "Собиратель кореньев",
    "royalty": "Королевская кровь",
    "saboteur": "Диверсант",
    "scavenger": "Мусорщик",
    "servant": "Слуга",
    "squire": "Оруженосец",
    "tax-collector": "Сборщик податей",
    "ward": "Подопечный",
    "alkenstar-outlaw": "Алькенстарский преступник",
    "anti-tech-activist": "Антитехнический активист",
    "disciple-of-the-gear": "Апостол шестерни",
    "saloon-entertainer": "Артист салуна",
    "fireworks-performer": "Артист-пиротехник",
    "waste-walker": "Бродящий по пустоши",
    "discarded-duplicate": "Брошенный дубликат",
    "undertaker": "Гробовщик",
    "goldhand-arms-dealer": "Дилер Золотой Руки",
    "back-alley-doctor": "Доктор из подворотни",
    "press-ganged-g-g": "Завербованный",
    "clockfighter": "Заводной гладиатор",
    "clockwork-researcher": "Исследователь заводных механизмов",
    "cannoneer": "Канонир",
    "codebreaker": "Криптограф",
    "toymaker": "Мастер игрушек",
    "medicinal-clocksmith": "Медик-часовщик",
    "mechanic": "Механик",
    "mechanical-symbiosis": "Механический симбиоз",
    "otherworldly-mission": "Миссия из Иного Мира",
    "junker": "Мусорщик",
    "spotter": "Наводчик",
    "hired-killer": "Наёмный убийца",
    "tall-tale": "Небылица",
    "wished-alive": "Оживлённый желанием",
    "circuit-judge": "Окружной судья",
    "gunsmith": "Оружейник",
    "alkenstar-sojourner": "Переехавший в Алькенстар",
    "printer": "Печатник",
    "deputy": "Помощник шерифа",
    "hounded-thief": "Преследуемый вор",
    "revenant": "Ревенант",
    "junk-collector": "Собиратель хлама",
    "saved-by-clockwork": "Спасённый механизмом",
    "wandering-preacher": "Странствующий проповедник",
    "tech-reliant": "Технозависимый",
    "farmsteader": "Фермер",
    "sheriff": "Шериф",
}
OWN = {
    "driver": "Водитель",
    "acupuncturist": "Иглоукалыватель",
    "bachuan-revolutionary": "Бачуаньский повстанец",
    "banished-celestial": "Изгнанный небожитель",
    "eagle-hunter": "Охотник с беркутом",
    "fated-rival": "Судьбоносный соперник",
    "favored": "Избранный",
    "gossip": "Сплетник",
    "jeweler": "Ювелир",
    "kaiju-stalker": "Охотник на кайдзю",
    "ocean-diver": "Ныряльщик",
    "professional-letter-writer": "Письмовник",
    "remittance-agent": "Посланец с деньгами",
    "runaway-noble": "Беглый дворянин",
    "silk-farmer": "Шелковод",
    "streetfood-vendor": "Уличный торговец едой",
    "tiffin-box-deliverer": "Развозчик снеди",
    "traveling-gourmand": "Странствующий гурман",
    "warded-by-kami": "Под защитой ками",
    "weaver": "Ткач",
    "zodiac-bound": "Связанный зодиаком",
    "aeronaut": "Воздухоплаватель",
    "arcane-revolutionary": "Арканный повстанец",
    "battle-mechanic": "Полевой механик",
    "battlefield-scrounger": "Полевой собиратель",
    "combat-carpenter": "Боевой плотник",
    "combat-chaplain": "Боевой капеллан",
    "conscript": "Призывник",
    "martial-musician": "Военный музыкант",
    "plague-doctor": "Чумной доктор",
    "quartermaster": "Интендант",
    "report-runner": "Гонец",
    "veteran": "Ветеран",
    "war-orphan": "Сирота войны",
    "academic-scion": "Отпрыск академии",
    "convocation-scout": "Разведчик собрания",
    "ghostwriter": "Литературный призрак",
    "library-dweller": "Обитатель библиотеки",
    "party-scholar": "Учёный вечеринок",
    "respected-mentor": "Уважаемый наставник",
    "school-medic": "Школьный медик",
    "star-athlete": "Звезда спорта",
    "working-student": "Студент-работник",
    "empty-whispers": "Пустые шёпоты",
    "legacy-of-the-hammer": "Наследие молота",
    "reborn-soul": "Перерождённая душа",
}


def feat_id(name: str) -> str:
    if name in FEAT_ID:
        return FEAT_ID[name]
    return re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "")).strip("-")


def feat_name(name: str) -> str:
    if name not in FEAT_RU:
        raise SystemExit(f"нет русского имени черты: {name}")
    return FEAT_RU[name]


def pools_of(boosts: dict) -> list[list[str]]:
    keys = sorted(boosts, key=lambda key: int(key) if str(key).isdigit() else 99)
    pools = []
    for key in keys:
        raw = boosts[key].get("value") if isinstance(boosts[key], dict) else boosts[key]
        if raw:
            pools.append(list(raw))
    return pools


def uuid_name(uuid: str) -> str:
    tail = uuid.split(".")[-1]
    tail = tail.replace("{item|flags.system.rulesSelections.feat}", "")
    return tail.strip()


def special_lines(rules: list, skills: list[str]) -> list[str]:
    lines = []
    for rule in rules:
        key = rule.get("key")
        if key == "FlatModifier" and rule.get("selector") == "initiative":
            lines.append(f"К инициативе +{rule.get('value')} обстоятельственных.")
        elif key == "FlatModifier" and rule.get("selector") == "saving-throw":
            lines.append(f"К испытаниям против заклинаний +{rule.get('value')} обстоятельственный.")
        elif key == "FlatModifier" and rule.get("selector") == "skill-check":
            lines.append("Пока отмечено желание, проверки навыков получают +2 обстоятельственных. Лист отметку сам не ставит.")
        elif key == "FlatModifier" and "rulesSelections" in str(rule.get("selector")):
            lines.append("Пока сущность помогает, к выбранному навыку +1 обстоятельственный. Провал остаётся пометкой, лист его сам не меняет.")
        elif key == "ActiveEffectLike" and str(rule.get("path", "")).endswith("negativeHealing"):
            lines.append("Лечение пустотой вас лечит, жизненная сила ранит.")
        elif key == "Sense" and rule.get("selector") == "darkvision":
            lines.append("Если у народа уже есть сумеречное зрение, поле поднимает его до тёмного.")
        elif key == "Sense" and rule.get("selector") == "low-light-vision":
            lines.append("Сумеречное зрение.")
        elif key == "Sense" and rule.get("selector") == "scent":
            lines.append(f"Нюх {rule.get('range', 30)} футов, неточный.")
        elif key == "GrantItem":
            picked = (rule.get("preselectChoices") or {}).get("assurance")
            if picked and not str(picked).startswith("{"):
                lines.append(f"«Уверенность» заранее стоит на навыке {SKILL.get(picked, picked)}.")
            elif picked:
                lines.append("«Уверенность» заранее стоит на выбранном навыке.")
    return lines


def main() -> None:
    rows = []
    missing_books = []
    for path in sorted(PACK.glob("*.json")):
        if path.name.startswith("_"):
            continue
        data = json.loads(path.read_text())
        if not isinstance(data, dict):
            continue
        system = data["system"]
        pub = system["publication"]
        if pub.get("license") != "ORC" or pub.get("remaster") is not True:
            continue
        title = pub.get("title") or ""
        if title not in BOOK:
            missing_books.append(title)
            continue
        book_title, source_id, source_version = BOOK[title]
        slug = path.stem
        name = OFFICIAL.get(slug) or OWN.get(slug)
        if not name:
            raise SystemExit(f"нет русского имени: {slug}")
        trained = system.get("trainedSkills") or {}
        skills = [item for item in (trained.get("value") or []) if item in SKILL]
        lores = []
        for lore in trained.get("lore") or []:
            if lore not in LORE:
                raise SystemExit(f"нет перевода знания {lore} у {slug}")
            lores.append(LORE[lore])
        raw_items = system.get("items") or {}
        feat_names = []
        if isinstance(raw_items, dict):
            feat_names.extend(item.get("name") for item in raw_items.values() if item.get("name"))
        skill_choices: list[str] = []
        feat_choices: list[dict] = []
        craft_choices: list[dict] = []
        for rule in system.get("rules") or []:
            if rule.get("key") == "GrantItem":
                raw_uuid = str(rule.get("uuid") or "")
                if "{item|" in raw_uuid:
                    pass
                else:
                    granted = uuid_name(raw_uuid)
                    if granted and granted not in feat_names:
                        feat_names.append(granted)
            if rule.get("key") != "ChoiceSet":
                continue
            choices = rule.get("choices")
            if isinstance(choices, dict) and choices.get("config") == "skills":
                skill_choices = ["*"]
            elif isinstance(choices, list) and choices and "Skill." in str(choices[0].get("label", "")) or (
                isinstance(choices, list) and choices and choices[0].get("value") in SKILL
            ):
                skill_choices = [item["value"] for item in choices if item.get("value") in SKILL]
            elif isinstance(choices, list) and choices and "feats-srd" in str(choices[0].get("value", "")):
                for item in choices:
                    english = uuid_name(item["value"])
                    feat_choices.append({"id": feat_id(english), "name": feat_name(english)})
            elif isinstance(choices, list) and choices and choices[0].get("value") in CRAFT:
                craft_choices = [{"id": item["value"], "name": CRAFT[item["value"]]} for item in choices]
        feats = []
        for english in feat_names:
            if not english:
                continue
            feats.append({"id": feat_id(english), "name": feat_name(english)})
        pools = pools_of(system.get("boosts") or {})
        restricted = [pool for pool in pools if set(pool) != set(ALL)]
        free = [pool for pool in pools if set(pool) == set(ALL)]
        abilities = restricted[0] if restricted else []
        if len(restricted) > 1:
            raise SystemExit(f"несколько ограниченных повышений у {slug}")
        rarity = (system.get("traits") or {}).get("rarity") or "common"
        special = special_lines(system.get("rules") or [], skills)
        if slug == "driver":
            special.append("Имя «Водитель» собрано по смыслу поля. В списке pf2.ru для этой книги стоит «Диверсант», а диверсант в выгрузке относится к ядру игрока 2.")
        elif slug not in OFFICIAL:
            special.append("Имя на экране собрано по словам. Это не изданный перевод.")
        skill_text = ", ".join(SKILL[item] for item in skills) if skills else "поле навыка пустое"
        if skill_choices == ["*"]:
            skill_text = f"{skill_text}; ещё один навык на выбор".replace("поле навыка пустое; ", "")
            if not skills:
                skill_text = "один любой навык на выбор"
        elif skill_choices:
            skill_text = (skill_text + "; " if skills else "") + "один из: " + ", ".join(SKILL[item] for item in skill_choices)
        lore_text = ", ".join(lores) if lores else "отдельного знания нет"
        feat_text = ", ".join(f"«{item['name']}»" for item in feats) if feats else "отдельной черты в поле нет"
        if feat_choices:
            feat_text = "одна из: " + ", ".join(f"«{item['name']}»" for item in feat_choices)
        if abilities and free:
            boost_text = "одно из " + " или ".join(ABILITY_FULL[item] for item in abilities) + f", и ещё {len(free)} свободное"
            if len(free) > 1:
                boost_text = "одно из " + " или ".join(ABILITY_FULL[item] for item in abilities) + f", и ещё {len(free)} свободных"
        elif abilities and not free:
            boost_text = "одно из " + ", ".join(ABILITY_FULL[item] for item in abilities) + ", без второго свободного"
        else:
            boost_text = f"{len(free)} свободных повышения" if len(free) < 5 else f"{len(free)} свободных повышений"
            if len(free) == 1:
                boost_text = "одно свободное повышение"
            elif len(free) in (2, 3, 4):
                boost_text = f"{len(free)} свободных повышения" if len(free) in (2, 3, 4) else boost_text
            # grammar: 2 свободных повышения is wrong (повышения after 2 is ok in Russian: 2 повышения)
            words = {1: "одно свободное повышение", 2: "два свободных повышения", 3: "три свободных повышения"}
            boost_text = words.get(len(free), boost_text)
        hint_bits = []
        if abilities:
            hint_bits.append(" или ".join(ABILITY[item] for item in abilities))
        elif free:
            hint_bits.append({1: "свободное", 2: "два свободных", 3: "три свободных"}.get(len(free), "свободные"))
        if skills:
            hint_bits.append(", ".join(SKILL[item] for item in skills))
        elif skill_choices:
            hint_bits.append("навык на выбор")
        hint_bits.append(book_title)
        if rarity != "common":
            hint_bits.append(RARITY[rarity])
        hint = " · ".join(hint_bits)
        info = (
            f"{name} — происхождение ремастера, книга «{book_title}». "
            f"Редкость: {RARITY.get(rarity, rarity)}. Повышения: {boost_text}. "
            f"Навыки: {skill_text}. Знания: {lore_text}. Черты: {feat_text}. "
            + (" ".join(special) + " " if special else "")
            + "Списки сняты с полей Foundry, лицензия ORC, пометка ремастера. Абзац книги не копировался."
        )
        if "?" in info or "?" in hint or "?" in name:
            raise SystemExit(f"вопрос в карточке {slug}")
        if len(info) < 180:
            raise SystemExit(f"короткая карточка {slug}: {len(info)}")
        rows.append(
            {
                "id": slug,
                "name": name,
                "originalName": data.get("name") or slug,
                "hint": hint,
                "info": info,
                "abilities": abilities,
                "freeBoosts": len(free),
                "skills": skills,
                "skillChoices": skill_choices,
                "lores": lores,
                "feats": feats,
                "featChoices": feat_choices,
                "craftChoices": craft_choices,
                "book": book_title,
                "rarity": rarity,
                "sourceId": source_id,
                "sourceVersion": source_version,
            }
        )
    if missing_books:
        raise SystemExit(f"неизвестные книги: {sorted(set(missing_books))}")
    rows.sort(key=lambda row: row["id"])
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {len(rows)} -> {OUT}")


if __name__ == "__main__":
    main()
