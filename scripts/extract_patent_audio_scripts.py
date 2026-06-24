#!/usr/bin/env python3
"""Extract Russian audio transcripts for patent listening blocks (Q1–4) from ГОТОВ 2026.docx."""
from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path

UZBEK_RE = re.compile(r"[ўғқҳӣЎҒҚҲӢ]")
QUESTION_LINE_RE = re.compile(r"^\s*(?:№\s*)?(\d+)\.\s+", re.MULTILINE)
SKIP_LINE_RE = re.compile(
    r"(?i)(прослушайте|выберите правильный ответ|эълонни тинглаб|✔)"
)
DOCX_DEFAULT = Path.home() / "Downloads" / "ГОТОВ 2026.docx"
OUTPUT_DEFAULT = Path(__file__).resolve().parent / "generated" / "patent_audio_scripts.json"


def load_docx_text(docx_path: Path) -> str:
    with zipfile.ZipFile(docx_path) as zf:
        xml = zf.read("word/document.xml").decode("utf-8")
    text = re.sub(r"</w:p>", "\n", xml)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n+", "\n", text)


UZBEK_PREFIXES = (
    "Ассалому",
    "Кечирасиз",
    "Илтимос",
    "Диққат",
    "Ҳурматли",
    "Айтинг-чи",
    "Марҳамат",
    "Йўқ",
)


def is_uzbek_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    if UZBEK_RE.search(stripped):
        return True
    normalized = stripped.lstrip("-– ").strip()
    return normalized.startswith(UZBEK_PREFIXES)


def normalize_dialog_raw(raw: str) -> str:
    return re.sub(r"([.!?])([–-])", r"\1\n\2", raw)


def find_question(section: str, number: int, occurrence: int = 1, end: int | None = None) -> re.Match[str] | None:
    limit = end if end is not None else len(section)
    seen = 0
    for match in QUESTION_LINE_RE.finditer(section[:limit]):
        if int(match.group(1)) != number:
            continue
        seen += 1
        if seen == occurrence:
            return match
    return None


def find_question_block_end(section: str, question_match: re.Match[str]) -> int:
    line_end = section.find("\n", question_match.start())
    pos = line_end + 1 if line_end != -1 else question_match.end()
    while pos < len(section):
        next_end = section.find("\n", pos)
        option_line = section[pos : next_end if next_end != -1 else None].strip()
        if not option_line:
            break
        if QUESTION_LINE_RE.match(option_line):
            break
        if re.match(r"^\d+\)\s", option_line):
            pos = next_end + 1 if next_end != -1 else len(section)
            continue
        break
    return pos


def find_ru_question(section: str, number: int) -> re.Match[str] | None:
    return find_question(section, number, occurrence=1)


def russian_narrative_text(raw: str) -> str:
    lines: list[str] = []
    for line in raw.split("\n"):
        stripped = line.strip()
        if not stripped or stripped == "ТИНГЛАШ":
            continue
        if is_uzbek_line(stripped):
            continue
        if QUESTION_LINE_RE.match(stripped):
            continue
        if re.match(r"^\d+\)\s", stripped):
            continue
        if SKIP_LINE_RE.search(stripped):
            continue
        lines.append(stripped)
    return "\n".join(lines).strip()


def extract_listening_section(full_text: str, variant_number: int) -> str:
    match = re.search(rf"ВАРИАНТ\s+{variant_number}\s*\n?АУДИРОВАНИЕ", full_text)
    if not match:
        raise ValueError(f"Variant {variant_number} listening section not found")
    start = match.end()
    end_match = re.search(r"ЧТЕНИЕ", full_text[start:])
    if not end_match:
        raise ValueError(f"Variant {variant_number} reading section not found")
    return full_text[start : start + end_match.start()]


def extract_variant_scripts(section: str) -> dict[str, str]:
    q1 = find_ru_question(section, 1)
    q2 = find_ru_question(section, 2)
    q3 = find_ru_question(section, 3)
    uz_q2 = find_question(section, 2, occurrence=2, end=q3.start() if q3 else None)
    if not q1 or not q2 or not q3 or not uz_q2:
        raise ValueError("Could not locate listening question markers")

    dialog_raw = normalize_dialog_raw(section[: q1.start()])
    announcement_raw = section[find_question_block_end(section, uz_q2) : q3.start()]

    return {
        "dialog": russian_narrative_text(dialog_raw),
        "announcement": russian_narrative_text(announcement_raw),
    }


def extract_all(docx_path: Path) -> dict[str, dict[str, str]]:
    full_text = load_docx_text(docx_path)
    results: dict[str, dict[str, str]] = {}
    for variant_number in range(1, 17):
        section = extract_listening_section(full_text, variant_number)
        scripts = extract_variant_scripts(section)
        if not scripts["dialog"] or not scripts["announcement"]:
            raise ValueError(
                f"Variant {variant_number} missing transcript: {scripts!r}"
            )
        results[str(variant_number)] = scripts
    return results


def main() -> None:
    docx_path = DOCX_DEFAULT
    output_path = OUTPUT_DEFAULT
    if not docx_path.exists():
        raise SystemExit(f"Missing source document: {docx_path}")

    scripts = extract_all(docx_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(scripts, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(scripts)} variant transcripts to {output_path}")


if __name__ == "__main__":
    main()
