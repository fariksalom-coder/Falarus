#!/usr/bin/env python3
"""Apply Russian audio transcripts to patent exam audio-double blocks."""
from __future__ import annotations

import json
import re
from pathlib import Path

SCRIPTS_PATH = Path(__file__).resolve().parent / "generated" / "patent_audio_scripts.json"
DATA_PATH = Path(__file__).resolve().parents[1] / "src" / "data" / "patentExamData.ts"


def main() -> None:
    if not SCRIPTS_PATH.exists():
        raise SystemExit(f"Missing scripts JSON. Run: python3 scripts/extract_patent_audio_scripts.py")

    scripts = json.loads(SCRIPTS_PATH.read_text(encoding="utf-8"))
    content = DATA_PATH.read_text(encoding="utf-8")

    if "transcript: string | null;" not in content:
        content = content.replace(
            "  mediaUrl: string | null;\n  subQuestions: PatentExamChoiceQuestion[];",
            "  mediaUrl: string | null;\n  transcript: string | null;\n  subQuestions: PatentExamChoiceQuestion[];",
            1,
        )

    updated = 0
    for variant_number in range(1, 17):
        variant_scripts = scripts[str(variant_number)]
        for chunk, key in (("12", "dialog"), ("34", "announcement")):
            block_id = f"P_{variant_number}_{chunk}"
            transcript = variant_scripts[key]
            transcript_literal = json.dumps(transcript, ensure_ascii=False)
            pattern = re.compile(
                rf'("blockId": "{block_id}"[\s\S]*?"mediaUrl": [^,\n]+),(\n\s+"subQuestions")'
            )

            def repl(match: re.Match[str], literal: str = transcript_literal) -> str:
                return f'{match.group(1)},\n        "transcript": {literal},{match.group(2)}'

            new_content, count = pattern.subn(repl, content, count=1)
            if count != 1:
                raise SystemExit(f"Failed to patch block {block_id}")
            content = new_content
            updated += 1

    DATA_PATH.write_text(content, encoding="utf-8")
    print(f"Updated {updated} audio blocks in {DATA_PATH}")


if __name__ == "__main__":
    main()
