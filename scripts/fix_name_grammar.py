#!/usr/bin/env python3
"""Пересобрать машинные имена Pathfinder с согласованием слов.

Запуск: python3 scripts/fix_name_grammar.py  (нужен pymorphy3, см. ru_grammar.py)

Что трогаем:
- имя, которое совпадает со старой пословной сборкой (ru_glossary.compose);
- имя, в котором видна несогласованность («Яростный месть», «Щит вера»);
- заглушки вроде «особенность класса» вместо имени;
- имена из ручного списка scripts/pf_names_3.json — всегда.
Имена, которые кто-то уже поправил руками и которые читаются нормально, не трогаем.
После переименования те же имена в кавычках «…» в описаниях меняются тоже.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import ru_glossary as ru  # noqa: E402
import ru_grammar as gr  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/generated"
FORCE_FILE = ROOT / "scripts" / "pf_names_3.json"
LISTS = ["pf-lists.json", "pf-wide.json", "pf-cards.json", "pf-core.json", "pf-legacy.json", "pf-backgrounds.json", "pf-class-features.json", "pf-paths.json"]
INDEX = ["pf-feat-index.json", "pf-feat-wide.json"]
PLACEHOLDER = {"особенность класса", "Заклинание", "Черта", "Предмет"}
LATIN = re.compile(r"[A-Za-z]")


def load_force() -> dict[str, str]:
    if not FORCE_FILE.exists():
        return {}
    data = json.loads(FORCE_FILE.read_text())
    return {k: v for k, v in data.items() if isinstance(v, str) and not k.startswith("_")}


FORCE = load_force()
# (id, английское имя) -> новое имя: чтобы одна черта звалась одинаково во всех списках.
SAME: dict[tuple[str, str], str] = {}


def machine_made(english: str, current: str) -> bool:
    if not current or current in PLACEHOLDER:
        return True
    if current == ru.compose(english):
        return True
    if gr.problems(current):
        return True
    if english.endswith("Dedication") and not current.startswith("Посвящение"):
        return True
    return False


def fresh_name(english: str, current: str, key: str = "") -> str | None:
    for k in (key, english):
        if k and k in FORCE:
            return FORCE[k]
    if not machine_made(english, current):
        return None
    new = gr.compose(english)
    if not new or LATIN.search(new) or gr.problems(new):
        return None
    return new


def walk(node, renamed: dict[str, str], log: list) -> None:
    if isinstance(node, list):
        for item in node:
            walk(item, renamed, log)
        return
    if not isinstance(node, dict):
        return
    english = node.get("originalName")
    current = node.get("name")
    if isinstance(english, str) and isinstance(current, str):
        new = fresh_name(english, current, str(node.get("id") or ""))
        if new and new != current:
            node["name"] = new
            renamed[current] = new
            if node.get("id"):
                renamed["#" + str(node["id"])] = new
                SAME[(str(node["id"]), english)] = new
            log.append((english, current, new))
    for value in node.values():
        if isinstance(value, (list, dict)):
            walk(value, renamed, log)


def unify(node) -> None:
    if isinstance(node, list):
        for item in node:
            unify(item)
    elif isinstance(node, dict):
        key = (str(node.get("id") or ""), str(node.get("originalName") or ""))
        if key in SAME and isinstance(node.get("name"), str):
            node["name"] = SAME[key]
        for value in node.values():
            if isinstance(value, (list, dict)):
                unify(value)


def by_id(node, names: dict[str, str]) -> int:
    """Списки без английского имени (индексы, наследия) — по id."""
    changed = 0
    if isinstance(node, list):
        for item in node:
            changed += by_id(item, names)
    elif isinstance(node, dict):
        key = str(node.get("id") or "")
        if key and key in names and isinstance(node.get("name"), str) and node["name"] != names[key]:
            node["name"] = names[key]
            changed += 1
        for value in node.values():
            if isinstance(value, (list, dict)):
                changed += by_id(value, names)
    return changed


def retext(node, pairs: list[tuple[str, str]]) -> int:
    """Поменять старое имя в кавычках «…» в текстах."""
    hits = 0
    if isinstance(node, list):
        for i, item in enumerate(node):
            if isinstance(item, str):
                new = quote_swap(item, pairs)
                if new != item:
                    node[i] = new
                    hits += 1
            else:
                hits += retext(item, pairs)
    elif isinstance(node, dict):
        for key, value in node.items():
            if key in ("name", "originalName", "id", "link", "sourceId"):
                continue
            if isinstance(value, str):
                new = quote_swap(value, pairs)
                if new != value:
                    node[key] = new
                    hits += 1
            else:
                hits += retext(value, pairs)
    return hits


QUOTE = re.compile(r"«([^«»]+)»")


def quote_swap(text: str, table: dict[str, str]) -> str:
    if "«" not in text:
        return text
    return QUOTE.sub(lambda m: "«" + table.get(m.group(1), m.group(1)) + "»", text)


# Требования, которые правило не разбирает: целиком.
PREREQ_FIX = {
    "посвящение: рыцарь бдительный": "посвящение бдительного рыцаря",
    "посвящение: страж или рыцарь бдительный": "посвящение стража или бдительного рыцаря",
    "посвящение: страж или часовой": "посвящение стража или часового",
    "посвящение: следопыт агент": "посвящение агента-следопыта",
    "посвящение: стрелок или парный-оружие воин": "посвящение стрелка или воина с двумя оружиями",
    "посвящение: награда охотник посвящение или игра охотник": "посвящение охотника за головами или охотника на дичь",
    "водный эльф наследие": "наследие «Водный эльф»",
    "оборонительный автоматон наследие": "наследие «Оборонительный автоматон»",
    "бездонный или белая акула морелюди наследие": "наследие «Бездонный морской народ» или «Морской народ белой акулы»",
    "плавание звериный наследие, водный": "наследие «Плавающее животное» или водный народ",
}


def np_gent(text: str) -> str | None:
    words = text.split()
    kinds = [gr.kind_of(w) for w in words]
    if not kinds or kinds[-1] != "noun" or not all(k == "adj" for k in kinds[:-1]):
        return None
    head, info = gr.inflect_noun(words[-1], "gent")
    return " ".join([gr.inflect_adj(w, info, "gent") for w in words[:-1]] + [head])


def tail_word(part: str, lower: dict[str, str]) -> str:
    """«магус посвящение» -> «посвящение магуса»;
    «кидзимуна гном наследие» -> «наследие «Гном-кидзимуна»»."""
    m = re.fullmatch(r"(.+?) (посвящение|наследие)", part.strip())
    if not m:
        return part
    kind = m.group(2)
    bits = re.split(r"(, | или )", m.group(1))
    out = []
    for bit in bits:
        if bit in (", ", " или "):
            out.append(bit)
            continue
        bit = re.sub(r" (посвящение|наследие)$", "", bit.strip())
        known = lower.get(bit.lower())
        if kind == "наследие":
            if not known:
                return part
            out.append("«" + known[:1].upper() + known[1:] + "»")
        else:
            gen = np_gent(bit)
            if gen is None:
                return f"посвящение: {m.group(1)}"
            out.append(gen)
    return f"{kind} {''.join(out)}"


def main() -> None:
    renamed: dict[str, str] = {}
    log: list = []
    data = {}
    for name in LISTS:
        path = OUT / name
        data[name] = json.loads(path.read_text())
        walk(data[name], renamed, log)
    for node in data.values():
        unify(node)
    ids = {k[1:]: v for k, v in renamed.items() if k.startswith("#")}
    # Остальные имена по id из основных списков, чтобы индексы совпадали.
    for name in ("pf-lists.json", "pf-wide.json", "pf-cards.json"):
        for row in data[name]:
            if isinstance(row, dict) and row.get("id") and row.get("name"):
                ids.setdefault(str(row["id"]), str(row["name"]))
    for name in INDEX:
        path = OUT / name
        data[name] = json.loads(path.read_text())
        by_id(data[name], ids)
    # Наследия без английского имени: только ручной список «id:…».
    forced = {k[3:]: v for k, v in FORCE.items() if k.startswith("id:")}
    for name in ("pf-roster.json", "pf-heritages.json"):
        path = OUT / name
        data[name] = json.loads(path.read_text())
        node = data[name]
        if name == "pf-roster.json":
            groups = [a.get("heritages") or [] for a in node.get("ancestries") or []] + [node.get("companions") or []]
        else:
            groups = list(node.values())
        for group in groups:
            for her in group:
                new = forced.get(str(her.get("id")))
                if new and her.get("name") != new:
                    renamed[her["name"]] = new
                    her["name"] = new
    table = {old: new for old, new in renamed.items() if not old.startswith("#") and " " in old}
    hits = sum(retext(node, table) for node in data.values())
    # Требования в карточках («магус посвящение») — те же старые имена строчными.
    lower = {}
    for english, old, new in log:
        keep = gr.proper_start(english)
        lower[old.lower()] = new if keep else new[:1].lower() + new[1:]
    for row in data["pf-cards.json"]:
        note = row.get("prereqNote")
        if isinstance(note, str) and note:
            parts = [lower.get(part.strip().lower()) or tail_word(part, lower) for part in note.split("; ")]
            parts = [PREREQ_FIX.get(part, part) for part in parts]
            fixed = "; ".join(parts)
            if fixed != note:
                row["prereqNote"] = fixed
                hits += 1
    for name, node in data.items():
        path = OUT / name
        lines = path.read_text().splitlines()
        indent = len(lines[1]) - len(lines[1].lstrip()) if len(lines) > 1 else 1
        path.write_text(json.dumps(node, ensure_ascii=False, indent=indent or 1) + "\n")
    report = {"renamed_rows": len(log), "unique_names": len({e for e, _, _ in log}), "text_mentions": hits}
    print(json.dumps(report, ensure_ascii=False))
    (ROOT / "scripts" / "glossary" / "grammar-report.json").write_text(
        json.dumps({**report, "sample": [f"{a} | {b} → {c}" for a, b, c in log[:200]]}, ensure_ascii=False, indent=1) + "\n"
    )


if __name__ == "__main__":
    main()
