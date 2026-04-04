#!/usr/bin/env python3
"""
Normalize GitHub-flavored markdown tables to satisfy markdownlint MD060 (compact style):
each | must have exactly one space on each side within a cell boundary.

Delimiter rows like |-------|--------| become | --- | --- |.
Data rows are rebuilt as | cell | cell | with trimmed cell content.
"""

from __future__ import annotations

import sys
from pathlib import Path


def is_delimiter_cell(cell: str) -> bool:
    c = cell.strip()
    if not c:
        return False
    if not all(ch in "-:" for ch in c):
        return False
    return "-" in c


def split_table_row(line: str) -> list[str] | None:
    s = line.rstrip("\n\r")
    t = s.strip()
    if not (t.startswith("|") and t.endswith("|")):
        return None
    inner = t[1:-1]
    return [c.strip() for c in inner.split("|")]


def normalize_cell_content(cell: str) -> str:
    """
    Compact style allows only a single space between | and cell text; a truly
    empty cell would become |  | (two spaces) and violates MD060. Use a dash.
    """
    c = cell.strip()
    return c if c else "—"


def normalize_table_row(cells: list[str]) -> str:
    if not cells:
        return "| — |"
    if all(is_delimiter_cell(c) for c in cells):
        return "| " + " | ".join(["---"] * len(cells)) + " |"
    return "| " + " | ".join(normalize_cell_content(c) for c in cells) + " |"


def process_lines(lines: list[str]) -> list[str]:
    out: list[str] = []
    in_fence = False
    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence:
            out.append(line)
            continue

        cells = split_table_row(line)
        if cells is not None:
            out.append(normalize_table_row(cells))
        else:
            out.append(line.rstrip("\n\r"))
    return out


def process_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "\r\n" in text:
        newline = "\r\n"
    else:
        newline = "\n"
    lines = text.splitlines(keepends=False)
    new_lines = process_lines(lines)
    new_text = newline.join(new_lines)
    if new_text and not new_text.endswith(newline):
        new_text += newline
    if new_text == text:
        return False
    path.write_text(new_text, encoding="utf-8")
    return True


def main() -> int:
    roots = [
        Path("compliance"),
        Path("notion"),
        Path("legal"),
        Path("audit"),
    ]
    extra = [
        Path("REPOSITORY_STRUCTURE.md"),
        Path("CONTROLLED_DOCUMENT_INDEX.md"),
        Path("compliance/ASSUMPTIONS_AND_SCOPE.md"),
    ]
    changed = 0
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.md")):
            if process_file(path):
                changed += 1
                print(f"updated: {path}")
    for p in extra:
        if p.exists() and process_file(p):
            changed += 1
            print(f"updated: {p}")
    print(f"Done. {changed} file(s) changed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
