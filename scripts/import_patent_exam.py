from __future__ import annotations

import argparse
import json
import re
import shutil
import zipfile
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
CELL_REF_RE = re.compile(r"([A-Z]+)(\d+)")
MEDIA_NAME_RE = re.compile(r"\.(mp3|png|jpg|jpeg)$", re.IGNORECASE)

MEDIA_SOURCE_ALIASES = {
    "audio21.mp3": "audio21.mp3",
    "foto69.png": "патент 2025 янгиланган-69.png",
    "flag4a.jpg": "flag4.jpg",
}

WORKBOOK_MEDIA_FIXUPS = {
    "audio.21mp3": "audio21.mp3",
}


def parse_args() -> argparse.Namespace:
    repo_root = Path(__file__).resolve().parents[1]
    downloads_dir = Path.home() / "Downloads"
    return argparse.ArgumentParser(
        description="Import the patent exam workbook into app data and public assets."
    ).parse_args([])


def column_index(cell_ref: str) -> int:
    match = CELL_REF_RE.fullmatch(cell_ref)
    if not match:
        raise ValueError(f"Invalid cell ref: {cell_ref}")
    letters = match.group(1)
    value = 0
    for char in letters:
        value = value * 26 + (ord(char) - ord("A") + 1)
    return value - 1


def normalize_cell(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        text = value.replace("\xa0", " ").strip()
        if text in {"", "null", "None"}:
            return None
        return text
    return value


def read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for si in root.findall("a:si", NS):
        parts: list[str] = []
        for text_node in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"):
            parts.append(text_node.text or "")
        strings.append("".join(parts))
    return strings


def cell_text(cell: ET.Element, shared_strings: list[str]) -> Any:
    cell_type = cell.attrib.get("t")
    inline = cell.find("a:is", NS)
    value_node = cell.find("a:v", NS)
    if inline is not None:
        parts = [
            node.text or ""
            for node in inline.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
        ]
        return normalize_cell("".join(parts))
    if value_node is None:
        return None
    raw = value_node.text
    if raw is None:
        return None
    if cell_type == "s":
        return normalize_cell(shared_strings[int(raw)])
    return normalize_cell(raw)


def read_sheet_rows(zf: zipfile.ZipFile, sheet_path: str) -> list[list[Any]]:
    shared_strings = read_shared_strings(zf)
    root = ET.fromstring(zf.read(sheet_path))
    sheet_data = root.find("a:sheetData", NS)
    if sheet_data is None:
        return []

    rows: list[list[Any]] = []
    for row in sheet_data.findall("a:row", NS):
        cells = row.findall("a:c", NS)
        if not cells:
            rows.append([])
            continue
        max_index = max(column_index(cell.attrib["r"]) for cell in cells if "r" in cell.attrib)
        values: list[Any] = [None] * (max_index + 1)
        for cell in cells:
            ref = cell.attrib.get("r")
            if not ref:
                continue
            values[column_index(ref)] = cell_text(cell, shared_strings)
        rows.append(values)
    return rows


def workbook_items(xlsx_path: Path) -> list[dict[str, Any]]:
    with zipfile.ZipFile(xlsx_path) as zf:
        rows = read_sheet_rows(zf, "xl/worksheets/sheet1.xml")
    header = [str(value) for value in rows[0]]
    items: list[dict[str, Any]] = []
    for row in rows[1:]:
        if not row or all(value is None for value in row):
            continue
        padded = row + [None] * (len(header) - len(row))
        item = {header[index]: padded[index] for index in range(len(header))}
        items.append(item)
    return items


def load_json_field(value: Any) -> Any:
    if value is None:
        return None
    if not isinstance(value, str):
        return value
    return json.loads(value)


def normalize_media_name(name: str | None) -> str | None:
    if not name:
        return None
    return WORKBOOK_MEDIA_FIXUPS.get(name, name)


def build_file_index(downloads_root: Path) -> dict[str, list[Path]]:
    index: dict[str, list[Path]] = {}
    for path in downloads_root.rglob("*"):
        if not path.is_file():
            continue
        index.setdefault(path.name, []).append(path)
    for paths in index.values():
        paths.sort(key=lambda p: (len(str(p)), str(p)))
    return index


def resolve_media_source(file_index: dict[str, list[Path]], logical_name: str) -> Path:
    exact = file_index.get(logical_name)
    if exact:
        return exact[0]
    alias_name = MEDIA_SOURCE_ALIASES.get(logical_name)
    if alias_name and alias_name in file_index:
        return file_index[alias_name][0]
    raise FileNotFoundError(f"Media source not found for {logical_name}")


def public_media_url(file_name: str) -> str:
    return f"/courses/patent/media/{file_name}"


def parse_audio_question_numbers(source_id: str) -> list[int]:
    _, variant, chunk = source_id.split("_")
    return [int(char) for char in chunk]


def written_answers(answer: str | None) -> list[str]:
    if not answer:
        return []
    return [item.strip() for item in re.split(r"[|/]", answer) if item.strip()]


def normalize_option_media(option: str) -> str:
    return public_media_url(option) if MEDIA_NAME_RE.search(option) else option


def make_block(item: dict[str, Any]) -> tuple[dict[str, Any], set[str]]:
    source_id = str(item["id"])
    _, variant_part, question_part = source_id.split("_")
    variant_number = int(variant_part)
    prompt = item.get("descriptionText")
    media_name = normalize_media_name(item.get("mediaUrl"))
    copied_names: set[str] = set()
    media_url = None
    if media_name:
        media_url = public_media_url(media_name)
        copied_names.add(media_name)

    block: dict[str, Any]
    if item["type"] == "audioDouble":
        sub_questions = load_json_field(item.get("subQuestionsJson")) or []
        question_numbers = parse_audio_question_numbers(source_id)
        if len(sub_questions) != len(question_numbers):
            raise ValueError(
                f"{source_id}: expected {len(question_numbers)} sub-questions, got {len(sub_questions)}"
            )
        block = {
            "blockId": source_id,
            "variantNumber": variant_number,
            "kind": "audio-double",
            "prompt": prompt,
            "mediaUrl": media_url,
            "subQuestions": [
                {
                    "key": f"P_{variant_number}_{number}",
                    "questionNumber": number,
                    "text": question["text"],
                    "options": question["options"],
                    "correctIndex": question["correct"],
                }
                for number, question in zip(question_numbers, sub_questions)
            ],
        }
        return block, copied_names

    question_number = int(question_part)
    if item["answerType"] == "written":
        block = {
            "blockId": source_id,
            "variantNumber": variant_number,
            "kind": "written",
            "questionNumber": question_number,
            "prompt": prompt,
            "mediaUrl": media_url,
            "correctAnswers": written_answers(item.get("Correctanswers")),
        }
        return block, copied_names

    question_payload = load_json_field(item.get("QuestionsJson")) or {}
    options = question_payload.get("options") or []
    normalized_options: list[str] = []
    for option in options:
        if isinstance(option, str) and MEDIA_NAME_RE.search(option):
            copied_names.add(option)
        normalized_options.append(normalize_option_media(option))

    block = {
        "blockId": source_id,
        "variantNumber": variant_number,
        "kind": "image-choice" if item["answerType"] == "imageChoice" else "multiple-choice",
        "questionNumber": question_number,
        "prompt": prompt,
        "mediaUrl": media_url,
        "question": {
            "key": source_id,
            "questionNumber": question_number,
            "text": question_payload.get("text") or "",
            "options": normalized_options,
            "correctIndex": question_payload.get("correct"),
        },
    }
    return block, copied_names


def blocks_sort_key(block: dict[str, Any]) -> int:
    if block["kind"] == "audio-double":
        return int(block["subQuestions"][0]["questionNumber"])
    return int(block["questionNumber"])


def build_variants(items: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], set[str]]:
    by_variant: dict[int, list[dict[str, Any]]] = {}
    all_media_names: set[str] = set()
    for item in items:
        if str(item.get("category")) != "Patent":
            continue
        block, block_media = make_block(item)
        all_media_names.update(block_media)
        by_variant.setdefault(block["variantNumber"], []).append(block)

    variants: list[dict[str, Any]] = []
    for variant_number in sorted(by_variant):
        blocks = sorted(by_variant[variant_number], key=blocks_sort_key)
        total_questions = sum(
            len(block["subQuestions"]) if block["kind"] == "audio-double" else 1 for block in blocks
        )
        variants.append(
            {
                "variantNumber": variant_number,
                "title": f"{variant_number}-variant",
                "totalQuestions": total_questions,
                "blocks": blocks,
            }
        )
    return variants, all_media_names


def ensure_public_assets(file_index: dict[str, list[Path]], media_names: set[str], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for media_name in sorted(media_names):
        source = resolve_media_source(file_index, media_name)
        target = output_dir / media_name
        if target.exists() and target.stat().st_size == source.stat().st_size:
            continue
        shutil.copy2(source, target)


def write_typescript_data(variants: list[dict[str, Any]], target_path: Path) -> None:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(variants, ensure_ascii=False, indent=2)
    content = f"""/* eslint-disable */
// This file is generated by scripts/import_patent_exam.py

export type PatentExamChoiceQuestion = {{
  key: string;
  questionNumber: number;
  text: string;
  options: string[];
  correctIndex: number;
}};

export type PatentExamAudioDoubleBlock = {{
  blockId: string;
  variantNumber: number;
  kind: 'audio-double';
  prompt: string | null;
  mediaUrl: string | null;
  subQuestions: PatentExamChoiceQuestion[];
}};

export type PatentExamMultipleChoiceBlock = {{
  blockId: string;
  variantNumber: number;
  kind: 'multiple-choice' | 'image-choice';
  questionNumber: number;
  prompt: string | null;
  mediaUrl: string | null;
  question: PatentExamChoiceQuestion;
}};

export type PatentExamWrittenBlock = {{
  blockId: string;
  variantNumber: number;
  kind: 'written';
  questionNumber: number;
  prompt: string | null;
  mediaUrl: string | null;
  correctAnswers: string[];
}};

export type PatentExamBlock =
  | PatentExamAudioDoubleBlock
  | PatentExamMultipleChoiceBlock
  | PatentExamWrittenBlock;

export type PatentExamVariant = {{
  variantNumber: number;
  title: string;
  totalQuestions: number;
  blocks: PatentExamBlock[];
}};

export const PATENT_EXAM_VARIANTS: PatentExamVariant[] = {payload} as PatentExamVariant[];
"""
    target_path.write_text(content, encoding="utf-8")


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    downloads_dir = Path.home() / "Downloads"
    xlsx_path = downloads_dir / "patent_questions_new_version.xlsx"
    output_data_path = repo_root / "src" / "data" / "patentExamData.ts"
    public_media_dir = repo_root / "public" / "courses" / "patent" / "media"

    items = workbook_items(xlsx_path)
    variants, media_names = build_variants(items)
    file_index = build_file_index(downloads_dir)
    ensure_public_assets(file_index, media_names, public_media_dir)
    write_typescript_data(variants, output_data_path)

    print(f"Imported {len(variants)} patent variants into {output_data_path}")
    print(f"Copied {len(media_names)} media files into {public_media_dir}")


if __name__ == "__main__":
    main()
