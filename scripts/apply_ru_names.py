#!/usr/bin/env python3
"""Пересобрать русские имена без транслита. Чужой словарь не читается."""

from __future__ import annotations

import json
import re
from pathlib import Path

import ru_glossary as ru

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/generated"
LATIN = re.compile(r"[A-Za-z]")
DISCLAIMER = "Имя на экране собрано по словам и по буквам. Это не изданный перевод."
OWN = "Название собрано своими словами из открытого имени. Это не книжный перевод."


def rows_of(path: Path):
    data = json.loads(path.read_text())
    if isinstance(data, list):
        return data
    return None


def bad_tokens(english: str, russian: str) -> list[str]:
    if not english or not russian:
        return []
    hay = set(re.findall(r"[а-яё]+", russian.lower()))
    return [token for token in ru.translit_tokens(english) if token in hay]


def needs_rename(english: str, russian: str) -> bool:
    if LATIN.search(russian):
        return True
    if bad_tokens(english, russian):
        return True
    machine = ru.machine_name(english)
    return bool(machine) and machine.casefold() == russian.casefold()


def apply_list(path: Path, renamed: dict, left: list) -> None:
    rows = rows_of(path)
    if rows is None:
        return
    for row in rows:
        if not isinstance(row, dict):
            continue
        english = str(row.get("originalName") or "")
        if not english or "name" not in row:
            continue
        fresh = ru.compose(english)
        current = str(row.get("name") or "")
        phrase = english in ru.PHRASE_LOCK
        if fresh and not LATIN.search(fresh) and (phrase or needs_rename(english, current)):
            if fresh != current:
                renamed["count"] += 1
                row["name"] = fresh
        elif needs_rename(english, current):
            left.append(f"{path.name}:{row.get('id')}:{english}")
        text = row.get("text")
        if isinstance(text, str) and DISCLAIMER in text:
            row["text"] = text.replace(DISCLAIMER, OWN)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")


def refresh_index(path: Path, names: dict[str, str]) -> int:
    rows = rows_of(path)
    if rows is None:
        return 0
    changed = 0
    for row in rows:
        if not isinstance(row, dict):
            continue
        fresh = names.get(str(row.get("id")))
        if fresh and fresh != row.get("name"):
            row["name"] = fresh
            changed += 1
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")
    return changed


def heritage_name(heritage_id: str, ancestry_name: str) -> str | None:
    parts = [part for part in heritage_id.split("-") if part]
    if len(parts) >= 2:
        parts = parts[:-1]
    english = " ".join(parts)
    fresh = ru.compose(english)
    if not fresh or LATIN.search(fresh):
        return None
    return f"{fresh} {ancestry_name[:1].lower() + ancestry_name[1:]}" if ancestry_name else fresh


def apply_roster(path: Path, renamed: dict, left: list) -> None:
    data = json.loads(path.read_text())
    exact = {"yaoguai": "Яогуай", "exemplar": "Экземплар", "champion": "Поборник"}
    for group in ("ancestries", "classes"):
        for row in data.get(group) or []:
            if row.get("id") in exact and row.get("name") != exact[row["id"]]:
                row["name"] = exact[row["id"]]
                renamed["count"] += 1
            english = {"yaoguai": "Yaoguai", "exemplar": "Exemplar", "champion": "Champion"}.get(row.get("id"), "")
            if english and needs_rename(english, row.get("name") or ""):
                fresh = ru.compose(english)
                if fresh:
                    row["name"] = fresh
                    renamed["count"] += 1
                else:
                    left.append(f"roster:{row.get('id')}")
            for heritage in row.get("heritages") or []:
                fresh = heritage_name(str(heritage.get("id") or ""), str(row.get("name") or ""))
                if fresh and fresh != heritage.get("name"):
                    if needs_rename(str(heritage.get("id") or "").replace("-", " "), str(heritage.get("name") or "")) or LATIN.search(str(heritage.get("name") or "")):
                        heritage["name"] = fresh
                        renamed["count"] += 1
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")


def apply_features(path: Path, renamed: dict, left: list) -> None:
    if not path.exists():
        return
    rows = rows_of(path)
    if rows is None:
        return
    for row in rows:
        english = str(row.get("originalName") or "")
        fresh = ru.compose(english) if english else None
        if fresh and not LATIN.search(fresh):
            if fresh != row.get("name"):
                row["name"] = fresh
                renamed["count"] += 1
        elif english and needs_rename(english, str(row.get("name") or "")):
            left.append(f"feature:{english}")
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")


def main() -> None:
    renamed = {"count": 0}
    left: list[str] = []
    names: dict[str, str] = {}
    for name in ("pf-lists.json", "pf-wide.json", "pf-backgrounds.json", "pf-cards.json"):
        path = OUT / name
        if path.exists():
            apply_list(path, renamed, left)
    for name in ("pf-lists.json", "pf-wide.json", "pf-cards.json"):
        path = OUT / name
        if not path.exists():
            continue
        for row in json.loads(path.read_text()):
            if isinstance(row, dict) and row.get("id") and row.get("name"):
                names.setdefault(str(row["id"]), str(row["name"]))
    for name in ("pf-feat-index.json", "pf-feat-wide.json"):
        renamed["count"] += refresh_index(OUT / name, names)
    apply_roster(OUT / "pf-roster.json", renamed, left)
    apply_features(OUT / "pf-class-features.json", renamed, left)
    report = {"renamed": renamed["count"], "remaining": len(left), "sample": left[:30]}
    print(json.dumps(report, ensure_ascii=False, indent=1))
    (ROOT / "scripts" / "glossary" / "rename-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1) + "\n")


if __name__ == "__main__":
    main()
