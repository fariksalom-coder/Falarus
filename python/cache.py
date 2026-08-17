"""
cache.py — AI javob va ovozlarni diskда keshlash.

Maqsad: har darslik uchun tushuntirish va ovoz BIR MARTA hisoblanadi, keyin darrov
beriladi. Shunda foydalanuvchi darslikka kirganда kutmaydi ("qotmaydi") va jonli LLM
yuki bo'lmaydi. Kalit — matn mazmunining xeshi, ya'ni bir xil dars = bir xil kesh.
"""

import hashlib
import os

CACHE_DIR = os.environ.get("AI_CACHE_DIR", os.path.expanduser("~/falarus-ai/cache"))
os.makedirs(CACHE_DIR, exist_ok=True)


def kalit(*qismlar) -> str:
    xom = "|".join(str(q) for q in qismlar)
    return hashlib.sha256(xom.encode("utf-8")).hexdigest()[:20]


def _yol(key: str, ext: str) -> str:
    return os.path.join(CACHE_DIR, f"{key}.{ext}")


def matn_ol(key: str) -> str | None:
    p = _yol(key, "txt")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return f.read()
    return None


def matn_saqla(key: str, matn: str) -> None:
    with open(_yol(key, "txt"), "w", encoding="utf-8") as f:
        f.write(matn)


def audio_ol(key: str):
    """(baytlar, mime) yoki None."""
    for ext, mime in (("mp3", "audio/mpeg"), ("wav", "audio/wav")):
        p = _yol(key, ext)
        if os.path.exists(p):
            with open(p, "rb") as f:
                return f.read(), mime
    return None


def audio_saqla(key: str, data: bytes, mime: str) -> None:
    ext = "mp3" if "mpeg" in mime else "wav"
    with open(_yol(key, ext), "wb") as f:
        f.write(data)
