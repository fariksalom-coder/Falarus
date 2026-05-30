#!/usr/bin/env python3
"""Extract official patent exam answers (bold + checkmark) from formatted docx."""
from __future__ import annotations

import argparse
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
DEFAULT_DOCX = Path.home() / "Downloads" / "патент 2026 16 вариант — оформлено.docx"


def parse_runs(para: ET.Element) -> list[tuple[bool, str]]:
    out: list[tuple[bool, str]] = []
    for run in para.iter(f"{NS}r"):
        rpr = run.find(f"{NS}rPr")
        bold = False
        if rpr is not None:
            b = rpr.find(f"{NS}b")
            if b is not None and b.get(f"{NS}val", "1") not in ("0", "false"):
                bold = True
        text = "".join((t.text or "") for t in run.iter(f"{NS}t"))
        if text:
            out.append((bold, text))
    return out


def para_text(para: ET.Element) -> str:
    return "".join(t for _, t in parse_runs(para))


def is_correct_option(para: ET.Element) -> bool:
    txt = para_text(para)
    if not re.match(r"^\s*[123]\)", txt):
        return False
    has_bold = any(b for b, _ in parse_runs(para))
    return has_bold and "✔" in txt


def option_index(para: ET.Element) -> int | None:
    m = re.match(r"^\s*([123])\)", para_text(para))
    return int(m.group(1)) - 1 if m else None


def extract_answers(docx_path: Path, variant_numbers: list[int]) -> dict[int, dict[int, int | str]]:
    with zipfile.ZipFile(docx_path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    paras = list(root.iter(f"{NS}p"))

    variants: dict[int, int] = {}
    for i, p in enumerate(paras):
        m = re.match(r"^\s*ВАРИАНТ (\d+)\s*•", para_text(p))
        if m:
            variants[int(m.group(1))] = i

    answers: dict[int, dict[int, int | str]] = {}
    for vnum in variant_numbers:
        if vnum not in variants:
            raise KeyError(f"Variant {vnum} heading not found in {docx_path}")
        start = variants[vnum]
        end = variants.get(vnum + 1, len(paras))
        qmap: dict[int, int | str] = {}
        current_q: int | None = None
        for i in range(start, end):
            txt = para_text(paras[i]).strip()
            m = re.match(r"^Задание № (\d+)\.", txt)
            if m:
                current_q = int(m.group(1))
                continue
            if current_q == 7 and txt.startswith("Ответ:") and "✔" in txt:
                word = re.sub(r"^Ответ:\s*", "", txt).replace("✔", "").strip()
                qmap[7] = word
                continue
            if current_q is not None and is_correct_option(paras[i]):
                idx = option_index(paras[i])
                if idx is not None:
                    qmap[current_q] = idx
        answers[vnum] = qmap
    return answers


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract patent answer keys from formatted docx.")
    parser.add_argument("--docx", type=Path, default=DEFAULT_DOCX)
    parser.add_argument("--variants", type=int, nargs="+", default=[12, 13, 14, 15, 16])
    parser.add_argument("--out", type=Path, default=None, help="Optional JSON output path")
    args = parser.parse_args()

    if not args.docx.exists():
        raise SystemExit(f"DOCX not found: {args.docx}")

    answers = extract_answers(args.docx, args.variants)
    payload = {str(k): v for k, v in answers.items()}
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    print(text)

    for vnum in args.variants:
        qmap = answers[vnum]
        missing = [q for q in range(1, 23) if q not in qmap]
        if missing:
            print(f"!! V{vnum} missing answers for: {missing}")

    if args.out:
        args.out.write_text(text + "\n", encoding="utf-8")
        print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
