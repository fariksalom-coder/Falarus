#!/usr/bin/env python3
"""Extract Q16 flag/coat images from formatted patent docx into ~/Downloads/."""
from __future__ import annotations

import zipfile
from pathlib import Path

from PIL import Image

DOCX = Path.home() / "Downloads" / "патент 2026 16 вариант — оформлено.docx"
DOWNLOADS = Path.home() / "Downloads"

MAP: dict[int, list[tuple[str, str]]] = {
    12: [
        ("image22.jpeg", "flag12a.jpg"),
        ("image23.jpeg", "flag12b.jpg"),
        ("image24.png", "flag12c.jpg"),
    ],
    13: [
        ("image25.jpeg", "flag13a.jpg"),
        ("image26.png", "flag13b.jpg"),
        ("image27.png", "flag13c.jpg"),
    ],
    14: [
        ("image28.GIF", "flag14a.jpg"),
        ("image29.jpeg", "flag14b.jpg"),
        ("image30.jpeg", "flag14c.jpg"),
    ],
    15: [
        ("image31.jpeg", "flag15a.jpg"),
        ("image32.jpeg", "flag15b.jpg"),
        ("image28.GIF", "flag15c.jpg"),
    ],
    16: [
        ("image33.jpeg", "flag16a.jpg"),
        ("image34.jpeg", "flag16b.jpg"),
        ("image35.GIF", "flag16c.jpg"),
    ],
}


def convert_to_jpg(source_bytes: bytes, target: Path) -> None:
    tmp = target.with_name(f".tmp_{target.name}")
    tmp.write_bytes(source_bytes)
    try:
        with Image.open(tmp) as img:
            img.convert("RGB").save(target, "JPEG", quality=92)
    finally:
        if tmp.exists():
            tmp.unlink()


def main() -> None:
    if not DOCX.exists():
        raise SystemExit(f"DOCX not found: {DOCX}")

    with zipfile.ZipFile(DOCX) as zf:
        for variant, pairs in MAP.items():
            for src, dst in pairs:
                data = zf.read(f"word/media/{src}")
                out = DOWNLOADS / dst
                convert_to_jpg(data, out)
                print(f"V{variant}: {src} → {dst} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
