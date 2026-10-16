#!/usr/bin/env python3
"""Build pf-progression.json from Foundry class JSON and class-feature sentences.

Only a rank named in the clause that belongs to that class is kept.
A shared paragraph's other classes are not copied across.
Spell slots above 1st rank are omitted: the packs cite a table they do not include.
"""

from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path

ROOT = Path("/tmp/pf2e/packs/pf2e")
OUT = Path("/workspace/src/data/generated/pf-progression.json")

PC = [
    "alchemist",
    "barbarian",
    "bard",
    "champion",
    "cleric",
    "druid",
    "fighter",
    "investigator",
    "monk",
    "oracle",
    "ranger",
    "rogue",
    "sorcerer",
    "swashbuckler",
    "witch",
    "wizard",
]

CLASS_NAMES = [
    "Alchemist",
    "Animist",
    "Barbarian",
    "Bard",
    "Champion",
    "Cleric",
    "Commander",
    "Druid",
    "Exemplar",
    "Fighter",
    "Guardian",
    "Gunslinger",
    "Inventor",
    "Investigator",
    "Kineticist",
    "Magus",
    "Monk",
    "Necromancer",
    "Oracle",
    "Psychic",
    "Ranger",
    "Rogue",
    "Runesmith",
    "Sorcerer",
    "Swashbuckler",
    "Thaumaturge",
    "Witch",
    "Wizard",
]
NAME_ALT = "|".join(sorted(CLASS_NAMES, key=len, reverse=True))
LIST_RE = re.compile(rf"(?:(?<=^)|(?<=\. ))((?:{NAME_ALT})(?:, (?:{NAME_ALT}))*) (?=[A-Z])")

RANK_WORD = {0: "untrained", 1: "trained", 2: "expert", 3: "master", 4: "legendary"}
SKIP_WEAPON = {"fighter weapon mastery", "weapon legend", "versatile legend"}


def plain(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    text = unescape(text)
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    return re.sub(r"\s+", " ", text).strip()


def feature_key(name: str) -> str:
    return re.sub(r"\s*\(level \d+\)", "", name, flags=re.I).strip().lower()


def load_features() -> dict[str, dict]:
    found: dict[str, dict] = {}
    for path in (ROOT / "class-features").rglob("*.json"):
        try:
            data = json.loads(path.read_text())
        except Exception:
            continue
        if not isinstance(data, dict) or "system" not in data:
            continue
        name = plain(str(data.get("name") or ""))
        desc = data.get("system", {}).get("description", {})
        html = desc.get("value", "") if isinstance(desc, dict) else ""
        row = {"name": name, "text": plain(html), "file": path.name}
        found[name.lower()] = row
        found[feature_key(name)] = row
    return found


def clauses_for(text: str, class_title: str) -> tuple[list[str], bool]:
    """Return clauses that apply, and whether the class was missing from a prefixed blob."""
    matches = list(LIST_RE.finditer(text))
    if not matches:
        return [text], False
    applicable: list[str] = []
    if matches[0].start() > 0:
        applicable.append(text[: matches[0].start()].strip())
    named = False
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        names = [part.strip() for part in match.group(1).split(",")]
        body = text[match.end() : end].strip()
        if class_title in names:
            named = True
            applicable.append(body)
    missing = not named and not (matches[0].start() > 0 and any("proficiency" in part.lower() for part in applicable))
    if not named:
        # A leading unprefixed sentence still applies. Prefixed clauses for others do not.
        missing = True
        applicable = [part for part in applicable if part]
    return applicable, missing and not any(class_title in text[m.start() : m.end()] for m in matches)


def proficiency_sentence(clause: str) -> str | None:
    parts = re.split(r"(?<=\.)\s+", clause)
    for part in parts:
        low = part.lower()
        if "proficiency" in low and re.search(r"\b(expert|master|legendary)\b", low):
            return part
    return None


def rank_of(sentence: str) -> str | None:
    match = re.search(r"increase(?:s)? to (expert|master|legendary)", sentence, re.I)
    if match:
        return match.group(1).lower()
    match = re.search(r"gain (expert|master|legendary) proficiency", sentence, re.I)
    if match:
        return match.group(1).lower()
    return None


def proficiency_bits(clause: str) -> list[str]:
    bits: list[str] = []
    for part in re.split(r"(?<=\.)\s+", clause):
        chunks = [part]
        if len(re.findall(r"increases? to", part, re.I)) >= 2:
            chunks = re.split(r", and ", part)
        for chunk in chunks:
            if "proficiency" in chunk.lower() and rank_of(chunk):
                bits.append(chunk.strip())
    return bits


def keys_of(sentence: str) -> list[tuple[str, str]]:
    low = sentence.lower()
    found: list[tuple[str, str]] = []
    if "will save" in low:
        found.append(("save", "will"))
    if "fortitude save" in low:
        found.append(("save", "fort"))
    if "reflex save" in low:
        found.append(("save", "ref"))
    if re.search(r"\bperception\b", low):
        found.append(("perception", "perception"))
    if "class dc" in low or re.search(r"\branger dc\b", low):
        found.append(("classDc", "classDc"))
    if "spell attack" in low or "spell dc" in low:
        found.append(("spell", "spell"))
    if "unarmored" in low:
        found.append(("armor", "unarmored"))
    if "light armor" in low or re.search(r"\blight,", low) or "light and" in low:
        found.append(("armor", "light"))
    if "medium armor" in low or "medium," in low or "and medium" in low:
        found.append(("armor", "medium"))
    if "heavy armor" in low or "and heavy" in low:
        found.append(("armor", "heavy"))
    if "simple weapon" in low:
        found.append(("weapon", "simple"))
    if "martial weapon" in low:
        found.append(("weapon", "martial"))
    if "unarmed" in low:
        found.append(("weapon", "unarmed"))
    if "advanced weapon" in low:
        found.append(("weapon", "advanced"))
    if "alchemical bomb" in low:
        found.append(("weapon", "bomb"))
    # de-duplicate
    seen = set()
    unique = []
    for item in found:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def conditional_of(sentence: str) -> str | None:
    low = sentence.lower()
    if "qi spell" in low:
        return "qi"
    if "warden spell" in low:
        return "warden"
    return None


def choice_save(sentence: str) -> bool:
    low = sentence.lower()
    return (
        "chosen saving throw" in low
        or "choose your fortitude" in low
        or "choose a different saving throw" in low
        or "choose one of the saving throws" in low
    )


def spell_counts(text: str) -> dict:
    """Pull only the 1st-rank and cantrip counts written in the feature."""
    low = text.lower()
    rank1 = None
    for pattern in (
        r"up to (two|three) 1st-rank",
        r"prepare (?:up to )?(two|three) 1st-rank",
        r"can prepare (?:up to )?(two|three) 1st-rank",
    ):
        match = re.search(pattern, low)
        if match:
            rank1 = {"two": 2, "three": 3}[match.group(1)]
            break
    cantrips = None
    match = re.search(r"\b(two|three|four|five) cantrips\b", low)
    if match:
        cantrips = {"two": 2, "three": 3, "four": 4, "five": 5}[match.group(1)]
    tenth = "single 10th-rank spell slot" in low or "a single 10th-rank spell slot" in low
    return {"rank1": rank1, "cantrips": cantrips, "tenth": tenth}


def main() -> None:
    features = load_features()
    classes = {}
    for class_id in PC:
        data = json.loads((ROOT / "classes" / f"{class_id}.json").read_text())
        system = data["system"]
        title = data["name"]
        attacks = system["attacks"]
        defenses = system["defenses"]
        saves = system["savingThrows"]
        start = {
            "fort": RANK_WORD[saves["fortitude"]],
            "ref": RANK_WORD[saves["reflex"]],
            "will": RANK_WORD[saves["will"]],
            "perception": RANK_WORD[system["perception"]],
            "classDc": "trained",
            "spell": "trained" if system.get("spellcasting") else "untrained",
            "armor": {key: RANK_WORD[defenses[key]] for key in ("unarmored", "light", "medium", "heavy")},
            "weapon": {
                "simple": RANK_WORD[attacks["simple"]],
                "martial": RANK_WORD[attacks["martial"]],
                "unarmed": RANK_WORD[attacks["unarmed"]],
                "advanced": RANK_WORD[attacks["advanced"]],
                "bomb": "untrained",
            },
        }
        if class_id == "alchemist":
            start["weapon"]["bomb"] = start["weapon"]["simple"]
        bumps = []
        gaps = []
        spec = None
        greater = None
        notes = []
        granted = []
        for item in system["items"].values():
            raw_name = item.get("name") or ""
            level = int(item.get("level") or 0)
            key = feature_key(raw_name)
            feature = features.get(raw_name.lower()) or features.get(key)
            if not feature:
                gaps.append(f"{level} {raw_name}: файла особенности нет")
                continue
            granted.append({"level": level, "name": feature["name"]})
            if "weapon specialization" in key and "greater" not in key:
                spec = level
            if "greater weapon specialization" in key:
                greater = level
            text = feature["text"]
            pieces, missing_name = clauses_for(text, title)
            if missing_name and "proficiency" in text.lower() and key not in SKIP_WEAPON:
                # Only a gap when this class is not named and there is no unprefixed proficiency sentence.
                unprefixed = pieces and any("proficiency" in piece.lower() for piece in pieces)
                if not unprefixed:
                    gaps.append(f"{level} {feature['name']}: в тексте нет фразы для этого класса")
                    continue
            if "doctrine" in key and "Cloistered Cleric" in text and "Warpriest" in text:
                notes.append(f"{level} {feature['name']}: доктрина выбирается, ранги сами не включаются")
                continue
            for piece in pieces:
                if choice_save(piece):
                    sentence = next((bit for bit in proficiency_bits(piece) if "sav" in bit.lower()), None)
                    rank = rank_of(sentence or piece) or "master"
                    notes.append(f"{level} {feature['name']}: испытание выбирает игрок")
                    bumps.append({
                        "level": level,
                        "rank": rank,
                        "kind": "save-choice",
                        "keys": ["fort", "ref", "will"],
                        "feature": feature["name"],
                    })
                    continue
                for sentence in proficiency_bits(piece):
                    rank = rank_of(sentence)
                    pairs = keys_of(sentence)
                    if key in SKIP_WEAPON:
                        pairs = [pair for pair in pairs if pair[0] != "weapon"]
                    if not rank or not pairs:
                        if "proficiency" in sentence.lower() and key not in SKIP_WEAPON:
                            notes.append(f"{level} {feature['name']}: ранг в фразе есть, цель не разобрана")
                        continue
                    cond = conditional_of(sentence)
                    grouped: dict[str, list[str]] = {}
                    for kind, slot in pairs:
                        grouped.setdefault(kind, []).append(slot)
                    for kind, keys in grouped.items():
                        bumps.append({
                            "level": level,
                            "rank": rank,
                            "kind": kind,
                            "keys": keys,
                            "feature": feature["name"],
                            **({"when": cond} if cond else {}),
                        })
            if key in SKIP_WEAPON:
                notes.append(f"{level} {feature['name']}: оружие воина считается по выбранной группе")
        spell = {"rank1": None, "cantrips": None, "tenthAt": None}
        casting = features.get(f"{class_id} spellcasting")
        if casting:
            counts = spell_counts(casting["text"])
            spell["rank1"] = counts["rank1"]
            spell["cantrips"] = counts["cantrips"]
        clarity = features.get("oracular clarity")
        if class_id == "oracle" and clarity and spell_counts(clarity["text"])["tenth"]:
            # The class grants it at 19. Confirm from items.
            for item in system["items"].values():
                if (item.get("name") or "").lower().startswith("oracular clarity"):
                    spell["tenthAt"] = int(item.get("level") or 19)
        if class_id == "cleric":
            classes_doctrine = doctrine_options(features)
        else:
            classes_doctrine = None
        deduped = []
        seen_bumps = set()
        for bump in bumps:
            mark = (bump["level"], bump["kind"], tuple(bump["keys"]), bump["rank"], bump.get("when"), bump["feature"])
            if mark in seen_bumps:
                continue
            seen_bumps.add(mark)
            deduped.append(bump)
        bumps = deduped
        classes[class_id] = {
            "name": title,
            "hp": system["hp"],
            "spellcasting": system.get("spellcasting") or 0,
            "start": start,
            "bumps": bumps,
            "weaponSpec": spec,
            "greaterWeaponSpec": greater,
            "weaponTrack": "fighter" if class_id == "fighter" else "category",
            "spell": spell,
            "gaps": gaps,
            "notes": notes,
            **({"doctrine": classes_doctrine} if classes_doctrine else {}),
        }
    payload = {
        "source": "Foundry pf2e class and class-feature packs, ORC. Ranks are taken from the class-scoped sentence. The spells-per-day table is cited and not present, so only the written 1st-rank count is stored.",
        "classes": classes,
        "curse": curse_table(),
        "runes": rune_table(),
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print("wrote", OUT)
    for class_id, row in classes.items():
        print(f"\n## {class_id} spec {row['weaponSpec']} greater {row['greaterWeaponSpec']} slots {row['spell']}")
        for bump in row["bumps"]:
            when = f" if {bump['when']}" if bump.get("when") else ""
            print(f"  L{bump['level']} {bump['kind']} {','.join(bump['keys'])} -> {bump['rank']}{when} ({bump['feature']})")
        for gap in row["gaps"]:
            print("  GAP", gap)
        for note in row["notes"]:
            print("  NOTE", note)


def doctrine_options(features: dict[str, dict]) -> dict:
    """Cloistered and warpriest sentences. Favored weapon is not every martial weapon."""
    out: dict[str, list] = {"cloistered": [], "warpriest": []}
    for key, side in (
        ("first doctrine (cloistered cleric)", "cloistered"),
        ("second doctrine (cloistered cleric)", "cloistered"),
        ("third doctrine (cloistered cleric)", "cloistered"),
        ("fourth doctrine (cloistered cleric)", "cloistered"),
        ("fifth doctrine (cloistered cleric)", "cloistered"),
        ("final doctrine (cloistered cleric)", "cloistered"),
        ("first doctrine (warpriest)", "warpriest"),
        ("second doctrine (warpriest)", "warpriest"),
        ("third doctrine (warpriest)", "warpriest"),
        ("fourth doctrine (warpriest)", "warpriest"),
        ("fifth doctrine (warpriest)", "warpriest"),
        ("final doctrine (warpriest)", "warpriest"),
    ):
        feature = features.get(key)
        if not feature:
            continue
        text = feature["text"]
        level = {
            "first": 1,
            "second": 3,
            "third": 7,
            "fourth": 11,
            "fifth": 15,
            "final": 19,
        }[key.split()[0]]
        for part in re.split(r"(?<=\.)\s+", text):
            low = part.lower()
            at = 13 if "at 13th level" in low else level
            if "trained in light and medium armor" in low and "fortitude" in low:
                out[side].append({"level": at, "rank": "trained", "kind": "armor", "keys": ["light", "medium"], "feature": feature["name"]})
                out[side].append({"level": at, "rank": "expert", "kind": "save", "keys": ["fort"], "feature": feature["name"]})
                continue
            if "trained in light and medium armor" in low:
                out[side].append({"level": at, "rank": "trained", "kind": "armor", "keys": ["light", "medium"], "feature": feature["name"]})
            match = re.search(r"(?:have|gain) (expert|master|legendary) proficiency", part, re.I)
            increases = re.search(r"increase(?:s)? to (expert|master|legendary)", part, re.I)
            rank = (match or increases).group(1).lower() if (match or increases) else None
            if not rank or "proficiency" not in low:
                continue
            pairs = [pair for pair in keys_of(part) if pair[1] != "bomb"]
            # "favored weapon" is not a category bump.
            pairs = [pair for pair in pairs if not (pair[0] == "weapon" and "favored weapon" in low and pair[1] == "martial" and "martial weapons" not in low)]
            if "favored weapon" in low and "martial weapons" not in low:
                pairs = [pair for pair in pairs if pair[0] != "weapon" or pair[1] in ("simple", "unarmed")]
            grouped: dict[str, list[str]] = {}
            for kind, slot in pairs:
                grouped.setdefault(kind, []).append(slot)
            for kind, keys in grouped.items():
                out[side].append({"level": at, "rank": rank, "kind": kind, "keys": keys, "feature": feature["name"]})
    return out


def curse_table() -> dict:
    """Stage numbers copied from the curse feature sentences, not from memory."""
    return {
        "max": [{"level": 1, "value": 2}, {"level": 11, "value": 3}, {"level": 17, "value": 4}],
        "mysteries": {
            "cosmos": {"name": "Зов неба", "file": "curse-of-the-skys-call"},
            "lore": {"name": "Поток знания", "file": "curse-of-torrential-knowledge"},
            "flames": {"name": "Пожирающее пламя", "file": "curse-of-engulfing-flames"},
            "bones": {"name": "Живая смерть", "file": "curse-of-the-living-death"},
            "life": {"name": "Изливающаяся жизнь", "file": "curse-of-outpouring-life"},
            "battle": {"name": "Смертный воин", "file": "curse-of-the-mortal-warrior"},
            "ancestors": {"name": "Предки", "file": "curse-of-ancestral-meddling"},
            "tempest": {"name": "Встречный ветер", "file": "curse-of-inclement-headwinds"},
        },
    }


def rune_table() -> dict:
    return {
        "weaponPotency": [
            {"id": "weapon-potency-1", "value": 1, "propertySlots": 1},
            {"id": "weapon-potency-2", "value": 2, "propertySlots": 2},
            {"id": "weapon-potency-3", "value": 3, "propertySlots": 3},
        ],
        "striking": [
            {"id": "striking", "extraDice": 1, "totalDice": 2},
            {"id": "striking-greater", "extraDice": 2, "totalDice": 3},
            {"id": "striking-major", "extraDice": 3, "totalDice": 4},
        ],
        "armorPotency": [
            {"id": "armor-potency-1", "value": 1, "propertySlots": 1},
            {"id": "armor-potency-2", "value": 2, "propertySlots": 2},
            {"id": "armor-potency-3", "value": 3, "propertySlots": 3},
        ],
        "resilient": [
            {"id": "resilient", "value": 1},
            {"id": "resilient-greater", "value": 2},
            {"id": "resilient-major", "value": 3},
        ],
    }


if __name__ == "__main__":
    main()
