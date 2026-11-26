#!/usr/bin/env python3
"""Собрать маленький словарь для теста согласования имён (src/data/name-grammar.test.ts).

Тест работает без pymorphy: ему нужен только список словоформ из имён Pathfinder
с родом и падежом. Сюда попадают:
- adj: формы прилагательных в именительном падеже, у которых нет другого чтения;
- noun: формы существительных без другого чтения, с родом (m/f/n) или «p» для множественного;
- nominative: те из них, что бывают только в именительном падеже («вера», «посвящение»).
Запуск после смены имён: python3 scripts/build_grammar_lexicon.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import ru_grammar as gr  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/generated"
FILES = ["pf-lists.json", "pf-wide.json", "pf-cards.json", "pf-core.json", "pf-legacy.json", "pf-backgrounds.json", "pf-class-features.json", "pf-paths.json"]
GENDER = {"masc": "m", "femn": "f", "neut": "n"}
# Имена народов, которые pymorphy читает как русские слова («сурки» — «сурок»).
LOANS = {"сурки", "кхоло", "тануки", "трипки", "атамару"}


def names() -> set[str]:
    found: set[str] = set()

    def walk(node):
        if isinstance(node, list):
            for item in node:
                walk(item)
        elif isinstance(node, dict):
            if isinstance(node.get("name"), str) and isinstance(node.get("originalName"), str):
                found.add(node["name"])
            for value in node.values():
                if isinstance(value, (list, dict)):
                    walk(value)

    for name in FILES:
        walk(json.loads((OUT / name).read_text()))
    return found


def tag_of(p) -> str:
    if "plur" in p.tag:
        return "p"
    return GENDER.get(str(p.tag.gender), "")


def main() -> None:
    # Слова из старых плохих примеров, чтобы тест мог проверить сам себя.
    words: set[str] = {"яростный", "месть", "щит", "вера", "мститель", "гнев", "голос", "природа", "стремительный", "добыча", "дуэлянт", "посвящение"}
    for name in names():
        words.update(w.lower() for w in re.findall(r"[А-Яа-яЁё]+", name))
    adj: dict[str, str] = {}
    noun: dict[str, str] = {}
    nominative: list[str] = []
    for word in sorted(words):
        if not gr.MORPH.word_is_known(word):
            continue
        found = [p for p in gr.parses(word) if p.score > 0.01] or gr.parses(word)[:1]
        tags = set(str(found[0].tag).replace(" ", ",").split(","))
        if {"Name", "Surn", "Geox", "Patr", "Fixd", "Abbr"} & tags:
            continue
        if word in LOANS:
            continue
        if all(p.tag.POS == "ADJF" for p in found) and all(p.tag.case in ("nomn", "accs") for p in found):
            nom = {tag_of(p) for p in found if p.tag.case == "nomn"} - {""}
            if nom:
                adj[word] = "".join(sorted(nom))
        elif all(p.tag.POS == "NOUN" for p in found):
            genders = {tag_of(p) for p in found} - {""}
            if genders and not any("Ms-f" in p.tag or "GNdr" in p.tag for p in found):
                noun[word] = "".join(sorted(genders))
            if all(p.tag.case == "nomn" for p in found):
                nominative.append(word)
    path = ROOT / "scripts" / "glossary" / "grammar-lexicon.json"
    path.write_text(json.dumps({"adj": adj, "noun": noun, "nominative": nominative}, ensure_ascii=False, indent=0, sort_keys=True) + "\n")
    print(json.dumps({"adj": len(adj), "noun": len(noun), "nominative": len(nominative)}))


if __name__ == "__main__":
    main()
