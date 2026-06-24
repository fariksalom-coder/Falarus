#!/usr/bin/env python3
"""Extract Uzbek question translations for patent exam hints from ГОТОВ 2026.docx."""
from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path

UZBEK_RE = re.compile(r"[ўғқҳӣЎҒҚҲӢ]")
QUESTION_LINE_RE = re.compile(r"^\s*(?:№\s*)?(\d+)\.\s+", re.MULTILINE)
EMBEDDED_QUESTION_RE = re.compile(r"(?<!\d)(\d{1,2})\.\s+(?=[А-ЯЁA-ZҲЎ«])")
OPTION_RE = re.compile(r"^\d+\)\s")
SECTION_MARKERS = (
    "ЛЕКСИКА",
    "ИСТОРИЯ",
    "ПИСЬМО",
    "ПРАВО",
    "ОСНОВЫ",
    "АУДИРОВАНИЕ",
    "ЧТЕНИЕ",
    "ТИНГЛАШ",
    "ЎҚИШ",
    "ЁЗИШ",
    "Анкета",
)
UZBEK_PREFIXES = (
    "Ассалому",
    "Кечирасиз",
    "Илтимос",
    "Диққат",
    "Ҳурматли",
    "Айтинг-чи",
    "Марҳамат",
    "Йўқ",
    "- Исмингиз",
    "-Сиз",
)

DOCX_DEFAULT = Path.home() / "Downloads" / "ГОТОВ 2026.docx"
OUTPUT_DEFAULT = Path(__file__).resolve().parent / "generated" / "patent_question_hints.json"


def load_docx_text(docx_path: Path) -> str:
    with zipfile.ZipFile(docx_path) as zf:
        xml = zf.read("word/document.xml").decode("utf-8")
    text = re.sub(r"</w:p>", "\n", xml)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n+", "\n", text)


def is_uzbek_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if UZBEK_RE.search(stripped):
        return True
    return stripped.lstrip("-– ").startswith(UZBEK_PREFIXES)


def normalize_text(value: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        value.replace("ё", "е").replace("_", "").replace("✔", "").strip().lower(),
    )


def iter_question_markers(section: str) -> list[tuple[int, int, re.Match[str]]]:
    markers: list[tuple[int, int, re.Match[str]]] = []
    for match in QUESTION_LINE_RE.finditer(section):
        markers.append((match.start(), int(match.group(1)), match))
    for match in EMBEDDED_QUESTION_RE.finditer(section):
        if any(abs(match.start() - existing[0]) < 3 for existing in markers):
            continue
        markers.append((match.start(), int(match.group(1)), match))
    markers.sort(key=lambda item: item[0])
    return markers


def find_question(section: str, number: int, occurrence: int = 1) -> re.Match[str] | None:
    seen = 0
    for _, qnum, match in iter_question_markers(section):
        if qnum != number:
            continue
        seen += 1
        if seen == occurrence:
            return match
    return None


def should_stop_line(stripped: str) -> bool:
    if OPTION_RE.match(stripped):
        return True
    if stripped.startswith("Ответ:") or stripped.startswith("Жавоб:"):
        return True
    if any(marker in stripped for marker in SECTION_MARKERS):
        return True
    if stripped in {"✔", "\xa0✔"}:
        return True
    if stripped.endswith("✔") and len(stripped) < 48 and re.search(r"\d", stripped):
        return True
    return False


def block_content_lines(section: str, qnum: int, occurrence: int) -> list[str]:
    match = find_question(section, qnum, occurrence)
    if not match:
        return []

    line_end = section.find("\n", match.start())
    first = section[match.end() : line_end if line_end != -1 else None].strip()
    lines: list[str] = []
    if first and first not in {"✔", "\xa0✔"}:
        lines.append(first)

    pos = line_end + 1 if line_end != -1 else match.end()
    while pos < len(section):
        next_end = section.find("\n", pos)
        stripped = section[pos : next_end if next_end != -1 else None].strip()
        if not stripped or stripped in {"✔", "\xa0✔"}:
            pos = next_end + 1 if next_end != -1 else len(section)
            continue
        if QUESTION_LINE_RE.match(stripped) or EMBEDDED_QUESTION_RE.match(stripped):
            break
        if should_stop_line(stripped):
            break
        lines.append(stripped)
        pos = next_end + 1 if next_end != -1 else len(section)

    return lines


def pick_hint(ru_lines: list[str], uz_lines: list[str], target: str) -> str | None:
    ru = [line.strip() for line in ru_lines if line.strip() and line.strip() not in {"✔", "\xa0✔"}]
    uz = [line.strip() for line in uz_lines if line.strip() and line.strip() not in {"✔", "\xa0✔"}]

    if not uz and ru and all(is_uzbek_line(line) for line in ru):
        return ru[-1]

    target_norm = normalize_text(target)
    for index, ru_line in enumerate(ru):
        ru_norm = normalize_text(ru_line)
        if (
            target_norm in ru_norm
            or ru_norm in target_norm
            or (len(target_norm) > 10 and target_norm[:20] in ru_norm)
            or (len(ru_norm) > 10 and ru_norm[:20] in target_norm)
        ):
            if index < len(uz):
                return uz[index]

    uz_only = [line for line in uz if is_uzbek_line(line)]
    if len(uz_only) == 1:
        return uz_only[0]
    if uz_only:
        return uz_only[-1]
    if uz:
        return uz[-1]
    return None


def extract_variant_section(full_text: str, variant_number: int) -> str:
    match = re.search(rf"ВАРИАНТ\s+{variant_number}\s*\n?АУДИРОВАНИЕ", full_text)
    if not match:
        raise ValueError(f"Variant {variant_number} not found")
    start = match.start()
    end_match = re.search(rf"ВАРИАНТ\s+{variant_number + 1}", full_text[start + 10 :])
    return full_text[start : start + 10 + end_match.start()] if end_match else full_text[start:]


def extract_all(docx_path: Path) -> dict[str, str]:
    full_text = load_docx_text(docx_path)
    hints: dict[str, str] = {}

    for variant_number in range(1, 17):
        section = extract_variant_section(full_text, variant_number)
        for question_number in range(1, 23):
            key = f"P_{variant_number}_{question_number}"
            ru_lines = block_content_lines(section, question_number, 1)
            uz_lines = block_content_lines(section, question_number, 2)
            if not ru_lines and not uz_lines:
                continue

            # Use Russian lines to pick the best Uzbek line; fallback to Uzbek-only block.
            target = ru_lines[-1] if ru_lines else ""
            hint = pick_hint(ru_lines, uz_lines, target)
            if hint:
                hints[key] = hint

    return hints


def main() -> None:
    docx_path = DOCX_DEFAULT
    output_path = OUTPUT_DEFAULT
    if not docx_path.exists():
        raise SystemExit(f"Missing source document: {docx_path}")

    hints = extract_all(docx_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(hints, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(hints)} question hints to {output_path}")


if __name__ == "__main__":
    main()
