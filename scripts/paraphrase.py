#!/usr/bin/env python3
"""Короткий пересказ полей триггера и требования. Абзац книги сюда не копируется."""

from __future__ import annotations

import re

import ru_glossary as ru

LATIN = re.compile(r"[A-Za-z]")
BANNED = ("не перенесена", "задано,", "Из полей")

# Служебные слова предложения. Пустая строка значит «в русской фразе этого слова нет».
LEX = {
    "a": "",
    "an": "",
    "the": "",
    "you": "вы",
    "your": "ваш",
    "yours": "ваш",
    "yourself": "себя",
    "are": "",
    "is": "",
    "am": "",
    "be": "",
    "been": "",
    "being": "",
    "was": "",
    "were": "",
    "do": "",
    "does": "",
    "did": "",
    "have": "есть",
    "has": "есть",
    "had": "было",
    "not": "не",
    "no": "нет",
    "and": "и",
    "or": "или",
    "of": "",
    "to": "",
    "for": "для",
    "from": "от",
    "with": "с",
    "without": "без",
    "in": "в",
    "on": "на",
    "at": "",
    "by": "",
    "into": "в",
    "while": "пока",
    "when": "когда",
    "if": "если",
    "that": "",
    "this": "этот",
    "these": "эти",
    "those": "те",
    "it": "",
    "its": "его",
    "they": "они",
    "their": "их",
    "them": "их",
    "who": "который",
    "which": "который",
    "but": "но",
    "than": "чем",
    "as": "как",
    "per": "за",
    "up": "",
    "down": "",
    "out": "",
    "over": "",
    "under": "под",
    "again": "снова",
    "already": "уже",
    "still": "ещё",
    "only": "только",
    "also": "также",
    "other": "другой",
    "another": "ещё один",
    "same": "тот же",
    "such": "такой",
    "any": "любой",
    "each": "каждый",
    "every": "каждый",
    "all": "все",
    "both": "оба",
    "more": "больше",
    "most": "самый",
    "less": "меньше",
    "least": "наименьший",
    "very": "",
    "just": "только",
    "even": "даже",
    "else": "ещё",
    "there": "",
    "here": "",
    "then": "затем",
    "once": "один раз",
    "twice": "дважды",
    "before": "до",
    "after": "после",
    "during": "во время",
    "until": "пока не",
    "against": "против",
    "about": "",
    "into": "в",
    "onto": "на",
    "off": "",
    "through": "сквозь",
    "across": "через",
    "around": "вокруг",
    "between": "между",
    "within": "в пределах",
    "beyond": "дальше",
    "near": "рядом",
    "adjacent": "рядом",
    "using": "используя",
    "used": "использовано",
    "use": "используете",
    "uses": "использует",
    "make": "делаете",
    "makes": "делает",
    "made": "сделали",
    "take": "получаете",
    "takes": "получает",
    "would": "вот-вот",
    "will": "",
    "can": "можете",
    "could": "могли бы",
    "must": "должны",
    "may": "может",
    "might": "может",
    "should": "стоит",
    "creature": "существо",
    "creatures": "существа",
    "enemy": "враг",
    "enemies": "враги",
    "opponent": "противник",
    "opponents": "противники",
    "ally": "союзник",
    "allies": "союзники",
    "attacker": "атакующий",
    "target": "цель",
    "targets": "выбирает целью",
    "targeted": "выбран целью",
    "attack": "атака",
    "attacks": "атакует",
    "hit": "попадание",
    "hits": "попадает",
    "miss": "промах",
    "misses": "промахивается",
    "damage": "урон",
    "damaged": "ранены",
    "spell": "заклинание",
    "spells": "заклинания",
    "strike": "удар",
    "strikes": "удары",
    "action": "действие",
    "actions": "действия",
    "reaction": "реакция",
    "turn": "ход",
    "round": "раунд",
    "initiative": "инициатива",
    "save": "спасбросок",
    "saving": "спасбросок",
    "throw": "бросок",
    "check": "проверка",
    "skill": "навык",
    "roll": "бросаете",
    "rolled": "бросили",
    "attempt": "пытаетесь",
    "attempting": "пытаетесь",
    "succeed": "преуспеваете",
    "succeeds": "преуспевает",
    "success": "успех",
    "fail": "проваливаете",
    "fails": "проваливает",
    "failure": "провал",
    "critically": "критически",
    "critical": "критический",
    "reduced": "снижены",
    "gain": "получаете",
    "gains": "получает",
    "lose": "теряете",
    "loses": "теряет",
    "cast": "сотворяете",
    "casts": "творит",
    "wielding": "держите",
    "wield": "держать",
    "holding": "держите",
    "hold": "держать",
    "wearing": "носите",
    "wear": "носить",
    "raised": "поднят",
    "shield": "щит",
    "weapon": "оружие",
    "weapons": "оружие",
    "melee": "ближний бой",
    "ranged": "дальний бой",
    "unarmed": "безоружный",
    "unarmored": "без брони",
    "armor": "броня",
    "armored": "в броне",
    "hand": "рука",
    "hands": "руки",
    "free": "свободный",
    "loaded": "заряженный",
    "firearm": "огнестрельное оружие",
    "bow": "лук",
    "crossbow": "арбалет",
    "reach": "досягаемость",
    "feet": "футов",
    "foot": "фут",
    "squares": "клетки",
    "square": "клетка",
    "size": "размер",
    "smaller": "меньше",
    "larger": "больше",
    "adjacent": "вплотную",
    "encumbered": "обременены",
    "grabbed": "схвачены",
    "prone": "лежите ничком",
    "frightened": "напуганы",
    "stunned": "ошеломлены",
    "immobilized": "обездвижены",
    "paralyzed": "парализованы",
    "unconscious": "без сознания",
    "dying": "при смерти",
    "wounded": "ранены",
    "doomed": "обречены",
    "clumsy": "неуклюжи",
    "drained": "осушены",
    "enfeebled": "ослаблены",
    "sickened": "тошнит",
    "slowed": "замедлены",
    "quickened": "ускорены",
    "hidden": "скрыты",
    "undetected": "не обнаружены",
    "observed": "заметны",
    "concealed": "заслонёны",
    "invisible": "невидимы",
    "flanking": "обходите с фланга",
    "flanked": "под флангом",
    "mounted": "верхом",
    "mount": "ездовое животное",
    "riding": "едите верхом",
    "physical": "физический",
    "bludgeoning": "дробящий",
    "piercing": "колющий",
    "slashing": "рубящий",
    "fire": "огонь",
    "cold": "холод",
    "electricity": "электричество",
    "acid": "кислота",
    "poison": "яд",
    "mental": "ментальный",
    "force": "сила",
    "sonic": "звук",
    "positive": "жизненная сила",
    "negative": "пустота",
    "vitality": "жизненная сила",
    "void": "пустота",
    "spirit": "дух",
    "holy": "святое",
    "unholy": "нечестивое",
    "good": "добро",
    "evil": "зло",
    "lawful": "порядок",
    "chaotic": "хаос",
    "hit": "хиты",
    "points": "очки",
    "point": "очко",
    "hp": "хиты",
    "condition": "состояние",
    "effect": "эффект",
    "effects": "эффекты",
    "bonus": "бонус",
    "penalty": "штраф",
    "circumstance": "обстоятельство",
    "status": "статус",
    "item": "предмет",
    "ac": "КБ",
    "level": "уровень",
    "rank": "круг",
    "spellstrike": "удар заклинанием",
    "charged": "заряжен",
    "aura": "аура",
    "active": "активна",
    "previous": "предыдущий",
    "recent": "последний",
    "last": "последний",
    "next": "следующий",
    "current": "текущий",
    "currently": "сейчас",
    "see": "видите",
    "seen": "виден",
    "aware": "знаете",
    "willing": "согласен",
    "hostile": "враждебный",
    "living": "живой",
    "dead": "мёртвый",
    "dying": "при смерти",
    "heal": "лечение",
    "healing": "лечение",
    "stride": "шаг",
    "step": "шажок",
    "strike": "удар",
    "leap": "прыжок",
    "fly": "полёт",
    "flying": "летите",
    "swim": "плавание",
    "climb": "лазание",
    "burrow": "рытьё",
    "manipulate": "манипуляция",
    "move": "перемещение",
    "concentrate": "концентрация",
    "interact": "взаимодействие",
    "seek": "поиск",
    "hide": "затаиться",
    "sneak": "красться",
    "demoralize": "запугивание",
    "feint": "финт",
    "grapple": "захват",
    "trip": "подсечка",
    "shove": "толчок",
    "disarm": "обезоруживание",
    "escape": "высвобождение",
    "ready": "изготовка",
    "recall": "припоминание",
    "knowledge": "знание",
    "treat": "лечение",
    "medicine": "медицина",
    "trained": "обучены",
    "expert": "эксперт",
    "master": "мастер",
    "legendary": "легенда",
    "medium": "средний",
    "heavy": "тяжёлый",
    "light": "лёгкий",
    "two": "два",
    "one": "один",
    "single": "одно",
    "both": "оба",
    "either": "любой",
    "neither": "ни один",
    "none": "нет",
    "zero": "ноль",
    "0": "0",
    "begin": "начинается",
    "begins": "начинается",
    "end": "заканчивается",
    "ends": "заканчивается",
    "start": "начинаете",
    "starts": "начинает",
    "enter": "входит",
    "enters": "входит",
    "leave": "покидает",
    "leaves": "покидает",
    "move": "двигается",
    "moves": "двигается",
    "moving": "двигается",
    "die": "умираете",
    "dies": "умирает",
    "killed": "убит",
    "reduce": "снижаете",
    "reduces": "снижает",
    "deal": "наносите",
    "deals": "наносит",
    "dealt": "нанесён",
    "regain": "восстанавливаете",
    "regains": "восстанавливает",
    "expend": "тратите",
    "expends": "тратит",
    "spend": "тратите",
    "spends": "тратит",
    "focus": "фокус",
    "point": "очко",
    "points": "очки",
    "slot": "ячейка",
    "slots": "ячейки",
    "cantrip": "заговор",
    "cantrips": "заговоры",
    "tradition": "традиция",
    "arcane": "арканный",
    "divine": "божественный",
    "occult": "оккультный",
    "primal": "первозданный",
    "fortitude": "стойкость",
    "reflex": "рефлексы",
    "will": "воля",
    "perception": "восприятие",
    "acrobatics": "акробатика",
    "athletics": "атлетика",
    "stealth": "скрытность",
    "thievery": "воровство",
    "deception": "обман",
    "diplomacy": "дипломатия",
    "intimidation": "запугивание",
    "performance": "выступление",
    "society": "общество",
    "arcana": "аркана",
    "nature": "природа",
    "occultism": "оккультизм",
    "religion": "религия",
    "crafting": "ремесло",
    "survival": "выживание",
    "medicine": "медицина",
}

EXACT = {
    "a creature targets you with an attack and you can see the attacker": "враг, которого вы видите, атакует вас",
    "you are not encumbered": "вы не обременены",
    "you are encumbered": "вы обременены",
    "your turn begins": "начинается ваш ход",
    "your turn ends": "ваш ход заканчивается",
    "you roll initiative": "вы бросаете инициативу",
    "you are about to roll initiative": "вы вот-вот бросите инициативу",
    "you are reduced to 0 hit points": "ваши хиты падают до 0",
    "you would be reduced to 0 hit points": "ваши хиты вот-вот упадут до 0",
    "you are reduced to 0 hp": "ваши хиты падают до 0",
    "you would die": "вы вот-вот умрёте",
    "you have a free hand": "у вас свободна одна рука",
    "you are unarmored": "на вас нет брони",
    "you are wielding a shield": "вы держите щит",
    "you are wielding a melee weapon": "вы держите оружие ближнего боя",
    "you are wielding a ranged weapon": "вы держите оружие дальнего боя",
    "you are wielding two melee weapons": "вы держите два оружия ближнего боя",
    "you are adjacent to an enemy": "вы стоите вплотную к врагу",
    "you are adjacent to an ally": "вы стоите вплотную к союзнику",
    "while you have your shield raised, you would take physical damage (bludgeoning, piercing, or slashing) from an attack": "щит поднят, и атака вот-вот нанесёт дробящий, колющий или рубящий урон",
    "you use the shield block reaction, and the opponent that triggered shield block is adjacent to you and is your size or smaller": "вы только что закрылись щитом, а противник рядом и не крупнее вас",
    "a creature within your reach uses a manipulate action or a move action": "существо в вашей досягаемости манипулирует или двигается",
    "you attempt a saving throw against a spell, but you have not rolled yet": "вы вот-вот бросите спасбросок против заклинания",
    "you fail a saving throw": "вы проваливаете спасбросок",
    "you succeed at a saving throw": "вы преуспеваете в спасброске",
    "you critically fail a saving throw": "вы критически проваливаете спасбросок",
    "you are the target of a spell": "заклинание нацелено на вас",
    "you are targeted by an attack": "атака нацелена на вас",
    "an enemy hits you with a melee strike": "враг попадает по вам ударом вблизи",
    "an enemy hits you with an attack": "враг попадает по вам атакой",
    "you would take damage": "вы вот-вот получите урон",
    "you would take damage from an attack": "атака вот-вот нанесёт вам урон",
    "an ally within 30 feet would take damage": "союзник в пределах 30 футов вот-вот получит урон",
    "your last action was a strike": "ваше последнее действие было ударом",
    "your most recent action was a strike": "ваше последнее действие было ударом",
    "you are wearing medium or heavy armor": "на вас средний или тяжёлый доспех",
    "you are wielding a loaded firearm": "вы держите заряженное огнестрельное оружие",
    "your spellstrike is charged": "удар заклинанием заряжен",
    "your aura is active": "ваша аура действует",
    "you are riding your mount": "вы едете верхом",
}

RULES: list[tuple[re.Pattern[str], object]] = [
    (re.compile(r"your turn begins"), lambda m: "начинается ваш ход"),
    (re.compile(r"your turn ends"), lambda m: "ваш ход заканчивается"),
    (re.compile(r"you (?:are about to |would )?roll initiative"), lambda m: "вы бросаете инициативу"),
    (re.compile(r"you are not ([a-z ]+)"), lambda m: f"вы не {gloss_words(m.group(1)) or ''}".strip() if gloss_words(m.group(1)) else ""),
    (re.compile(r"you have a free hand"), lambda m: "у вас свободна одна рука"),
    (re.compile(r"you are wielding (.+)"), lambda m: f"вы держите {gloss_words(m.group(1))}" if gloss_words(m.group(1)) else ""),
    (re.compile(r"you are wearing (.+)"), lambda m: f"на вас {gloss_words(m.group(1))}" if gloss_words(m.group(1)) else ""),
    (re.compile(r"you are adjacent to (.+)"), lambda m: f"вы вплотную к {gloss_words(m.group(1))}" if gloss_words(m.group(1)) else ""),
    (re.compile(r"you (?:would )?be reduced to 0 hit points"), lambda m: "ваши хиты падают до 0"),
    (re.compile(r"you are reduced to 0 hit points"), lambda m: "ваши хиты падают до 0"),
    (re.compile(r"you would take (.+) damage"), lambda m: f"вы вот-вот получите урон ({gloss_words(m.group(1))})" if gloss_words(m.group(1)) else "вы вот-вот получите урон"),
    (re.compile(r"you fail a (?:saving throw|save)(?: against (.+))?"), lambda m: "вы проваливаете спасбросок" + against(m.group(1))),
    (re.compile(r"you succeed at a (?:saving throw|save)"), lambda m: "вы преуспеваете в спасброске"),
    (re.compile(r"you critically (?:fail|succeed).+"), lambda m: "ступень успеха спасброска критическая"),
    (re.compile(r"(trained|expert|master|legendary) in ([a-z ]+)"), lambda m: rank_skill(m.group(1), m.group(2))),
    (re.compile(r"(strength|dexterity|constitution|intelligence|wisdom|charisma) \+(\d+)"), lambda m: ability_mod(m.group(1), m.group(2))),
    (re.compile(r"a creature (?:that )?you can see (.+)"), lambda m: f"существо, которое вы видите, {gloss_words(m.group(1))}" if gloss_words(m.group(1)) else "существо, которое вы видите"),
    (re.compile(r"an? (ally|enemy|creature|opponent) within (\d+) feet (.+)"), lambda m: within_feet(m)),
]


def gloss_words(fragment: str) -> str:
    parts = re.findall(r"[A-Za-z]+|\d+|[^A-Za-z\d]+", fragment)
    out: list[str] = []
    for part in parts:
        if part.isdigit():
            out.append(part)
            continue
        if not part[:1].isalpha():
            out.append(part)
            continue
        key = part.lower()
        if key in LEX:
            out.append(LEX[key])
            continue
        word = ru.WORDS.get(key)
        if not word:
            return ""
        out.append(word)
    text = re.sub(r"\s+", " ", "".join(out))
    text = re.sub(r"\s+([,.)])", r"\1", text)
    text = re.sub(r"\(\s+", "(", text)
    text = text.strip(" -–—,")
    if not text or LATIN.search(text):
        return ""
    return text


def rank_skill(rank: str, skill: str) -> str:
    ranks = {"trained": "обучены", "expert": "эксперт", "master": "мастер", "legendary": "легенда"}
    name = gloss_words(skill.strip())
    if not name:
        return ""
    return f"{ranks[rank]} в навыке {name}"


def ability_mod(ability: str, number: str) -> str:
    names = {
        "strength": "Сила",
        "dexterity": "Ловкость",
        "constitution": "Телосложение",
        "intelligence": "Интеллект",
        "wisdom": "Мудрость",
        "charisma": "Харизма",
    }
    return f"{names[ability]} +{number}"


def against(fragment: str | None) -> str:
    if not fragment:
        return ""
    if fragment.strip() in {"a spell", "spell", "the spell"}:
        return " против заклинания"
    said = gloss_words(fragment)
    return f" против {said}" if said else ""


def within_feet(match: re.Match[str]) -> str:
    who = {"ally": "союзник", "enemy": "враг", "creature": "существо", "opponent": "противник"}[match.group(1)]
    rest = gloss_words(match.group(3))
    if not rest:
        return f"{who} в пределах {match.group(2)} футов"
    return f"{who} в пределах {match.group(2)} футов {rest}"


def normalize(english: str) -> str:
    text = english.replace("’", "'").replace("‘", "'").replace("“", "").replace("”", "")
    text = re.sub(r"\s+", " ", text).strip().strip(".")
    low = text.lower()
    swaps = (
        (r"\byou're\b", "you are"),
        (r"\byou’ve\b", "you have"),
        (r"\byou've\b", "you have"),
        (r"\bdon't\b", "do not"),
        (r"\bcan't\b", "cannot"),
        (r"\bwon't\b", "will not"),
        (r"\bisn't\b", "is not"),
        (r"\baren't\b", "are not"),
        (r"\bhaven't\b", "have not"),
        (r"\bhasn't\b", "has not"),
        (r"\bdidn't\b", "did not"),
        (r"\bit's\b", "it is"),
        (r"\bthat's\b", "that is"),
        (r"\bi'm\b", "i am"),
        (r"\bwouldn't\b", "would not"),
        (r"\bcouldn't\b", "could not"),
        (r"\bshouldn't\b", "should not"),
        (r"\blet's\b", "let us"),
        (r"\bcan't\b", "cannot"),
    )
    for pattern, repl in swaps:
        low = re.sub(pattern, repl, low)
    low = low.replace("cannot", "can not")
    return low


def _rule(text: str) -> str:
    for pattern, builder in RULES:
        match = pattern.fullmatch(text)
        if not match:
            continue
        said = builder(match)
        if said and not LATIN.search(said):
            return said
    return ""


def clause(text: str, depth: int = 0) -> str:
    text = text.strip(" .;")
    if not text:
        return ""
    if text in EXACT:
        return EXACT[text]
    ruled = _rule(text)
    if ruled:
        return ruled
    if depth < 2:
        for sep, joiner in ((" or ", " или "), (" and ", " и "), ("; ", "; ")):
            if sep in text:
                bits = [clause(part, depth + 1) for part in text.split(sep)]
                if all(bits):
                    return joiner.join(bits)
                return ""
    if len(text.split()) <= 10:
        return gloss_words(text)
    return ""


def paraphrase(english: str) -> str:
    text = normalize(english)
    if not text or text in {"varies", "see text", "see below"}:
        return ""
    said = clause(text)
    if not said or LATIN.search(said):
        return ""
    if any(token in said for token in BANNED):
        return ""
    return said[:1].lower() + said[1:] if said[:1].isupper() else said
