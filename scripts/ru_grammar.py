#!/usr/bin/env python3
"""Собрать русское имя с согласованием слов.

Старый сборщик (ru_glossary.compose) ставил переводы слов подряд:
«Яростный месть», «Щит вера», «Алдори дуэлянт посвящение».
Здесь то же словарное значение каждого слова, но фраза строится по-русски:
прилагательное согласуется с существительным, «X of Y» даёт «X Y-а»,
английская цепочка существительных разворачивается в родительный падеж,
«Посвящение» встаёт первым.

Нужен pymorphy3 (pip install pymorphy3 pymorphy3-dicts-ru). Это только
инструмент сборки, на сайт он не попадает.
"""

from __future__ import annotations

import re
import sys
from functools import lru_cache
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pymorphy3  # noqa: E402

import ru_glossary as ru  # noqa: E402

MORPH = pymorphy3.MorphAnalyzer()

# Слова, которые в английском имени относятся ко всей вещи, а не к соседнему слову.
GRADE = {
    "greater", "lesser", "major", "minor", "true", "improved", "advanced", "superior",
    "moderate", "supreme", "basic", "expert", "master", "legendary", "standard", "mythic",
    "quick", "rapid", "swift", "sudden", "powerful", "mighty", "perfect", "dread",
}

# Английский предлог -> (русский предлог, падеж). Пустой предлог = просто падеж.
PREP = {
    "of": ("", "gent"),
    "for": ("для", "gent"),
    "in": ("в", "loct"),
    "on": ("на", "loct"),
    "upon": ("на", "loct"),
    "with": ("с", "ablt"),
    "from": ("из", "gent"),
    "to": ("к", "datv"),
    "towards": ("к", "datv"),
    "against": ("против", "gent"),
    "through": ("сквозь", "accs"),
    "without": ("без", "gent"),
    "under": ("под", "ablt"),
    "beneath": ("под", "ablt"),
    "over": ("над", "ablt"),
    "above": ("над", "ablt"),
    "into": ("в", "accs"),
    "beyond": ("за пределами", "gent"),
    "among": ("среди", "gent"),
    "between": ("между", "ablt"),
    "around": ("вокруг", "gent"),
    "after": ("после", "gent"),
    "before": ("перед", "ablt"),
    "behind": ("за", "ablt"),
    "within": ("внутри", "gent"),
    "across": ("через", "accs"),
    "at": ("у", "gent"),
}
SKIP = {"the", "a", "an"}
ROMAN = {"i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5", "vi": "6", "vii": "7", "viii": "8", "ix": "9", "x": "10"}

# Отглагольные слова, которые в начале английского имени — действие над тем, что дальше.
# «Swallow Pain» -> «Проглатывание боли», а не «Боль проглатывания».
NOT_ACTION = {"spell", "knowledge", "lore", "meeting", "building", "being", "painting", "clothing", "wedding", "ring", "sling", "string", "wing"}


class Word:
    __slots__ = ("en", "ru", "kind", "words")

    def __init__(self, en: str, ru_text: str, kind: str):
        self.en = en
        self.ru = ru_text
        self.kind = kind  # adj / noun / prop / num / verb / other
        self.words = ru_text.split()

    def __repr__(self) -> str:
        return f"{self.kind}:{self.ru}"


@lru_cache(maxsize=None)
def parses(word: str):
    return MORPH.parse(word)


def kind_of(text: str) -> str:
    words = text.split()
    if not words:
        return "other"
    if len(words) > 1:
        kinds = [kind_of(w) for w in words]
        if "noun" in kinds:
            return "noun"
        if all(k == "adj" for k in kinds):
            return "adj"
        if kinds[0] == "verb":
            return "verb"
        return "other"
    if re.fullmatch(r"\d+", text):
        return "num"
    found = parses(text.lower())
    top = found[0]
    pos = top.tag.POS
    if re.search(r"(ый|ий|ой|ая|яя|ое|ые)$", text.lower()) and any(p.tag.POS in ("ADJF", "PRTF") and "nomn" in p.tag for p in found):
        if not (pos == "NOUN" and top.score > 0.7 and not text.lower().endswith(("ый", "ой", "ая", "ое", "ые"))):
            return "adj"
    if pos in ("ADJF", "PRTF"):
        # «рунический» и т. п.; если слово чаще существительное в им. падеже — существительное.
        return "adj"
    if pos == "NOUN":
        for p in found[:3]:
            if p.tag.POS in ("ADJF", "PRTF") and p.score >= top.score * 0.9 and "nomn" in p.tag:
                return "adj"
        return "noun"
    if pos in ("INFN",):
        return "verb"
    if pos in ("NUMR",):
        return "num"
    if any(p.tag.POS == "NOUN" for p in found[:3]) or not MORPH.word_is_known(text.lower()):
        return "noun"
    return "other"


def noun_parse(word: str, plural: bool | None = None):
    found = [p for p in parses(word.lower()) if not ({"Geox", "Name", "Surn", "Patr", "Orgn"} & set(str(p.tag).replace(" ", ",").split(",")))]
    if not found:
        return None
    if plural is not None:
        want = "plur" if plural else "sing"
        for p in found:
            if p.tag.POS == "NOUN" and "nomn" in p.tag and want in p.tag:
                return p
        for p in found:
            if p.tag.POS == "NOUN" and want in p.tag and p.score >= 0.3:
                return p
    for p in found:
        if p.tag.POS == "NOUN" and "nomn" in p.tag and p.word == word.lower():
            return p
    for p in found:
        if p.tag.POS == "NOUN":
            return p
    return None


def adj_parse(word: str):
    for p in parses(word.lower()):
        if p.tag.POS in ("ADJF", "PRTF") and "nomn" in p.tag:
            return p
    for p in parses(word.lower()):
        if p.tag.POS in ("ADJF", "PRTF"):
            return p
    return None


def keep_case(src: str, out: str) -> str:
    if src[:1].isupper():
        return out[:1].upper() + out[1:]
    return out


def inflect_noun(word: str, case: str, plural: bool | None = None) -> tuple[str, dict]:
    p = noun_parse(word, plural)
    if p is None:
        return word, {}
    if not MORPH.word_is_known(word.lower()):
        # Незнакомое слово («фулу»): не склоняем, чтобы не придумать форму.
        # Исключение — родительный у слов на согласную: «магус» -> «магуса».
        if case == "gent":
            word = proper_case(word, "gent")
        return word, {"number": "plur" if "plur" in p.tag else "sing", "gender": (str(p.tag.gender) if p.tag.gender else None), "anim": "anim" in p.tag}
    if "nomn" not in p.tag and "Fixd" not in p.tag:
        # В словаре слово стоит не в начальной форме («жизней»): вернуть именительный.
        number = "plur" if "plur" in p.tag else "sing"
        fixed = p.inflect({"nomn", number})
        if fixed is not None:
            word, p = keep_case(word, fixed.word), fixed
    number = "plur" if "plur" in p.tag else "sing"
    info = {"number": number, "gender": (str(p.tag.gender) if p.tag.gender else None), "anim": "anim" in p.tag}
    if "Fixd" in p.tag or case == "nomn":
        return word, info
    form = p.inflect({case, number})
    if form is None:
        return word, info
    return keep_case(word, form.word), info


def inflect_adj(word: str, info: dict, case: str) -> str:
    p = adj_parse(word)
    if p is None:
        return word
    want = {case}
    if info.get("number") == "plur":
        want.add("plur")
    else:
        gender = info.get("gender") or "masc"
        if gender not in ("masc", "femn", "neut"):
            gender = "masc"
        want.add(gender)
    if case == "accs" and (info.get("number") == "plur" or info.get("gender") in ("masc", None)):
        want.add("anim" if info.get("anim") else "inan")
    form = p.inflect(want)
    if form is None and "anim" in want:
        form = p.inflect(want - {"anim"})
    if form is None and "inan" in want:
        form = p.inflect(want - {"inan"})
    if form is None:
        return word
    return keep_case(word, form.word)


def phrase_noun(text: str, case: str, en: str = "") -> tuple[str, dict]:
    """Склонить готовую фразу из словаря: «лунный цветок», «ловкость рук»."""
    words = text.split()
    idx = next((i for i, w in enumerate(words) if kind_of(w) == "noun"), None)
    if idx is None:
        return text, {}
    plural = None
    if en and len(words) == 1:
        low = en.lower()
        plural = low.endswith("s") and not low.endswith(("ss", "us", "is", "ics"))
    head, info = inflect_noun(words[idx], case, plural)
    out = [inflect_adj(w, info, case) if kind_of(w) == "adj" else w for w in words[:idx]]
    return " ".join(out + [head] + words[idx + 1:]), info


def build_np(items: list[Word], case: str, head_info: dict | None = None) -> tuple[str, dict] | None:
    """Именная группа: прилагательные + главное слово + зависимые в родительном."""
    if not items:
        return None
    if any(i.kind in ("verb", "other") for i in items):
        return None
    nouns = [n for n, i in enumerate(items) if i.kind == "noun"]
    if not nouns:
        if all(i.kind == "adj" for i in items):
            # Субстантив: «Светский». Согласуем с ничем — оставляем как есть, только падеж.
            info = head_info or {"number": "sing", "gender": "masc"}
            return " ".join(inflect_adj(w, info, case) for i in items for w in i.words), info
        if all(i.kind in ("prop", "num") for i in items):
            props = [i.ru for i in items]
            if items[-1].kind == "prop":
                props[-1] = proper_case(props[-1], case)
            return " ".join(props), {}
        return None
    h = nouns[-1]
    head = items[h]
    after = items[h + 1:]
    if any(i.kind not in ("num", "prop") for i in after):
        return None
    head_text, info = phrase_noun(head.ru, case, head.en)
    head_adjs: list[str] = []
    deps: list[tuple[list[Word], Word]] = []
    props: list[str] = []
    pending: list[Word] = []
    for item in items[:h]:
        if item.kind == "adj":
            if item.en.lower() in GRADE and not deps:
                head_adjs.append(item.ru)
            else:
                pending.append(item)
        elif item.kind == "noun":
            deps.append((pending, item))
            pending = []
        elif item.kind == "prop":
            if pending:
                return None
            props.append(item.ru)
        elif item.kind == "num":
            props.append(item.ru)
    head_adjs += [i.ru for i in pending]
    parts = [" ".join(inflect_adj(w, info, case) for w in adj.split()) for adj in head_adjs]
    parts.append(head_text)
    agent = head.en.lower().endswith(("er", "or")) and info.get("anim")
    for adjs, noun in reversed(deps):
        if not adjs and noun.en.lower() in ADJ_MOD and not agent:
            adj = ADJ_MOD[noun.en.lower()]
            parts.insert(len(head_adjs), " ".join(inflect_adj(w, info, case) for w in adj.split()))
            continue
        noun_text, ninfo = phrase_noun(noun.ru, "gent", noun.en)
        dep = [" ".join(inflect_adj(w, ninfo, "gent") for w in a.ru.split()) for a in adjs]
        parts.append(" ".join(dep + [noun_text]))
    if props and not after:
        props[-1] = proper_case(props[-1], "gent")
    parts += props
    parts += [i.ru for i in after]
    return " ".join(p for p in parts if p), info


# Существительное-определение, которое по-русски звучит прилагательным:
# «Iron Fists» -> «Железные кулаки», а не «Кулаки железа».
ADJ_MOD = {
    "magic": "магический",
    "master": "мастерский", "expert": "опытный", "fey": "фейский",
    "iron": "железный", "steel": "стальной", "bone": "костяной", "clay": "глиняный", "stone": "каменный",
    "wood": "деревянный", "silver": "серебряный", "gold": "золотой", "golden": "золотой", "crystal": "хрустальный",
    "glass": "стеклянный", "copper": "медный", "bronze": "бронзовый", "leather": "кожаный",
    "paper": "бумажный", "silk": "шёлковый", "ice": "ледяной", "night": "ночной", "sun": "солнечный",
    "moon": "лунный", "star": "звёздный", "fire": "огненный", "flame": "огненный", "frost": "морозный",
    "storm": "грозовой", "shadow": "теневой", "blood": "кровавый", "thunder": "громовой", "lightning": "грозовой",
    "wind": "ветряной", "water": "водный", "air": "воздушный", "sea": "морской",
    "war": "боевой", "battle": "боевой", "dragon": "драконий",
    "wolf": "волчий", "bear": "медвежий", "snake": "змеиный", "serpent": "змеиный", "spider": "паучий",
    "cat": "кошачий", "fox": "лисий", "bird": "птичий", "horse": "конский", "ghost": "призрачный",
    "demon": "демонический", "devil": "дьявольский", "angel": "ангельский", "elf": "эльфийский", "dwarf": "дварфийский",
    "orc": "орочий", "goblin": "гоблинский", "giant": "великаний", "winter": "зимний", "summer": "летний",
    "autumn": "осенний", "glacier": "ледниковый", "mountain": "горный", "forest": "лесной",
    "swamp": "болотный", "desert": "пустынный", "river": "речной", "ocean": "океанский", "salt": "соляной",
    "acid": "кислотный", "poison": "ядовитый", "venom": "ядовитый", "plague": "чумной", "grave": "могильный",
    "rune": "рунный", "ghoul": "упыриный", "vampire": "вампирский", "witch": "ведьмин",
}

# Английские глаголы в начале имени: действие + то, над чем оно.
ACTION = {
    "call": "призыв", "summon": "призыв", "invoke": "призыв", "share": "разделение", "steal": "кража",
    "siphon": "перекачка", "channel": "направление", "lock": "запирание", "exploit": "использование",
    "shatter": "раскалывание", "build": "возведение", "drain": "истощение", "sense": "чутьё",
    "detect": "обнаружение", "dispel": "развеивание", "banish": "изгнание", "conjure": "сотворение",
    "create": "создание", "protect": "защита", "awaken": "пробуждение", "bless": "благословение",
    "break": "разрушение", "read": "чтение",
}

# Поправки к общему словарю, нужные только для сборки фраз.
WORD_FIX = {
    "dragon": "дракон",
    "lives": "жизни",
    "numbers": "числа",
    "shadow": "тень",
    "shadows": "тени",
    "spirit": "дух",
    "spirits": "духи",
    "firearm": "огнестрельное оружие",
    "firearms": "огнестрельное оружие",
}


def proper_case(text: str, case: str) -> str:
    """Имя собственное без словаря: «Кольс» -> «Кольса», «Болка» -> «Болки».
    Слова на гласную, кроме -а/-я, не склоняются («Алдори», «Укун» склоняется)."""
    if case not in ("gent",):
        return text
    words = text.split()
    last = words[-1]
    low = last.lower()
    if re.search(r"[бвгджзклмнпрстфхцчшщ]$", low):
        last = last + "а"
    elif low.endswith("й") or low.endswith("тель"):
        last = last[:-1] + "я"
    elif low.endswith("а") and len(low) > 2:
        last = last[:-1] + ("и" if low[-2] in "гкхжчшщ" else "ы")
    elif low.endswith("я") and len(low) > 2:
        last = last[:-1] + "и"
    return " ".join(words[:-1] + [last])


def classify(en: str) -> Word | None:
    key = en.lower()
    if key in WORD_FIX:
        return Word(en, WORD_FIX[key], kind_of(WORD_FIX[key]))
    if key in SKIP:
        return None
    if key.isdigit():
        return Word(en, en, "num")
    value = ru.WORDS.get(key)
    if value is None:
        return Word(en, "", "unknown")
    if value == "":
        return None
    if key in ru.PROPER:
        text = " ".join(w[:1].upper() + w[1:] for w in value.split())
        if len(value.split()) == 1 and re.search(r"(ский|ской|цкий|ный|ий|ый)$", value.lower()) and kind_of(value.lower()) == "adj":
            return Word(en, text, "adj")
        return Word(en, text, "prop")
    return Word(en, value, kind_of(value))


def tokens(english: str) -> list[str] | None:
    english = ru.fold_accents(english)
    english = english.replace("’", "'")
    if re.search(r"[^A-Za-z0-9 '\-]", english):
        return None
    if "-" in english:
        return None
    return re.findall(r"[A-Za-z]+(?:'s|s')?|\d+", english)


def split_possessive(toks: list[str]) -> list[str]:
    out = []
    for t in toks:
        if t.endswith("'s"):
            out += [t[:-2], "'s"]
        elif t.endswith("s'"):
            out += [t[:-1], "'s"]
        else:
            out.append(t)
    return out


def segment(words: list[str]) -> list[tuple[str, list[str]]]:
    segs: list[tuple[str, list[str]]] = [("", [])]
    for w in words:
        lw = w.lower()
        if lw in PREP or lw == "and":
            segs.append((lw, []))
        else:
            segs[-1][1].append(w)
    return segs


# Устойчивые английские пары, которые по-русски одно понятие.
PAIRS = {
    ("chain", "shirt"): "кольчужная рубаха",
    ("chain", "mail"): "кольчуга",
    ("half", "plate"): "полулаты",
    ("full", "plate"): "полные латы",
    ("hand", "crossbow"): "ручной арбалет",
    ("heavy", "crossbow"): "тяжёлый арбалет",
    ("light", "mace"): "лёгкая булава",
    ("spell", "attack"): "атака заклинанием",
    ("cleaning", "kit"): "набор для чистки",
    ("healer's", "tools"): "инструменты лекаря",
    ("black", "hole"): "чёрная дыра",
    ("hit", "points"): "хиты",
}


def merge_pairs(words: list[str]) -> list:
    out: list = []
    i = 0
    while i < len(words):
        pair = (words[i].lower(), words[i + 1].lower()) if i + 1 < len(words) else None
        if pair in PAIRS:
            out.append(Word(" ".join(words[i:i + 2]), PAIRS[pair], kind_of(PAIRS[pair])))
            i += 2
            continue
        out.append(words[i])
        i += 1
    return out


def compose_np_words(words: list[str], case: str) -> tuple[str, dict] | None:
    """Именная группа с возможным притяжательным «X's Y» внутри."""
    items = []
    if "'s" in words:
        i = words.index("'s")
        owner, rest = words[:i], words[i + 1:]
        lead = []
        while owner and owner[0].lower() in GRADE:
            lead.append(owner.pop(0))
        rest = lead + rest
        own = compose_np_words(owner, "gent")
        rest_items = [x for x in (w if isinstance(w, Word) else classify(w) for w in merge_pairs(rest)) if x is not None]
        if not own or not rest_items or any(x.kind == "unknown" for x in rest_items):
            return None
        first_noun = next((n for n, x in enumerate(rest_items) if x.kind == "noun"), None)
        if first_noun is None:
            return None
        # «Black Dragon's Breath Potion»: владелец относится к ближайшему слову.
        owned = rest_items[first_noun]
        unit = Word(owned.en, f"{owned.ru} {own[0]}", "noun")
        items = rest_items[:first_noun] + [unit] + rest_items[first_noun + 1:]
        if len([x for x in items if x.kind == "noun"]) == 1 and first_noun == len(rest_items) - 1:
            # Простой случай «Nomad's Shawl»: прилагательные относятся к вещи.
            pass
        return build_np(items, case)
    items = [w if isinstance(w, Word) else classify(w) for w in merge_pairs(words)]
    items = [i for i in items if i is not None]
    if any(i.kind == "unknown" for i in items):
        return None
    # Английский глагол в начале: «Share Vision» -> «Разделение зрения».
    if len(items) >= 2 and items[0].en.lower() in ACTION and all(i.kind in ("noun", "adj", "prop") for i in items[1:]) and any(i.kind == "noun" for i in items[1:]):
        rest = build_np(items[1:], "gent")
        if rest is None:
            return None
        head, info = phrase_noun(ACTION[items[0].en.lower()], case)
        return f"{head} {rest[0]}", info
    # Отглагольное действие в начале: «Swallow Pain» -> «Проглатывание боли».
    if len(items) >= 2 and items[0].kind == "noun" and is_action(items[0]) and all(i.kind in ("noun", "adj", "prop") for i in items[1:]) and items[-1].kind == "noun":
        head, info = phrase_noun(items[0].ru, case, items[0].en)
        rest = build_np(items[1:], "gent")
        if rest is None:
            return None
        return f"{head} {rest[0]}", info
    return build_np(items, case)


def is_action(item: Word) -> bool:
    en = item.en.lower()
    if en in NOT_ACTION or en.endswith(("ion", "ment", "ance", "ence", "ing", "ure", "ness", "ity", "age", "al")):
        return False
    first = item.words[0]
    return bool(re.search(r"(ние|тие)$", first)) and first not in {"заклинание", "знание", "здание", "сознание", "желание", "призвание", "оружие", "орудие", "существо", "создание", "состояние", "сияние", "пламя", "предание"}


def compose_core(english: str) -> str | None:
    toks = tokens(english)
    if not toks:
        return None
    toks = split_possessive(toks)
    lowered = [t.lower() for t in toks]
    # «Gnome Weapon Familiarity» -> «Знакомство с оружием гномов».
    if len(toks) > 2 and lowered[-2:] == ["weapon", "familiarity"]:
        owner = [o for o in (classify(t) for t in toks[:-2]) if o is not None]
        if len(owner) == 1 and owner[0].kind == "adj":
            adj = inflect_adj(owner[0].ru, {"number": "sing", "gender": "neut"}, "ablt")
            return f"знакомство с {adj} оружием"
        if len(owner) == 1 and owner[0].kind in ("noun", "prop"):
            words = owner[0].ru.split()
            out = []
            for w in words:
                if owner[0].kind == "prop":
                    out.append(w)
                elif kind_of(w) == "adj":
                    out.append(inflect_adj(w, {"number": "plur"}, "gent"))
                elif MORPH.word_is_known(w.lower()) and noun_parse(w) is not None:
                    form = noun_parse(w).inflect({"gent", "plur"})
                    out.append(form.word if form else w)
                elif re.search(r"[бвгджзклмнпрстфхцчшщ]$", w.lower()):
                    out.append(w + "ов")
                else:
                    out.append(w)
            return "знакомство с оружием " + " ".join(out)
    # Посвящение архетипу: «X Dedication» -> «Посвящение X-а».
    if lowered[-1] == "dedication" and len(toks) > 1:
        inner = compose_np_words(toks[:-1], "gent")
        if inner is None:
            return None
        return f"посвящение {inner[0]}"
    # Глагол в начале: «Coerce the Current» -> «Принудить течение».
    first = classify(toks[0])
    if first is not None and first.kind == "verb":
        rest = [t for t in toks[1:]]
        if not rest:
            return first.ru
        segs = segment(rest)
        out = [first.ru]
        lead = segs[0][1]
        if lead:
            np_ = compose_np_words(lead, "accs")
            if np_ is None:
                return None
            out.append(np_[0])
        for prep, ws in segs[1:]:
            tail = prep_phrase(prep, ws, "accs")
            if tail is None:
                return None
            out.append(tail)
        return " ".join(out)
    segs = segment(toks)
    if not segs[0][1]:
        return None
    main = compose_np_words(segs[0][1], "nomn")
    if main is None:
        return None
    out = [main[0]]
    case = "nomn"
    for prep, ws in segs[1:]:
        tail = prep_phrase(prep, ws, case)
        if tail is None:
            return None
        if prep != "and":
            case = PREP[prep][1]
        out.append(tail)
    return " ".join(out)


def prep_phrase(prep: str, ws: list[str], prev_case: str) -> str | None:
    if not ws:
        return None
    if prep == "and":
        np_ = compose_np_words(ws, prev_case)
        return None if np_ is None else f"и {np_[0]}"
    word, case = PREP[prep]
    np_ = compose_np_words(ws, case)
    if np_ is None:
        return None
    text = np_[0]
    if word == "в" and re.match(r"(?i)в[^аеёиоуыэюя]|ф[^аеёиоуыэюя]", text):
        word = "во"
    if word == "с" and re.match(r"(?i)с[^аеёиоуыэюя]|з[^аеёиоуыэюя]|щ|ш[^аеёиоуыэюя]", text):
        word = "со"
    if word == "к" and re.match(r"(?i)к[^аеёиоуыэюя]|г[^аеёиоуыэюя]", text):
        word = "ко"
    return f"{word} {text}".strip()


GRADE_WORDS = {
    # муж., жен., ср., мн. Слова те же, что уже стоят на сайте, только согласованы.
    "greater": ("большой", "большая", "большое", "большие"),
    "lesser": ("малый", "малая", "малое", "малые"),
    "major": ("старший", "старшая", "старшее", "старшие"),
    "minor": ("младший", "младшая", "младшее", "младшие"),
    "true": ("истинный", "истинная", "истинное", "истинные"),
    "moderate": ("средний", "средняя", "среднее", "средние"),
    "average": ("средний", "средняя", "среднее", "средние"),
    "superior": ("высший", "высшая", "высшее", "высшие"),
    "supreme": ("высший", "высшая", "высшее", "высшие"),
    "standard": ("обычный", "обычная", "обычное", "обычные"),
    "improved": ("улучшенный", "улучшенная", "улучшенное", "улучшенные"),
    "heroic": ("героический", "героическая", "героическое", "героические"),
    "young": ("молодой", "молодая", "молодое", "молодые"),
    "adult": ("взрослый", "взрослая", "взрослое", "взрослые"),
}


def grade_word(key: str, info: dict) -> str:
    forms = GRADE_WORDS[key]
    if info.get("number") == "plur":
        return forms[3]
    return {"femn": forms[1], "neut": forms[2]}.get(info.get("gender") or "masc", forms[0])


def compose(english: str) -> str | None:
    """Главная точка входа. None — если правило не уверено."""
    if english in ru.PHRASE_LOCK:
        return ru.PHRASE_LOCK[english]
    folded = ru.fold_accents(english)
    if folded in ru.PHRASE_LOCK:
        return ru.PHRASE_LOCK[folded]
    m = re.fullmatch(r"(.*?)\s*\(([^()]*)\)\s*", english)
    suffix = ""
    base = english
    if m:
        base, inner = m.group(1), m.group(2)
        head = compose(base)
        if head is None:
            return None
        info = head_info(head)
        key = inner.strip().lower()
        if ", " in key:
            bits = []
            for bit in inner.split(", "):
                low = bit.strip().lower()
                if low in GRADE_WORDS:
                    bits.append(grade_word(low, info))
                    continue
                part = compose(bit.strip())
                if part is None:
                    return None
                bits.append(part if proper_start(bit) else part[:1].lower() + part[1:])
            return f"{head} ({', '.join(bits)})"
        if key in GRADE_WORDS:
            word = grade_word(key, info)
            return f"{head} ({word})"
        nth = re.fullmatch(r"(\d+)(?:st|nd|rd|th)[- ]rank( spell)?", key)
        if nth:
            return f"{head} (заклинание ранга {nth.group(1)})" if nth.group(2) else f"{head} (ранг {nth.group(1)})"
        rank = re.fullmatch(r"(rank|type|level|grade)\s+(\w+)", key)
        if rank:
            label = {"rank": "ранг", "type": "тип", "level": "уровень", "grade": "класс"}[rank.group(1)]
            num = ROMAN.get(rank.group(2), rank.group(2))
            if not num.isdigit():
                return None
            return f"{head} ({label} {num})"
        inner_ru = compose(inner)
        if inner_ru is None:
            return None
        if kind_of(inner_ru) == "adj" and len(inner_ru.split()) == 1:
            inner_ru = inflect_adj(inner_ru.lower(), info, "nomn")
        else:
            inner_ru = inner_ru[:1].lower() + inner_ru[1:] if not proper_start(inner) else inner_ru
        return f"{head} ({inner_ru})"
    name = compose_core(base)
    if not name:
        return None
    name = re.sub(r"\s+", " ", name).strip()
    return name[:1].upper() + name[1:]


def proper_start(english: str) -> bool:
    first = (re.findall(r"[A-Za-z]+", english) or [""])[0].lower()
    return first in ru.PROPER


def head_info(russian: str) -> dict:
    first = russian.split()[0] if russian.split() else ""
    if first and kind_of(first) == "adj" and len(russian.split()) == 1:
        p = adj_parse(first)
        if p is not None:
            if "plur" in p.tag:
                return {"number": "plur"}
            return {"number": "sing", "gender": str(p.tag.gender or "masc")}
    for w in russian.split():
        w = w.strip("(),")
        if kind_of(w) == "noun":
            p = noun_parse(w)
            if p is not None:
                return {"number": "plur" if "plur" in p.tag else "sing", "gender": (str(p.tag.gender) if p.tag.gender else None), "anim": "anim" in p.tag}
    return {"number": "sing", "gender": "neut"}


if __name__ == "__main__":
    for line in sys.argv[1:]:
        print(line, "→", compose(line))


def _forms(word: str):
    return [p for p in parses(word.lower()) if p.score > 0.01] or parses(word.lower())[:1]


def problems(russian: str) -> list[str]:
    """Найти явный «словесный салат»: несогласованное прилагательное или два
    существительных подряд в именительном падеже."""
    found = []
    for chunk in re.split(r"[(),;:!?.«»—]", russian):
        found += _chunk_problems(chunk)
    return found


def _chunk_problems(chunk: str) -> list[str]:
    found = []
    words = re.findall(r"[А-Яа-яЁё]+(?:-[А-Яа-яЁё]+)?", chunk)
    for a, b in zip(words, words[1:]):
        fa, fb = _forms(a), _forms(b)
        adj = [p for p in fa if p.tag.POS in ("ADJF", "PRTF")]
        noun = [p for p in fb if p.tag.POS == "NOUN"]
        if adj and len(adj) == len(fa) and noun and len(noun) == len(fb):
            ok = False
            for x in adj:
                for y in noun:
                    if x.tag.case != y.tag.case and not (x.tag.case in ("accs", "nomn") and y.tag.case in ("accs", "nomn")):
                        continue
                    if "plur" in y.tag or "Pltm" in y.tag:
                        ok = ok or "plur" in x.tag
                    else:
                        ok = ok or str(x.tag.gender) == str(y.tag.gender) or "Ms-f" in y.tag or y.tag.gender is None
            if not ok:
                found.append(f"{a} {b}")
        if len(fa) and len(fb) and all(p.tag.POS == "NOUN" and p.tag.case == "nomn" for p in fa) and all(p.tag.POS == "NOUN" and p.tag.case == "nomn" for p in fb):
            if a[:1].islower() or b[:1].islower() or words.index(a) == 0:
                found.append(f"{a} {b}")
    return found
