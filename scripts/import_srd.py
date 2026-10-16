#!/usr/bin/env python3
"""Снимает шапки заклинаний и предметов с PDF SRD 5.1 и 5.2.1.

В карточки попадает свой русский пересказ полей (круг, школа, время,
дистанция, компоненты, длительность, кости, спасбросок, редкость).
Английские абзацы книги в текст не копируются.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PDF52 = Path("/tmp/sources/srd-5.2.1.pdf")
PDF51 = Path("/tmp/sources/srd-5.1.pdf")
OUT = ROOT / "src" / "data" / "generated"
SPELL_RU = {k.replace("\u2019", "'"): v for k, v in json.loads((Path(__file__).parent / "ru_spells.json").read_text()).items()}

CHECKED = "2026-10-16"
LINK52 = "https://www.dndbeyond.com/srd"
LINK51 = "https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf"

SCHOOL = {
    "Abjuration": "ограждение",
    "Conjuration": "вызов",
    "Divination": "прорицание",
    "Enchantment": "очарование",
    "Evocation": "воплощение",
    "Illusion": "иллюзия",
    "Necromancy": "некромантия",
    "Transmutation": "преобразование",
}
CLASS_RU = {
    "Bard": "бард",
    "Cleric": "жрец",
    "Druid": "друид",
    "Paladin": "паладин",
    "Ranger": "следопыт",
    "Sorcerer": "чародей",
    "Warlock": "колдун",
    "Wizard": "волшебник",
}
SAVE_RU = {
    "Strength": "Силы",
    "Dexterity": "Ловкости",
    "Constitution": "Телосложения",
    "Intelligence": "Интеллекта",
    "Wisdom": "Мудрости",
    "Charisma": "Харизмы",
}
DMG_RU = {
    "Acid": "кислота",
    "Cold": "холод",
    "Fire": "огонь",
    "Force": "силовое поле",
    "Lightning": "молния",
    "Necrotic": "некротический урон",
    "Poison": "яд",
    "Psychic": "психический урон",
    "Radiant": "излучение",
    "Thunder": "звук",
    "Bludgeoning": "дробящий урон",
    "Piercing": "колющий урон",
    "Slashing": "рубящий урон",
}
AREA_RU = {
    "Sphere": "сфера радиусом {n} футов",
    "Cube": "куб со стороной {n} футов",
    "Cone": "конус {n} футов",
    "Line": "линия {n} футов",
    "Cylinder": "цилиндр {n} футов",
    "Emanation": "эманация {n} футов",
}
SMALL = {"of", "the", "and", "or", "with", "without", "via", "to", "in", "on", "a", "from", "into"}
ID_ALIAS = {
    "spare-the-dying": "spare-dying",
    "speak-with-animals": "speak-animals",
}

# Слова названий магических предметов. Форма уже та, что стоит в русском имени.
ITEM_WORDS = {
    "acid": "кислоты",
    "action": "действия",
    "adamantine": "адамантина",
    "agility": "ловкости",
    "alchemy": "алхимии",
    "amulet": "амулет",
    "ammunition": "боеприпас",
    "animal": "животного",
    "animating": "оживления",
    "apparatus": "аппарат",
    "armor": "доспех",
    "arrow": "стрела",
    "arrows": "стрелы",
    "astral": "астральный",
    "awareness": "бдительности",
    "axe": "топор",
    "bag": "сумка",
    "ball": "шар",
    "bead": "бусина",
    "belt": "пояс",
    "berserker": "берсерка",
    "binding": "связывания",
    "blasting": "взрыва",
    "blessed": "благословенный",
    "blindfold": "повязка",
    "boots": "сапоги",
    "bowl": "чаша",
    "bracers": "браслеты",
    "brazier": "жаровня",
    "brooch": "брошь",
    "broom": "метла",
    "candle": "свеча",
    "cape": "накидка",
    "carpet": "ковёр",
    "censer": "кадило",
    "chime": "колокольчик",
    "circlet": "венец",
    "cloak": "плащ",
    "commanding": "повелевания",
    "controlling": "управления",
    "crystal": "кристалл",
    "cube": "куб",
    "dagger": "кинжал",
    "dancing": "танцующий",
    "decanter": "графин",
    "deck": "колода",
    "defender": "защитник",
    "demon": "демона",
    "detection": "обнаружения",
    "dimensional": "межпространственный",
    "displacing": "смещения",
    "dragon": "дракона",
    "dust": "пыль",
    "dwarven": "дворфийский",
    "efficiency": "эффективности",
    "elemental": "стихии",
    "elven": "эльфийский",
    "endless": "бесконечный",
    "energy": "энергии",
    "eyes": "глаза",
    "feather": "перо",
    "figurine": "статуэтка",
    "fire": "огня",
    "flame": "пламени",
    "flying": "полёта",
    "folding": "складная",
    "force": "силы",
    "fortitude": "стойкости",
    "frost": "мороза",
    "gauntlets": "рукавицы",
    "gem": "камень",
    "giant": "великана",
    "gloves": "перчатки",
    "goggles": "очки",
    "greater": "большое",
    "hammer": "молот",
    "hat": "шляпа",
    "headband": "обруч",
    "healing": "лечения",
    "helm": "шлем",
    "holding": "хранения",
    "holy": "святой",
    "horn": "рог",
    "horseshoes": "подковы",
    "immovable": "неподвижный",
    "instant": "мгновенная",
    "intellect": "интеллекта",
    "invisibility": "невидимости",
    "invulnerability": "неуязвимости",
    "ioun": "иун",
    "iron": "железа",
    "javelin": "дротик",
    "jug": "кувшин",
    "klwalish": "клвалиша",
    "lantern": "фонарь",
    "leadership": "лидерства",
    "lightning": "молнии",
    "location": "местонахождения",
    "luck": "удачи",
    "mace": "булава",
    "manual": "учебник",
    "many": "много",
    "marvelous": "чудесных",
    "medallion": "медальон",
    "mirror": "зеркало",
    "mithral": "мифрил",
    "necklace": "ожерелье",
    "night": "ночи",
    "nine": "девяти",
    "oar": "весло",
    "of": "",
    "ogre": "огра",
    "oil": "масло",
    "opening": "открывания",
    "pearl": "жемчужина",
    "periapt": "оберег",
    "philter": "фильтр",
    "pigments": "пигменты",
    "pipes": "дудки",
    "plate": "латы",
    "poison": "яда",
    "portable": "переносная",
    "potion": "зелье",
    "power": "силы",
    "proof": "защиты",
    "protection": "защиты",
    "quiver": "колчан",
    "regeneration": "регенерации",
    "resistance": "сопротивления",
    "restorative": "восстановления",
    "ring": "кольцо",
    "robe": "одеяние",
    "rod": "жезл",
    "rope": "верёвка",
    "scarab": "скарабей",
    "scimitar": "скимитар",
    "shield": "щит",
    "slippers": "туфли",
    "sovereign": "всеисцеляющий",
    "speed": "скорости",
    "spellguard": "страж заклинаний",
    "sphere": "сфера",
    "spider": "паука",
    "staff": "посох",
    "stone": "камень",
    "strength": "силы",
    "superior": "высшее",
    "supreme": "величайшее",
    "sword": "меч",
    "talisman": "талисман",
    "thoughts": "мыслей",
    "thunder": "грома",
    "tome": "том",
    "trident": "трезубец",
    "useful": "полезных",
    "vanishing": "исчезновения",
    "venom": "яда",
    "vitality": "живучести",
    "wand": "жезл",
    "warmth": "тепла",
    "water": "воды",
    "weapon": "оружие",
    "well": "колодец",
    "wind": "ветра",
    "wings": "крылья",
    "wondrous": "чудесной",
    "wound": "ран",
    "health": "здоровья",
    "life": "жизни",
    "climbing": "лазания",
    "levitation": "левитации",
    "swimming": "плавания",
    "elvenkind": "эльфийского рода",
    "displacement": "смещения",
    "etherealness": "эфирности",
    "feathered": "перьев",
    "slaying": "убийства",
    "warning": "предупреждения",
    "seeing": "видения",
    "comprehending": "понимания",
    "languages": "языков",
    "storing": "хранения",
    "striking": "ражения",
    "the": "",
    "and": "и",
    "or": "или",
    "with": "с",
    "against": "против",
    "from": "от",
    "into": "в",
    "planes": "планов",
    "command": "команды",
    "spell": "заклинания",
    "spells": "заклинаний",
    "magic": "магии",
    "missile": "снаряда",
    "missiles": "снарядов",
    "fireball": "огненного шара",
    "fireballs": "огненных шаров",
    "absorption": "поглощения",
    "reflection": "отражения",
    "cancellation": "отмены",
    "enemy": "врага",
    "detection": "обнаружения",
    "location": "места",
    "mind": "разума",
    "shielding": "ограждения",
    "shooting": "стрельбы",
    "stars": "звёзд",
    "returning": "возвращения",
    "seeking": "поиска",
    "wounding": "ранения",
    "disruption": "разрушения",
    "answering": "ответов",
    "lordly": "владыки",
    "might": "могущества",
    "terror": "ужаса",
    "thunderbolts": "громовых стрел",
    "rulership": "владычества",
    "security": "безопасности",
    "passage": "прохода",
    "pact": "договора",
    "fiend": "исчадия",
    "python": "питона",
    "viper": "гадюки",
    "adder": "аспида",
    "swarm": "роя",
    "insects": "насекомых",
    "wonder": "чудес",
    "illusion": "иллюзий",
    "many": "множества",
    "things": "вещей",
    "usefulness": "пользы",
    "folding": "складывания",
    "boat": "лодки",
    "hole": "дыры",
    "portable": "переносная",
    "hole": "нора",
    "extra": "дополнительное",
    "dimensional": "межпространственная",
    "spaces": "пространств",
    "shackles": "оковы",
    "dimensional": "межпространственные",
    "shackles": "кандалы",
}
ITEM_WORDS.update({
    "acrobat": "акробата", "adaptation": "адаптации", "air": "воздуха", "alertness": "бдительности",
    "animated": "оживлённый", "annihilation": "уничтожения", "arachnida": "пауков", "archery": "стрельбы",
    "archmagi": "архимагов", "attraction": "притяжения", "avenger": "мстителя", "bands": "обручи",
    "bat": "мыши", "beads": "бусин", "beans": "бобов", "blade": "клинок", "bodily": "тела",
    "bolts": "стрел", "bottle": "бутыль", "bow": "лук", "brand": "клейма", "breathing": "дыхания",
    "brightness": "яркости", "brilliance": "блеска", "catching": "ловли", "cavalier": "кавалера",
    "chain": "цепи", "charming": "очарования", "choking": "удушения", "clairvoyance": "ясновидения",
    "clear": "ясной", "closure": "закрытия", "colors": "цветов", "crab": "краба", "cubic": "кубические",
    "cure": "лечения", "defense": "защиты", "devouring": "пожирания", "diminution": "уменьшения",
    "disappearance": "исчезновения", "disguise": "маскировки", "djinni": "джинна", "dryness": "сухости",
    "dwarvenkind": "дворфийского рода", "eagle": "орла", "earth": "земли", "efficient": "эффективный",
    "efreeti": "ифрита", "elementals": "элементалей", "elixir": "эликсир", "entanglement": "опутывания",
    "evasion": "уклонения", "eversmoking": "вечнодымящаяся", "evil": "зла", "exercise": "упражнения",
    "falling": "падения", "fan": "веер", "fear": "страха", "fish": "рыб", "flask": "фляга",
    "form": "формы", "fortress": "крепости", "free": "свободного", "friendship": "дружбы",
    "gainful": "прибыли", "gaseous": "газообразной", "gate": "врат", "glamoured": "чарующий",
    "glue": "клей", "golems": "големов", "good": "добра", "greatclub": "дубина", "growth": "роста",
    "handy": "подручная", "haunting": "наваждения", "haversack": "ранец", "heroism": "героизма",
    "hold": "удержания", "ice": "льда", "illusions": "иллюзий", "influence": "влияния",
    "insect": "насекомого", "invocation": "призыва", "items": "предметов", "jumping": "прыжков",
    "leather": "кожаный", "legendary": "легендарное", "lives": "жизней", "longevity": "долголетия",
    "love": "любви", "magi": "магов", "mail": "кольчуга", "manta": "ската", "mantle": "мантия",
    "mass": "массы", "minute": "минуты", "mountebank": "шарлатана", "mysterious": "таинственный",
    "nourishment": "питания", "oathbow": "лук клятвы", "orb": "сфера", "paralysis": "паралича",
    "person": "личности", "plague": "чумы", "polymorph": "превращения", "prayer": "молитвы",
    "pure": "чистого", "quarterstaff": "посох", "quickness": "быстроты", "ram": "тарана",
    "rare": "редкий", "rarity": "редкости", "ray": "лучей", "reading": "чтения",
    "resurrection": "воскрешения", "revealing": "раскрытия", "scale": "чешуи",
    "scintillating": "сверкающих", "secrets": "тайн", "sending": "послания", "sentinel": "стража",
    "sewers": "стоков", "sharpness": "остроты", "slayer": "убийцы", "slipperiness": "скользкости",
    "smiting": "кары", "snaring": "ловли", "sneezing": "чихания", "solvent": "растворитель",
    "spinel": "шпинель", "springing": "прыжка", "stealer": "похититель", "stealing": "кражи",
    "stones": "камней", "striding": "шага", "studded": "клёпаный", "summoning": "призыва",
    "sun": "солнца", "swarming": "роящихся", "telekinesis": "телекинеза", "telepathy": "телепатии",
    "teleportation": "телепортации", "thievery": "воровства", "thorns": "шипов", "thought": "мысли",
    "three": "трёх", "thrower": "метатель", "thunderous": "громовой", "tongue": "языка",
    "trapping": "ловушек", "tricks": "фокусов", "true": "истинного", "turning": "отражения",
    "ultimate": "высшего", "understanding": "понимания", "universal": "универсальный",
    "valhalla": "вальхаллы", "very": "очень", "vicious": "жестокое", "vision": "зрения",
    "vorpal": "ворпальный", "vulnerability": "уязвимости", "walking": "хождения", "wall": "стены",
    "web": "паутины", "winged": "крылатые", "winterlands": "зимних земель", "wishes": "желаний",
    "withering": "увядания", "woodlands": "лесов", "worlds": "миров", "wounds": "ран",
    "x": "рентгеновского", "zephyr": "зефира",
    "dragonkind": "драконьего рода", "ointment": "мазь", "potions": "зелий",
    "scroll": "свиток", "token": "знак",
})


def clean_text(value: str) -> str:
    value = value.replace("\r", " ").replace("\t", " ").replace("\xa0", " ").replace("\u2019", "'")
    for ch in ["\u00ad", "‐", "‑", "–", "—", "\u2011"]:
        value = value.replace(ch, "-")
    value = re.sub(r"-{2,}", "-", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def page_lines(page: pymupdf.Page) -> list[str]:
    data = page.get_text("dict")
    mid = page.rect.width / 2
    cols: list[list[tuple[float, str]]] = [[], []]
    for block in data["blocks"]:
        if block.get("type") != 0:
            continue
        x0, y0, x1, y1 = block["bbox"]
        if y0 > page.rect.height - 34:
            continue
        lines = []
        for line in block["lines"]:
            text = clean_text("".join(span["text"] for span in line["spans"]))
            if text:
                lines.append(text)
        if not lines:
            continue
        cols[0 if (x0 + x1) / 2 < mid else 1].append((y0, "\n".join(lines)))
    out: list[str] = []
    for col in cols:
        col.sort()
        for _, blob in col:
            for line in blob.splitlines():
                line = clean_text(line)
                if not line or line.startswith("System Reference Document") or re.fullmatch(r"\d+", line):
                    continue
                out.append(line)
    return out


def collect(path: Path, start: int, end: int) -> list[str]:
    doc = pymupdf.open(path)
    lines: list[str] = []
    for index in range(start - 1, min(end, doc.page_count)):
        lines.extend(page_lines(doc[index]))
    return lines


def is_name(line: str) -> bool:
    if any(ch in line for ch in ",.;:•●()[]"):
        return False
    if any(ch.isdigit() for ch in line):
        return False
    words = line.split()
    if not 1 <= len(words) <= 8:
        return False
    for word in words:
        if word.lower() in SMALL:
            continue
        if not word[:1].isupper():
            return False
        if not re.fullmatch(r"[A-Za-z'/\-]+", word):
            return False
    return True


def slug(name: str) -> str:
    text = name.lower().replace("'", "")
    text = text.replace("/", " ")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return ID_ALIAS.get(text, text)


STAT_LABELS = ("Casting Time:", "Range:", "Components:", "Duration:")


def read_stats(lines: list[str], start: int, is_meta) -> tuple[str, str, str, str, int]:
    """Собирает шапку, даже если поля склеились в одну строку."""
    blob = ""
    pos = start
    while pos < len(lines) and not is_meta(lines[pos]):
        blob += " " + lines[pos]
        pos += 1
        if "Duration:" in blob and blob.count("(") <= blob.count(")"):
            # ещё одна строка, если длительность оборвана на полуслове, не нужна
            break
        if pos - start > 8:
            break
    found: dict[str, str] = {}
    spots = []
    for label in STAT_LABELS:
        idx = blob.find(label)
        if idx >= 0:
            spots.append((idx, label))
    spots.sort()
    for i, (idx, label) in enumerate(spots):
        end = spots[i + 1][0] if i + 1 < len(spots) else len(blob)
        found[label] = blob[idx + len(label) : end].strip(" .")
    return found.get("Casting Time:", ""), found.get("Range:", ""), found.get("Components:", ""), found.get("Duration:", ""), pos


LEVEL52 = re.compile(r"^(Level (\d+) ([A-Za-z]+)|([A-Za-z]+) Cantrip) \((.*)$")
LEVEL51 = re.compile(r"^(\d)(st|nd|rd|th)-level ([A-Za-z]+)(?: \(ritual\))?$")
CANT51 = re.compile(r"^([A-Za-z]+) cantrip$")


def spell_name_before(lines: list[str], index: int) -> str:
    name = lines[index - 1]
    first = name.split()[0].lower() if name.split() else ""
    if first in {"and", "or", "of", "with", "without", "from", "into", "to"} and index >= 2:
        name = f"{lines[index - 2]} {name}"
    return name


def parse_spells_52(lines: list[str]) -> list[dict]:
    indexes = [i for i, line in enumerate(lines) if LEVEL52.match(line)]
    spells = []
    for nth, index in enumerate(indexes):
        name = spell_name_before(lines, index)
        if not is_name(name):
            continue
        match = LEVEL52.match(lines[index])
        assert match
        if match.group(2):
            level = int(match.group(2))
            school = match.group(3)
        else:
            level = 0
            school = match.group(4)
        classes = match.group(5)
        cursor = index + 1
        while cursor < len(lines) and not lines[cursor].startswith("Casting Time"):
            classes += " " + lines[cursor]
            cursor += 1
            if cursor - index > 4:
                break
        classes = classes.split(")")[0]
        ritual = "ritual" in lines[index].lower()
        time, rng, comp, duration, cursor = read_stats(lines, cursor, lambda line: bool(LEVEL52.match(line)))
        if "ritual" in time.lower():
            ritual = True
        end = indexes[nth + 1] - 1 if nth + 1 < len(indexes) else min(len(lines), cursor + 40)
        body = " ".join(lines[cursor:end])
        if "or Ritual" in time or "Ritual" in time:
            ritual = True
        spells.append(dict(name=name, level=level, school=school, classes=classes, time=time, range=rng, components=comp, duration=duration, body=body, ritual=ritual))
    return spells


def parse_spells_51(lines: list[str]) -> list[dict]:
    indexes = [i for i, line in enumerate(lines) if LEVEL51.match(line) or CANT51.match(line)]
    spells = []
    for nth, index in enumerate(indexes):
        name = spell_name_before(lines, index)
        if not is_name(name):
            continue
        meta = lines[index]
        ritual = "(ritual)" in meta.lower()
        match = LEVEL51.match(meta)
        if match:
            level = int(match.group(1))
            school = match.group(3).title()
        else:
            cant = CANT51.match(meta)
            assert cant
            level = 0
            school = cant.group(1).title()
        cursor = index + 1
        time, rng, comp, duration, cursor = read_stats(lines, cursor, lambda line: bool(LEVEL51.match(line) or CANT51.match(line)))
        if "ritual" in time.lower():
            ritual = True
        end = indexes[nth + 1] - 1 if nth + 1 < len(indexes) else min(len(lines), cursor + 50)
        body = " ".join(lines[cursor:end])
        spells.append(dict(name=name, level=level, school=school, classes="", time=time, range=rng, components=comp, duration=duration, body=body, ritual=ritual))
    return spells


def class_lists(lines: list[str]) -> dict[str, set[str]]:
    found: dict[str, set[str]] = defaultdict(set)
    current = ""
    for line in lines:
        match = re.match(r"^(Bard|Cleric|Druid|Paladin|Ranger|Sorcerer|Warlock|Wizard) Spells$", line)
        if match:
            current = match.group(1)
            continue
        if not current:
            continue
        if line.startswith("Cantrips") or re.match(r"^\d(st|nd|rd|th) Level$", line):
            continue
        spell = re.sub(r"\s*\(ritual\)$", "", line, flags=re.I).strip()
        if is_name(spell):
            found[spell].add(current)
    return found


def ru_time(value: str) -> str:
    text = value.lower()
    ritual = ", можно как ритуал" if "ritual" in text else ""
    known = [
        "1 bonus action", "bonus action", "1 reaction", "reaction", "1 action", "action",
        "10 minutes", "1 minute", "1 hour", "8 hours", "12 hours", "24 hours", "1 round",
    ]
    for key in known:
        if key in text:
            base = {
                "1 bonus action": "бонусное действие",
                "bonus action": "бонусное действие",
                "1 reaction": "реакция",
                "reaction": "реакция",
                "1 action": "действие",
                "action": "действие",
                "10 minutes": "10 минут",
                "1 minute": "1 минута",
                "1 hour": "1 час",
                "8 hours": "8 часов",
                "12 hours": "12 часов",
                "24 hours": "24 часа",
                "1 round": "1 раунд",
            }[key]
            return base + ritual
    return "время из шапки не разобрано"


def ru_range(value: str) -> str:
    text = value.strip()
    low = text.lower()
    if low in {"self", "self (see below)"}:
        return "на себя"
    if low == "touch":
        return "касание"
    if low == "unlimited":
        return "без ограничения"
    if low == "sight":
        return "в пределах видимости"
    match = re.match(r"^(\d[\d,]*) feet$", text, re.I)
    if match:
        return f"{match.group(1).replace(',', '')} футов"
    match = re.match(r"^(\d[\d,]*) miles?$", text, re.I)
    if match:
        return f"{match.group(1)} миль"
    if "touch" in low:
        return "касание"
    if "self" in low:
        return "на себя"
    feet = re.search(r"(\d[\d,]*) feet", text, re.I)
    if feet:
        return f"{feet.group(1).replace(',', '')} футов"
    return "дистанция из шапки"


def ru_duration(value: str) -> str:
    low = value.lower()
    concentration = "концентрация" in low or "concentration" in low
    spans = [
        ("24 hours", "24 часа"),
        ("8 hours", "8 часов"),
        ("12 hours", "12 часов"),
        ("1 hour", "1 час"),
        ("10 minutes", "10 минут"),
        ("1 minute", "1 минута"),
        ("10 days", "10 дней"),
        ("7 days", "7 дней"),
        ("30 days", "30 дней"),
        ("1 day", "1 день"),
        ("1 round", "1 раунд"),
        ("6 rounds", "6 раундов"),
        ("until dispelled", "пока не рассеют"),
        ("instantaneous", "мгновенно"),
        ("special", "особая"),
        ("triggered", "пока руну не сорвут"),
    ]
    found = ""
    for src, dst in spans:
        if re.search(rf"(?<!\d){re.escape(src)}\b", low):
            found = dst
            break
    genitive = {"1 час": "1 часа", "1 минута": "1 минуты", "1 день": "1 дня", "1 раунд": "1 раунда", "24 часа": "24 часов"}
    if concentration and found:
        span = genitive.get(found, found)
        return f"концентрация, до {span}" if not span.startswith("пока") else f"концентрация, {span}"
    if concentration:
        return "концентрация"
    return found or "длительность из шапки"


def ru_components(value: str) -> str:
    parts = []
    if re.search(r"\bV\b", value):
        parts.append("словесный")
    if re.search(r"\bS\b", value):
        parts.append("соматический")
    if re.search(r"\bM\b", value):
        cost = re.search(r"(\d[\d,]*)\s*\+?\s*(?:GP|gp)", value)
        if cost:
            number = cost.group(1).replace(",", "")
            spent = "расходуется" if re.search(r"consum", value, re.I) else "не расходуется"
            parts.append(f"материальный на {number} зм, {spent}")
        else:
            parts.append("материальный")
    if not parts:
        return "без компонентов в шапке"
    if len(parts) == 1:
        return parts[0]
    return ", ".join(parts[:-1]) + " и " + parts[-1]


def higher_note(body: str) -> str:
    notes = []
    higher = ""
    for marker in ("Using a Higher-Level Spell Slot", "At Higher Levels"):
        if marker in body:
            higher = body.split(marker, 1)[1]
            break
    if higher:
        dice = re.search(r"increases by (\d+d\d+(?:\s*\+\s*\d+)?)", higher, re.I)
        if dice:
            notes.append(f"За каждый круг ячейки выше базового прибавка {dice.group(1).replace(' ', '')}.")
        temp = re.search(r"(\d+) additional Temporary Hit Points", higher, re.I)
        if temp:
            notes.append(f"За каждый круг ячейки выше базового ещё {temp.group(1)} временных хитов.")
        extra = re.search(r"one additional (?:creature|target|humanoid|beast)", higher, re.I)
        if extra:
            notes.append("За каждый круг ячейки выше базового можно взять ещё одну цель.")
    cantrip = ""
    if "Cantrip Upgrade" in body:
        cantrip = body.split("Cantrip Upgrade", 1)[1]
    match = re.search(r"increases by (\d+d\d+).*?levels (\d+).*?\((\d+d\d+)\).*?(\d+).*?\((\d+d\d+)\).*?(\d+).*?\((\d+d\d+)\)", cantrip or body, re.I)
    if match and "Cantrip Upgrade" in body:
        notes.append(f"На 5, 11 и 17 уровнях кости становятся {match.group(3)}, {match.group(5)} и {match.group(7)}.")
    return " ".join(notes)


def spell_card(spell: dict, version: str, classes: list[str]) -> dict:
    name = spell["name"].replace("\u2019", "'")
    ru = SPELL_RU[name]
    school = SCHOOL[spell["school"]]
    rank = "заговор" if spell["level"] == 0 else f"{spell['level']}-й круг"
    lists = ", ".join(CLASS_RU[item] for item in classes) if classes else "в шапке списки не указаны"
    time = ru_time(spell["time"])
    rng = ru_range(spell["range"])
    duration = ru_duration(spell["duration"])
    components = ru_components(spell["components"])
    body = spell["body"]
    saves = []
    for ability in SAVE_RU:
        if re.search(rf"{ability} saving throw", body):
            saves.append(SAVE_RU[ability])
    attack = ""
    if re.search(r"ranged spell attack", body, re.I):
        attack = "Дальняя атака заклинанием."
    elif re.search(r"melee spell attack", body, re.I):
        attack = "Атака заклинанием ближнего боя."
    dice = []
    for found in re.findall(r"\d+d\d+(?:\s*\+\s*\d+)?", body):
        token = re.sub(r"\s+", "", found)
        if token not in dice:
            dice.append(token)
        if len(dice) == 6:
            break
    damages = []
    for kind, label in DMG_RU.items():
        if re.search(rf"\b{kind}\b", body) and label not in damages:
            damages.append(label)
    areas = []
    for match in re.finditer(r"(\d+)-foot(?:-radius)? (Sphere|Cube|Cone|Line|Cylinder|Emanation)", body):
        areas.append(AREA_RU[match.group(2)].format(n=match.group(1)))
    for match in re.finditer(r"(\d+)-foot square", body):
        areas.append(f"квадрат со стороной {match.group(1)} футов")
    half = " Успех спасброска оставляет половину." if saves and re.search(r"half as much", body, re.I) else ""
    bits = [f"{ru}. {rank.capitalize()}, школа {school}."]
    bits.append(f"Время: {time}. Дистанция: {rng}. Компоненты: {components}. Длительность: {duration}.")
    bits.append(f"Списки: {lists}.")
    if attack:
        bits.append(attack)
    if saves:
        bits.append("Спасбросок " + " или ".join(saves) + "." + half)
    if dice:
        bits.append("Кости, которые стоят в описании этого заклинания: " + ", ".join(dice) + ".")
    if damages:
        bits.append("Виды урона в описании: " + ", ".join(damages) + ".")
    if areas:
        bits.append("Область: " + "; ".join(areas[:3]) + ".")
    scaling = higher_note(body)
    if scaling:
        bits.append(scaling)
    bits.append("В расчёт атаки и хитов листа это заклинание само не входит.")
    text = " ".join(bits)
    short_bits = [rank, school]
    if saves:
        short_bits.append("спасбросок " + saves[0])
    elif attack:
        short_bits.append("атака заклинанием")
    short = f"{ru}: " + ", ".join(short_bits) + f". {time}, {rng}, {duration}."
    location = f"SRD {version}, заклинание {rank}"
    return {
        "id": slug(name),
        "name": ru,
        "originalName": name,
        "altNames": [],
        "category": "spell",
        "categoryTitle": "Заклинание",
        "rank": spell["level"],
        "short": short,
        "text": text,
        "sourceId": "srd-5.2" if version == "5.2.1" else "srd-5.1",
        "prereq": "",
        "location": location,
        "link": LINK52 if version == "5.2.1" else LINK51,
        "status": "verified-reference",
        "checkedOn": CHECKED,
        "sourceVersion": version,
    }


TYPE_LINE = re.compile(r"^(Armor|Weapon|Wondrous Item|Potion|Ring|Rod|Staff|Wand|Scroll)\b", re.I)
RARITY_RE = re.compile(r"\b(very rare|uncommon|common|legendary|artifact|rarity varies|rare)\b", re.I)
RARITY_RU = {
    "common": "обычный",
    "uncommon": "необычный",
    "rare": "редкий",
    "very rare": "очень редкий",
    "legendary": "легендарный",
    "artifact": "артефакт",
    "rarity varies": "редкость разная",
}
KIND_RU = {
    "Armor": "доспех",
    "Weapon": "оружие",
    "Wondrous Item": "чудесный предмет",
    "Potion": "зелье",
    "Ring": "кольцо",
    "Rod": "жезл",
    "Staff": "посох",
    "Wand": "волшебная палочка",
    "Scroll": "свиток",
}


def normalize_key(name: str) -> str:
    return name.replace("\u2019", "'")


def ru_item_name(name: str, missing: set[str]) -> str | None:
    # «+1, +2 или +3» оставляем числами.
    cleaned = normalize_key(name)
    cleaned = cleaned.replace("+1, +2, or +3", "+1, +2 или +3")
    cleaned = re.sub(r"\+\s*(\d)", r"+\1", cleaned)
    words = re.findall(r"\+[0-9]|[A-Za-z']+|[^A-Za-z'+]+", cleaned)
    out = []
    ok = True
    for word in words:
        if word.startswith("+") or not re.search(r"[A-Za-z]", word):
            out.append(word)
            continue
        key = word.lower().strip("'")
        if key in ITEM_WORDS:
            if ITEM_WORDS[key]:
                out.append(ITEM_WORDS[key])
        elif key in {"a", "an"}:
            continue
        else:
            missing.add(key)
            ok = False
    if not ok:
        return None
    text = "".join(out)
    text = re.sub(r"\s+", " ", text).strip(" ,")
    if not text:
        return None
    return text[:1].upper() + text[1:]


def parse_items(lines: list[str]) -> list[dict]:
    indexes = []
    for i, line in enumerate(lines):
        if TYPE_LINE.match(line) and RARITY_RE.search(line + " " + (lines[i + 1] if i + 1 < len(lines) else "")):
            indexes.append(i)
    items = []
    for nth, index in enumerate(indexes):
        header = lines[index]
        extra = ""
        if not RARITY_RE.search(header) and index + 1 < len(lines):
            extra = " " + lines[index + 1]
        blob = header + extra
        rarities = [item.lower() for item in RARITY_RE.findall(blob)]
        if not rarities or header.lower().startswith("armor class"):
            continue
        kind = TYPE_LINE.match(header).group(1).title()
        if kind.lower() == "wondrous item":
            kind = "Wondrous Item"
        name_parts = []
        cursor = index - 1
        while cursor >= 0 and len(name_parts) < 3 and is_name(lines[cursor]):
            name_parts.append(lines[cursor])
            cursor -= 1
            if name_parts and name_parts[-1].split()[0].lower() not in SMALL and not lines[cursor + 1].split()[0].lower() in {"and", "or", "of", "with"}:
                # только свёрнутое название: вторая строка нужна, если текущая начинается со служебного слова
                if len(name_parts) == 1:
                    break
        if len(name_parts) > 1 and name_parts[0].split()[0].lower() not in {"and", "or", "of", "with", "without", "from"}:
            name_parts = name_parts[:1]
        name_parts.reverse()
        if not name_parts:
            continue
        name = " ".join(name_parts)
        if name in {"Magic Items", "Magic Items A-Z", "Sentient Magic Items"} or name.lower() in RARITY_RU:
            continue
        end = indexes[nth + 1] - 1 if nth + 1 < len(indexes) else min(len(lines), index + 30)
        body_start = index + (2 if extra else 1)
        body = " ".join(lines[body_start:end])
        items.append(dict(name=name, kind=kind, rarities=rarities, attune="Requires Attunement" in blob or "requires attunement" in blob.lower(), body=body))
    # одинаковые имена подряд — оставляем первое
    seen = set()
    unique = []
    for item in items:
        if item["name"] in seen:
            continue
        seen.add(item["name"])
        unique.append(item)
    return unique


def item_card(item: dict, version: str, missing: set[str]) -> dict | None:
    ru = ru_item_name(item["name"], missing)
    if not ru:
        return None
    rarities = ", ".join(RARITY_RU[r] for r in item["rarities"] if r in RARITY_RU)
    kind = KIND_RU.get(item["kind"], "предмет")
    attune = " Нужна настройка." if item["attune"] else " Настройка в шапке не требуется."
    dice = []
    for found in re.findall(r"\d+d\d+(?:\s*\+\s*\d+)?", item["body"]):
        token = re.sub(r"\s+", "", found)
        if token not in dice:
            dice.append(token)
        if len(dice) == 5:
            break
    ability = re.search(r"Your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) (?:score )?is (\d+)", item["body"])
    bonus = re.search(r"\+(\d) bonus to (?:attack rolls and damage rolls|Armor Class|saving throws)", item["body"])
    heal = re.search(r"regain (\d+d\d+(?:\s*\+\s*\d+)?) Hit Points", item["body"], re.I)
    facts = []
    if ability:
        facts.append(f"Пока предмет надет, {SAVE_RU[ability.group(1)].replace('ы', 'е').replace('а', 'е') if False else {'Strength':'Сила','Dexterity':'Ловкость','Constitution':'Телосложение','Intelligence':'Интеллект','Wisdom':'Мудрость','Charisma':'Харизма'}[ability.group(1)]} равна {ability.group(2)}.")
    if heal:
        facts.append(f"Глоток возвращает {re.sub(r'\\s+', '', heal.group(1))} хитов.")
    if bonus:
        facts.append(f"В описании указан бонус +{bonus.group(1)}.")
    if dice:
        facts.append("Кости в описании: " + ", ".join(dice) + ".")
    text = f"{ru}. {kind.capitalize()}, редкость: {rarities}.{attune} " + " ".join(facts) + " Полный абзац предмета в карточку не переписан: здесь шапка и числа, снятые с этого описания. В расчёт листа предмет сам не входит."
    short = f"{ru}: {kind}, {rarities}." + (" Настройка." if item["attune"] else "")
    if heal:
        short += f" Лечение {re.sub(r'\\s+', '', heal.group(1))}."
    source = "srd-5.2" if version == "5.2.1" else "srd-5.1"
    return {
        "id": "magic-" + slug(item["name"]),
        "name": ru,
        "originalName": item["name"].replace("\u2019", "'"),
        "altNames": [],
        "category": "item",
        "categoryTitle": "Магический предмет",
        "rank": None,
        "short": short,
        "text": text,
        "sourceId": source,
        "prereq": "",
        "location": f"SRD {version}, магические предметы",
        "link": LINK52 if version == "5.2.1" else LINK51,
        "status": "verified-partial",
        "checkedOn": CHECKED,
        "sourceVersion": version,
    }


CLASSES_2014 = [
    ("barbarian", "Варвар", "Barbarian", 12, "Путь берсерка", "Path of the Berserker", "Сила", "Сила и Телосложение"),
    ("bard", "Бард", "Bard", 8, "Коллегия знаний", "College of Lore", "Харизма", "Ловкость и Харизма"),
    ("cleric", "Жрец", "Cleric", 8, "Домен жизни", "Life Domain", "Мудрость", "Мудрость и Харизма"),
    ("druid", "Друид", "Druid", 8, "Круг земли", "Circle of the Land", "Мудрость", "Интеллект и Мудрость"),
    ("fighter", "Воин", "Fighter", 10, "Чемпион", "Champion", "Сила или Ловкость", "Сила и Телосложение"),
    ("monk", "Монах", "Monk", 8, "Путь открытой ладони", "Way of the Open Hand", "Ловкость и Мудрость", "Сила и Ловкость"),
    ("paladin", "Паладин", "Paladin", 10, "Клятва преданности", "Oath of Devotion", "Сила и Харизма", "Мудрость и Харизма"),
    ("ranger", "Следопыт", "Ranger", 10, "Охотник", "Hunter", "Ловкость и Мудрость", "Сила и Ловкость"),
    ("rogue", "Плут", "Rogue", 8, "Вор", "Thief", "Ловкость", "Ловкость и Интеллект"),
    ("sorcerer", "Чародей", "Sorcerer", 6, "Драконья кровь", "Draconic Bloodline", "Харизма", "Телосложение и Харизма"),
    ("warlock", "Колдун", "Warlock", 8, "Исчадие", "The Fiend", "Харизма", "Мудрость и Харизма"),
    ("wizard", "Волшебник", "Wizard", 6, "Школа воплощения", "School of Evocation", "Интеллект", "Интеллект и Мудрость"),
]


def class_cards(blob: str) -> list[dict]:
    cards = []
    for cid, ru, en, die, sub_ru, sub_en, primary, saves in CLASSES_2014:
        phrase = f"1d{die} per {en.lower()} level"
        if phrase not in blob.lower():
            raise SystemExit(f"в SRD 5.1 нет кости {phrase}")
        if sub_en.lower() not in blob.lower():
            raise SystemExit(f"в SRD 5.1 нет подкласса {sub_en}")
        text = (
            f"{ru}. Кость хитов 1d{die} за каждый уровень: это число есть в открытом справочнике 5.1. "
            f"Подкласс этого выпуска: {sub_ru}, его имя тоже есть в том тексте. "
            f"Основную характеристику и спасброски отдельной строкой в этот проход не снимали, в расчёт они не идут. "
            f"Конструктор класс 2014 года пока не выбирает."
        )
        cards.append({
            "id": cid,
            "name": ru,
            "originalName": en,
            "altNames": [],
            "category": "class",
            "categoryTitle": "Класс",
            "rank": None,
            "short": f"{ru}, кость 1d{die}. Подкласс справочника: {sub_ru}.",
            "text": text,
            "sourceId": "srd-5.1",
            "prereq": "",
            "location": "SRD 5.1, классы",
            "link": LINK51,
            "status": "verified-partial",
            "checkedOn": CHECKED,
            "sourceVersion": "5.1",
        })
        cards.append({
            "id": f"{cid}-sub",
            "name": sub_ru,
            "originalName": sub_en,
            "altNames": [],
            "category": "subclass",
            "categoryTitle": "Подкласс",
            "rank": 3,
            "short": f"Подкласс «{ru}» в справочнике 5.1: {sub_ru}.",
            "text": f"{sub_ru}. Это подкласс класса «{ru}» в открытом справочнике 5.1. Имя есть в тексте выпуска. Числа подкласса в лист сами не входят.",
            "sourceId": "srd-5.1",
            "prereq": ru,
            "location": "SRD 5.1, подклассы",
            "link": LINK51,
            "status": "verified-partial",
            "checkedOn": CHECKED,
            "sourceVersion": "5.1",
        })
    return cards


def existing_ids() -> set[str]:
    text = (ROOT / "src/data/dnd5e.ts").read_text()
    chunk = text.split("export const SPELLS", 1)[1].split("export function spellsForClass", 1)[0]
    ids = set(re.findall(r'id: "([^"]+)"', chunk))
    extra = (ROOT / "src/data/packs-extra.ts").read_text().split("export const DND_2024_MORE", 1)[1].split("];", 1)[0]
    ids.update(re.findall(r'id: "([^"]+)"', extra))
    names = set(re.findall(r'name: "([^"]+)"', chunk))
    names.update(re.findall(r'name: "([^"]+)"', extra))
    return ids, names


def latin_leak(text: str) -> list[str]:
    stripped = re.sub(r"\d+d\d+", "", text)
    stripped = re.sub(r"SRD\s*5\.[12](?:\.1)?", "", stripped)
    return re.findall(r"[A-Za-z]{3,}", stripped)


def main() -> None:
    spells52 = parse_spells_52(collect(PDF52, 107, 175))
    spells51 = parse_spells_51(collect(PDF51, 114, 194))
    lists = class_lists(collect(PDF51, 105, 113))
    by52 = {s["name"].replace("\u2019", "'"): s for s in spells52}
    by51 = {s["name"].replace("\u2019", "'"): s for s in spells51}
    assert "2d8" in by52["Cure Wounds"]["body"] and by52["Cure Wounds"]["level"] == 1
    assert "1d8" in by51["Cure Wounds"]["body"] and "2d8" not in by51["Cure Wounds"]["body"].split("At Higher Levels")[0]
    assert by52["False Life"]["duration"] == "Instantaneous" and "2d4 + 4" in by52["False Life"]["body"]
    assert "hour" in by51["False Life"]["duration"].lower() and "1d4 + 4" in by51["False Life"]["body"]
    assert "8d6" in by52["Fireball"]["body"] and by52["Fireball"]["level"] == 3
    assert "8d6" in by51["Fireball"]["body"]
    missing_ru = [name for name in sorted(set(by52) | set(by51)) if name not in SPELL_RU]
    if missing_ru:
        raise SystemExit("нет русского имени: " + ", ".join(missing_ru))
    known_ids, known_names = existing_ids()
    cards52 = []
    for spell in spells52:
        card = spell_card(spell, "5.2.1", [part.strip() for part in spell["classes"].split(",") if part.strip() in CLASS_RU])
        if card["id"] in known_ids or card["name"] in known_names:
            continue
        cards52.append(card)
    cards51 = []
    for spell in spells51:
        classes = sorted(lists.get(spell["name"], []))
        cards51.append(spell_card(spell, "5.1", classes))
    # предметы
    items52 = parse_items(collect(PDF52, 209, 254))
    items51 = parse_items(collect(PDF51, 208, 253))
    missing: set[str] = set()
    item_cards52 = [card for item in items52 if (card := item_card(item, "5.2.1", missing))]
    item_cards51 = [card for item in items51 if (card := item_card(item, "5.1", missing))]
    if missing:
        print("UNKNOWN_ITEM_WORDS", " ".join(sorted(missing)))
        print("items parsed", len(items52), len(items51), "kept", len(item_cards52), len(item_cards51))
        raise SystemExit(2)
    blob = " ".join(clean_text(page.get_text("text")) for page in pymupdf.open(PDF51)[:104]).lower()
    classes = class_cards(blob)
    # уникальность id внутри пакета
    def dedupe(cards: list[dict]) -> list[dict]:
        seen = set()
        out = []
        for card in cards:
            if card["id"] in seen:
                continue
            seen.add(card["id"])
            out.append(card)
        return out
    cards52 = dedupe(cards52 + item_cards52)
    cards51 = dedupe(cards51 + item_cards51 + classes)
    leaks = []
    for card in cards52 + cards51:
        leaks.extend(f"{card['id']}:{word}" for word in latin_leak(card["name"] + " " + card["short"] + " " + card["text"]))
    if leaks:
        print("LATIN", leaks[:40])
        raise SystemExit(3)
    links = []
    ids52 = {card["id"] for card in cards52} | known_ids
    for card in cards51:
        if card["category"] == "spell" and card["id"] in ids52:
            links.append({
                "from": f"dnd-2024~spell~{card['id']}",
                "to": f"dnd-2014~spell~{card['id']}",
                "note": "То же имя в двух редакциях справочника. Кости и длительность читайте на своей карточке.",
            })
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "srd-2024.json").write_text(json.dumps(cards52, ensure_ascii=False, indent=2) + "\n")
    (OUT / "srd-2014.json").write_text(json.dumps(cards51, ensure_ascii=False, indent=2) + "\n")
    (OUT / "links.json").write_text(json.dumps(links, ensure_ascii=False, indent=2) + "\n")
    print("spells52", len(spells52), "new2024", sum(1 for c in cards52 if c["category"] == "spell"))
    print("spells51", len(spells51), "items52", len(item_cards52), "items51", len(item_cards51), "classes", len(classes))
    print("cards", len(cards52), len(cards51), "links", len(links))
    print("lists", len(lists), "fireball classes", sorted(lists.get("Fireball", [])))


if __name__ == "__main__":
    main()
